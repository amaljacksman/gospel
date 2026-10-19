import { audioCredit } from '../../../shared/audio-library.js';
import type { DailyContent, ContentType, QueueJob } from '../../../shared/types/content.js';
import { r2Key } from '../../../shared/utils/paths.js';
import { isDue, scheduledInstant } from '../../../shared/utils/time.js';
export interface Candidate {
  date: string;
  type: ContentType;
  scheduledAt: string;
  r2Key: string;
  caption: string | null;
}
export function dueCandidates(
  day: DailyContent,
  timezone: string,
  now: Date,
  grace: number,
): Candidate[] {
  return (['story', 'post', 'reel'] as const).flatMap((type) => {
    const item = day[type];
    if (!item?.enabled) return [];
    const at = scheduledInstant(day.date, item.publishTime, timezone);
    return isDue(at, now, grace)
      ? [
          {
            date: day.date,
            type,
            scheduledAt: at.toISOString(),
            r2Key: r2Key(type, day.date),
            caption:
              type === 'post'
                ? `${day.post!.caption}\n\n${day.post!.hashtags.join(' ')}`
                : type === 'reel'
                  ? audioCredit(day.reel!.audio)
                  : null,
          },
        ]
      : [];
  });
}
export async function enqueueCandidate(
  db: D1Database,
  queue: Queue<QueueJob>,
  c: Candidate,
  onQueued?: (id: number) => void,
): Promise<boolean> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO publishing_jobs(content_date,content_type,scheduled_at,status,r2_key,caption,created_at,updated_at) VALUES(?,?,?,'pending',?,?,?,?) ON CONFLICT(content_date,content_type) DO NOTHING`,
    )
    .bind(c.date, c.type, c.scheduledAt, c.r2Key, c.caption, now, now)
    .run();
  const row = await db
    .prepare(
      `UPDATE publishing_jobs SET status='queued',updated_at=? WHERE content_date=? AND content_type=? AND status IN ('pending','failed') RETURNING id`,
    )
    .bind(now, c.date, c.type)
    .first<{ id: number }>();
  if (!row) return false;
  try {
    await queue.send({ jobId: row.id });
    onQueued?.(row.id);
    return true;
  } catch (e) {
    await db
      .prepare(
        `UPDATE publishing_jobs SET status='pending',last_error=?,updated_at=? WHERE id=? AND status='queued'`,
      )
      .bind(e instanceof Error ? e.message : 'queue error', now, row.id)
      .run();
    throw e;
  }
}
