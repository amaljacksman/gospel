import type { QueueJob } from '../../../shared/types/content.js';
import { GraphInstagramPublisher } from './instagram.js';
import { consume, type ConsumerEnv } from './consumer.js';
import { admin } from './admin.js';
interface Env extends ConsumerEnv {
  INSTAGRAM_ACCESS_TOKEN: string;
  INSTAGRAM_ACCOUNT_ID: string;
  INSTAGRAM_API_VERSION: string;
  ADMIN_API_KEY: string;
  TIMEZONE: string;
  PUBLISH_QUEUE?: Queue<QueueJob>;
}
const make = (e: Env) =>
  new GraphInstagramPublisher(e.INSTAGRAM_ACCOUNT_ID, e.INSTAGRAM_API_VERSION, {
    getToken: async () => e.INSTAGRAM_ACCESS_TOKEN,
  });
export default {
  async fetch(request: Request, env: Env) {
    const path = new URL(request.url).pathname;
    if (path === '/health')
      return Response.json({
        status: 'ok',
        service: 'gospel-instagram-publisher',
        dryRun: env.DRY_RUN === 'true',
      });
    if (path.startsWith('/api/')) return admin(request, env);
    return Response.json({ error: 'not_found' }, { status: 404 });
  },
  async queue(batch: MessageBatch<QueueJob>, env: Env) {
    const publisher = make(env);
    await Promise.all(batch.messages.map((message) => consume(message, env, publisher)));
  },
} satisfies ExportedHandler<Env, QueueJob>;
