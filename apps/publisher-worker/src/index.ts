import { BufferInstagramPublisher } from './buffer.js';
import type { QueueJob } from '../../../shared/types/content.js';
import { GraphInstagramPublisher } from './instagram.js';
import { consume, type ConsumerEnv } from './consumer.js';
import { admin } from './admin.js';
interface Env extends ConsumerEnv {
  PUBLISHING_PROVIDER: string;
  BUFFER_API_KEY: string;
  BUFFER_CHANNEL_ID: string;
  INSTAGRAM_ACCESS_TOKEN: string;
  INSTAGRAM_ACCOUNT_ID: string;
  INSTAGRAM_API_VERSION: string;
  ADMIN_API_KEY: string;
  TIMEZONE: string;
  PUBLISH_QUEUE?: Queue<QueueJob>;
}
const make = (e: Env) => {
  if (e.PUBLISHING_PROVIDER === 'buffer')
    return new BufferInstagramPublisher(e.BUFFER_API_KEY, e.BUFFER_CHANNEL_ID);
  if (e.PUBLISHING_PROVIDER && e.PUBLISHING_PROVIDER !== 'meta')
    throw new Error('Unknown publishing provider');
  return new GraphInstagramPublisher(e.INSTAGRAM_ACCOUNT_ID, e.INSTAGRAM_API_VERSION, {
    getToken: async () => e.INSTAGRAM_ACCESS_TOKEN,
  });
};
export default {
  async fetch(request: Request, env: Env) {
    const path = new URL(request.url).pathname;
    if (path === '/health')
      return Response.json({
        status: 'ok',
        service: 'gospel-instagram-publisher',
        provider: env.PUBLISHING_PROVIDER || 'meta',
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
