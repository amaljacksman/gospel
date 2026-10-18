import type { PublishingJob, QueueJob } from '../../../shared/types/content.js';
import type { InstagramPublisher } from './instagram.js';
import { InstagramError } from './instagram.js';
import { retryDecision } from '../../../shared/utils/retry.js';
import { log } from '../../../shared/utils/log.js';
export interface ConsumerEnv {
  DB: D1Database;
  PUBLIC_R2_BASE_URL: string;
  DRY_RUN: string;
  MAX_ATTEMPTS: string;
}
export async function consume(
  message: Message<QueueJob>,
  env: ConsumerEnv,
  publisher: InstagramPublisher,
): Promise<void> {
  const job = await env.DB.prepare('SELECT * FROM publishing_jobs WHERE id=?')
    .bind(message.body.jobId)
    .first<PublishingJob>();
  if (!job || job.status === 'published' || job.status === 'permanently_failed') {
    message.ack();
    return;
  }
  const claimed = await env.DB.prepare(
    `UPDATE publishing_jobs SET status='processing',attempt_count=attempt_count+1,updated_at=? WHERE id=? AND (status IN ('queued','failed') OR (status IN ('processing','publishing') AND updated_at<=?)) RETURNING attempt_count`,
  )
    .bind(new Date().toISOString(), job.id, new Date(Date.now() - 5 * 60_000).toISOString())
    .first<{ attempt_count: number }>();
  if (!claimed) {
    message.ack();
    return;
  }
  try {
    if (env.DRY_RUN === 'true') {
      await complete(
        env.DB,
        job.id,
        job.instagram_container_id ?? `dry-container-${job.id}`,
        `dry-media-${job.id}`,
      );
      log({
        jobId: job.id,
        contentDate: job.content_date,
        contentType: job.content_type,
        operation: 'publish',
        status: 'published',
        dryRun: true,
      });
      message.ack();
      return;
    }
    const mediaUrl = `${env.PUBLIC_R2_BASE_URL.replace(/\/$/, '')}/${job.r2_key}`;
    const input = {
      type: job.content_type,
      mediaUrl,
      containerId: job.instagram_container_id,
      ...(job.caption === null ? {} : { caption: job.caption }),
      onContainerCreated: async (containerId: string) => {
        await env.DB.prepare(
          `UPDATE publishing_jobs SET instagram_container_id=?,status='publishing',updated_at=? WHERE id=?`,
        )
          .bind(containerId, new Date().toISOString(), job.id)
          .run();
      },
    };
    const result =
      job.content_type === 'post'
        ? await publisher.publishPost(input)
        : job.content_type === 'reel'
          ? await publisher.publishReel(input)
          : await publisher.publishStory(input);
    await complete(env.DB, job.id, result.containerId, result.mediaId);
    message.ack();
  } catch (e) {
    const status = e instanceof InstagramError ? e.status : undefined;
    const decision = retryDecision(status, claimed.attempt_count, Number(env.MAX_ATTEMPTS || 5));
    await env.DB.prepare(`UPDATE publishing_jobs SET status=?,last_error=?,updated_at=? WHERE id=?`)
      .bind(
        decision.permanent ? 'permanently_failed' : 'failed',
        safeError(e),
        new Date().toISOString(),
        job.id,
      )
      .run();
    if (decision.retry) message.retry({ delaySeconds: decision.delaySeconds });
    else message.ack();
  }
}
async function complete(db: D1Database, id: number, container: string, media: string) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE publishing_jobs SET status='published',instagram_container_id=?,instagram_media_id=?,published_at=?,updated_at=?,last_error=NULL WHERE id=?`,
    )
    .bind(container, media, now, now, id)
    .run();
}
function safeError(e: unknown): string {
  return (e instanceof Error ? e.message : String(e))
    .replace(/access_token=[^&\s]+/gi, 'access_token=[redacted]')
    .slice(0, 1000);
}
