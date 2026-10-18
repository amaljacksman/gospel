import type { QueueJob } from '../../../shared/types/content.js';
import { localDate } from '../../../shared/utils/time.js';
interface Env {
  DB: D1Database;
  PUBLISH_QUEUE?: Queue<QueueJob>;
  ADMIN_API_KEY: string;
  TIMEZONE: string;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const auth = (r: Request, e: Env) =>
  !!e.ADMIN_API_KEY && r.headers.get('authorization') === `Bearer ${e.ADMIN_API_KEY}`;
export async function admin(request: Request, env: Env): Promise<Response> {
  if (!auth(request, env)) return json({ error: 'unauthorized' }, 401);
  const u = new URL(request.url);
  if (request.method === 'GET' && u.pathname === '/api/jobs/today')
    return json(
      await env.DB.prepare(
        `SELECT * FROM publishing_jobs WHERE content_date=? ORDER BY scheduled_at`,
      )
        .bind(localDate(new Date(), env.TIMEZONE))
        .all(),
    );
  if (request.method === 'GET' && u.pathname === '/api/jobs/failed')
    return json(
      await env.DB.prepare(
        `SELECT * FROM publishing_jobs WHERE status IN ('failed','permanently_failed') ORDER BY updated_at DESC LIMIT 100`,
      ).all(),
    );
  const m = u.pathname.match(/^\/api\/jobs\/(\d+)(\/retry)?$/);
  if (!m) return json({ error: 'not_found' }, 404);
  const id = Number(m[1]);
  if (request.method === 'GET' && !m[2]) {
    const row = await env.DB.prepare('SELECT * FROM publishing_jobs WHERE id=?').bind(id).first();
    return row ? json(row) : json({ error: 'not_found' }, 404);
  }
  if (request.method === 'POST' && m[2]) {
    const row = await env.DB.prepare(
      `UPDATE publishing_jobs SET status='queued',last_error=NULL,updated_at=? WHERE id=? AND status IN ('failed','permanently_failed') RETURNING id`,
    )
      .bind(new Date().toISOString(), id)
      .first<{ id: number }>();
    if (!row) return json({ error: 'job_not_retryable' }, 409);
    if (!env.PUBLISH_QUEUE) {
      await restoreFailed(env.DB, id, 'Queue binding missing');
      return json({ error: 'queue_binding_missing' }, 503);
    }
    try {
      await env.PUBLISH_QUEUE.send({ jobId: id });
    } catch (error) {
      await restoreFailed(env.DB, id, error instanceof Error ? error.message : 'Queue send failed');
      return json({ error: 'queue_send_failed' }, 503);
    }
    return json({ status: 'queued', id });
  }
  return json({ error: 'method_not_allowed' }, 405);
}

async function restoreFailed(db: D1Database, id: number, error: string): Promise<void> {
  await db
    .prepare(`UPDATE publishing_jobs SET status='failed',last_error=?,updated_at=? WHERE id=?`)
    .bind(error.slice(0, 1000), new Date().toISOString(), id)
    .run();
}
