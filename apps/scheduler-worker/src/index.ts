import type { YearContent, QueueJob } from '../../../shared/types/content.js';
import { localDatesInWindow } from '../../../shared/utils/time.js';
import { dueCandidates, enqueueCandidate } from './scheduler.js';
import { log } from '../../../shared/utils/log.js';
interface Env {
  DB: D1Database;
  CONTENT: R2Bucket;
  PUBLISH_QUEUE: Queue<QueueJob>;
  TIMEZONE: string;
  GRACE_WINDOW_MINUTES: string;
  DRY_RUN: string;
}
export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const now = new Date(controller.scheduledTime);
    const grace = Number(env.GRACE_WINDOW_MINUTES || 30);
    const dates = new Set(localDatesInWindow(now, env.TIMEZONE, grace));
    const years = new Set([...dates].map((date) => date.slice(0, 4)));
    for (const year of years) {
      const obj = await env.CONTENT.get(`content/${year}.json`);
      if (!obj) {
        log({ operation: 'schedule', year, status: 'missing_content' });
        continue;
      }
      const doc = await obj.json<YearContent>();
      if (doc.timezone !== env.TIMEZONE) {
        throw new Error(`Timezone mismatch in content/${year}.json`);
      }
      for (const day of doc.content.filter((entry) => dates.has(entry.date))) {
        for (const c of dueCandidates(day, doc.timezone, now, grace)) {
          if (!(await env.CONTENT.head(c.r2Key))) {
            log({
              operation: 'schedule',
              contentDate: c.date,
              contentType: c.type,
              status: 'missing_media',
              r2Key: c.r2Key,
            });
            continue;
          }
          const queued = await enqueueCandidate(env.DB, env.PUBLISH_QUEUE, c);
          log({
            operation: 'schedule',
            contentDate: c.date,
            contentType: c.type,
            status: queued ? 'queued' : 'skipped',
            dryRun: env.DRY_RUN === 'true',
          });
        }
      }
    }
  },
} satisfies ExportedHandler<Env>;
