import { expect, it, vi } from 'vitest';
import { admin } from '../apps/publisher-worker/src/admin.js';
import type { BackfillEnv } from '../apps/publisher-worker/src/backfill.js';
const day = {
  date: '2026-10-18',
  theme: 'Hope',
  verse: { text: 'Trust in the Lord.', reference: 'Proverbs 3:5' },
  post: {
    enabled: true,
    publishTime: '13:00',
    template: 'minimal-verse',
    caption: 'Trust',
    hashtags: ['#hope'],
  },
};
function fixture(existing?: { id: number; status: string }, media = true) {
  const prepare = vi.fn((sql: string) => ({
    bind: vi.fn(() => ({
      first: vi.fn(async () => (sql.startsWith('SELECT') ? (existing ?? null) : { id: 7 })),
      run: vi.fn(async () => ({})),
    })),
  }));
  const env = {
    DB: { prepare },
    CONTENT: {
      get: vi.fn(async () => ({
        json: async () => ({ timezone: 'Asia/Kolkata', content: [day] }),
      })),
      head: vi.fn(async () => (media ? {} : null)),
    },
    PUBLISH_QUEUE: { send: vi.fn(async () => {}) },
    ADMIN_API_KEY: 'key',
    TIMEZONE: 'Asia/Kolkata',
    DRY_RUN: 'false',
  } as unknown as BackfillEnv & { ADMIN_API_KEY: string };
  return { env, prepare };
}
const request = (body: object, key = 'key') =>
  new Request('https://example.com/api/jobs/backfill', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const range = { from: '2026-10-18', to: '2026-10-18', types: ['post'] };
it('requires the admin key before accessing any storage', async () => {
  const { env, prepare } = fixture();
  expect((await admin(request(range, 'wrong'), env)).status).toBe(401);
  expect(prepare).not.toHaveBeenCalled();
});
it('queues missing media once with the original caption and reports the job ID', async () => {
  const { env, prepare } = fixture();
  const r = await admin(request(range), env);
  const data = (await r.json()) as { queued: number; results: Array<{ id: number }> };
  expect(data.queued).toBe(1);
  expect(data.results[0]!.id).toBe(7);
  expect(env.PUBLISH_QUEUE!.send).toHaveBeenCalledWith({ jobId: 7 });
  const insert = prepare.mock.results.find((_, i) =>
    prepare.mock.calls[i]![0].startsWith('INSERT'),
  )!;
  expect(insert.value.bind.mock.calls[0]).toContain('Trust\n\n#hope');
});
it('preview checks availability without database writes or sending messages', async () => {
  const { env, prepare } = fixture();
  const r = await admin(request({ ...range, preview: true }), env);
  const d = (await r.json()) as { results: Array<{ status: string }> };
  expect(d.results[0]!.status).toBe('would_queue');
  expect(prepare.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
  expect(env.PUBLISH_QUEUE!.send).not.toHaveBeenCalled();
});
for (const status of ['published', 'queued', 'publishing', 'failed', 'permanently_failed'])
  it(`skips existing ${status} jobs without resubmission`, async () => {
    const { env } = fixture({ id: 3, status });
    const r = await admin(request(range), env);
    const d = (await r.json()) as { results: Array<{ status: string; existingStatus: string }> };
    expect(d.results[0]).toMatchObject({ status: 'skipped', existingStatus: status });
    expect(env.PUBLISH_QUEUE!.send).not.toHaveBeenCalled();
  });
it('reports missing media and sends nothing for that item', async () => {
  const { env } = fixture(undefined, false);
  const r = await admin(request(range), env);
  expect(r.status).toBe(207);
  expect(env.PUBLISH_QUEUE!.send).not.toHaveBeenCalled();
});
it('rejects an invalid or excessive date range', async () => {
  const { env } = fixture();
  expect((await admin(request({ ...range, to: '2026-10-25' }), env)).status).toBe(400);
  expect((await admin(request({ ...range, from: '2026-02-30' }), env)).status).toBe(400);
});
it('rejects invalid content types and preview values', async () => {
  const { env } = fixture();
  expect((await admin(request({ ...range, types: ['delete'] }), env)).status).toBe(400);
  expect((await admin(request({ ...range, preview: 'yes' }), env)).status).toBe(400);
});
it('checks all requested content dates before sending any messages', async () => {
  const { env } = fixture();
  const r = await admin(request({ ...range, to: '2026-10-19' }), env);
  expect(r.status).toBe(404);
  expect(env.PUBLISH_QUEUE!.send).not.toHaveBeenCalled();
});
