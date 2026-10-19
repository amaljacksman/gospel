import { DateTime } from 'luxon';
import type {
  ContentType,
  PublishingJob,
  QueueJob,
  YearContent,
} from '../../../shared/types/content.js';
import { localDate } from '../../../shared/utils/time.js';
import { r2Key } from '../../../shared/utils/paths.js';
import { audioCredit } from '../../../shared/audio-library.js';
import { enqueueCandidate } from '../../scheduler-worker/src/scheduler.js';

export interface BackfillEnv {
  DB: D1Database;
  CONTENT?: R2Bucket;
  PUBLISH_QUEUE?: Queue<QueueJob>;
  TIMEZONE: string;
  DRY_RUN?: string;
}
const json = (body: unknown, status = 200) => Response.json(body, { status });
const TYPES: ContentType[] = ['story', 'post', 'reel'];
export async function backfill(request: Request, env: BackfillEnv): Promise<Response> {
  let body: { from?: unknown; to?: unknown; types?: unknown; preview?: unknown };
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return json({ error: 'invalid_body' }, 400);
    body = value;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const { from, to, preview = false } = body;
  const validDate = (v: unknown): v is string =>
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    DateTime.fromISO(v, { zone: 'UTC' }).isValid;
  if (!validDate(from) || !validDate(to) || from > to || to > localDate(new Date(), env.TIMEZONE))
    return json(
      {
        error: 'invalid_dates',
        message: 'Use real YYYY-MM-DD dates, from <= to, ending today or earlier.',
      },
      400,
    );
  const start = DateTime.fromISO(from, { zone: 'UTC' });
  const count = DateTime.fromISO(to, { zone: 'UTC' }).diff(start, 'days').days + 1;
  if (count > 3)
    return json(
      {
        error: 'range_too_large',
        message: 'Maximum 3 dates per request. Split larger backfills into separate requests.',
      },
      400,
    );
  if (typeof preview !== 'boolean') return json({ error: 'invalid_preview' }, 400);
  const types = body.types ?? TYPES;
  if (
    !Array.isArray(types) ||
    !types.length ||
    types.some((t) => !TYPES.includes(t)) ||
    new Set(types).size !== types.length
  )
    return json(
      { error: 'invalid_types', message: 'types must contain unique story, post, or reel values.' },
      400,
    );
  if (!env.CONTENT || !env.PUBLISH_QUEUE) return json({ error: 'missing_bindings' }, 503);
  // Load and check the entire requested range before creating any jobs.
  const days = [];
  const documents = new Map<string, YearContent>();
  for (let i = 0; i < count; i++) {
    const date = start.plus({ days: i }).toISODate()!;
    const year = date.slice(0, 4);
    if (!documents.has(year)) {
      const object = await env.CONTENT.get(`content/${year}.json`);
      if (!object) return json({ error: 'missing_content', date }, 404);
      const doc = await object.json<YearContent>();
      if (doc.timezone !== env.TIMEZONE || !Array.isArray(doc.content))
        return json({ error: 'invalid_content', year }, 409);
      documents.set(year, doc);
    }
    const day = documents.get(year)!.content.find((d) => d.date === date);
    if (!day) return json({ error: 'missing_content_date', date }, 404);
    days.push(day);
  }
  const results: Array<Record<string, unknown>> = [];
  const now = new Date().toISOString();
  for (const day of days)
    for (const type of types as ContentType[]) {
      if (!day[type]?.enabled) {
        results.push({ date: day.date, type, status: 'disabled' });
        continue;
      }
      const existing = await env.DB.prepare(
        'SELECT id,status FROM publishing_jobs WHERE content_date=? AND content_type=?',
      )
        .bind(day.date, type)
        .first<Pick<PublishingJob, 'id' | 'status'>>();
      // Failed jobs require explicit /retry, preserving ambiguous provider history.
      if (existing && existing.status !== 'pending') {
        results.push({
          date: day.date,
          type,
          id: existing.id,
          status: 'skipped',
          existingStatus: existing.status,
          ...(['failed', 'permanently_failed'].includes(existing.status)
            ? { retryUrl: `/api/jobs/${existing.id}/retry` }
            : {}),
        });
        continue;
      }
      const key = r2Key(type, day.date);
      if (!(await env.CONTENT.head(key))) {
        results.push({ date: day.date, type, status: 'missing_media', key });
        continue;
      }
      if (preview) {
        results.push({ date: day.date, type, status: 'would_queue' });
        continue;
      }
      try {
        let id: number | undefined;
        const queued = await enqueueCandidate(
          env.DB,
          env.PUBLISH_QUEUE,
          {
            date: day.date,
            type,
            scheduledAt: now,
            r2Key: key,
            caption:
              type === 'post'
                ? `${day.post!.caption}\n\n${day.post!.hashtags.join(' ')}`
                : type === 'reel'
                  ? audioCredit(day.reel!.audio)
                  : null,
          },
          (jobId) => {
            id = jobId;
          },
        );
        results.push({ date: day.date, type, id, status: queued ? 'queued' : 'skipped' });
      } catch {
        results.push({ date: day.date, type, status: 'queue_error' });
      }
    }
  const hasErrors = results.some((r) =>
    ['missing_media', 'queue_error'].includes(String(r.status)),
  );
  return json(
    {
      from,
      to,
      preview,
      dryRun: env.DRY_RUN === 'true',
      queued: results.filter((r) => r.status === 'queued').length,
      results,
    },
    hasErrors ? 207 : 200,
  );
}
