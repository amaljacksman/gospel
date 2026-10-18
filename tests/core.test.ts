import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateContent } from '../generator/src/validate-content.js';
import { scheduledInstant, isDue, localDate, localDatesInWindow } from '../shared/utils/time.js';
import { r2Key } from '../shared/utils/paths.js';
import { retryDecision } from '../shared/utils/retry.js';
import { dueCandidates, enqueueCandidate } from '../apps/scheduler-worker/src/scheduler.js';
import {
  parseGraphError,
  GraphInstagramPublisher,
} from '../apps/publisher-worker/src/instagram.js';
import type { DailyContent } from '../shared/types/content.js';
const day: DailyContent = {
  date: '2027-01-01',
  theme: 'Test',
  verse: { reference: 'John 3:16', text: 'For God so loved the world.' },
  story: {
    enabled: true,
    template: 'minimal-cross',
    headline: 'Love',
    footer: 'Gospel of Jesus',
    publishTime: '07:00',
  },
};
describe('content', () => {
  it('parses and validates complete yearly JSON while collecting errors', async () => {
    const content2026 = JSON.parse(await readFile('content/2026.json', 'utf8')) as {
      content: Array<{ date: string }>;
    };
    const content2027 = JSON.parse(await readFile('content/2027.json', 'utf8')) as {
      content: Array<{ date: string }>;
    };
    expect((await validateContent(content2026, false)).valid).toBe(true);
    expect((await validateContent(content2027, false)).valid).toBe(true);
    expect(content2026.content).toHaveLength(108);
    expect(content2026.content[0]?.date).toBe('2026-09-15');
    expect(content2026.content.at(-1)?.date).toBe('2026-12-31');
    expect(content2027.content).toHaveLength(365);
    expect(content2027.content[0]?.date).toBe('2027-01-01');
    expect(content2027.content.at(-1)?.date).toBe('2027-12-31');
    const bad = { year: 2027, timezone: 'Bad/Zone', content: [day, day] };
    const result = await validateContent(bad, false);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
describe('time and scheduling', () => {
  it('uses timezone rules including DST', () => {
    expect(scheduledInstant('2027-01-01', '07:00', 'Asia/Kolkata').toISOString()).toBe(
      '2027-01-01T01:30:00.000Z',
    );
    expect(scheduledInstant('2027-07-01', '07:00', 'America/New_York').toISOString()).toBe(
      '2027-07-01T11:00:00.000Z',
    );
    expect(localDate(new Date('2026-12-31T20:00:00Z'), 'Asia/Kolkata')).toBe('2027-01-01');
    expect(localDatesInWindow(new Date('2027-01-01T00:05:00Z'), 'UTC', 30)).toEqual([
      '2026-12-31',
      '2027-01-01',
    ]);
  });
  it('handles grace window', () => {
    const at = new Date('2027-01-01T01:30Z');
    expect(isDue(at, new Date('2027-01-01T01:35Z'), 30)).toBe(true);
    expect(isDue(at, new Date('2027-01-01T02:01Z'), 30)).toBe(false);
    expect(dueCandidates(day, 'Asia/Kolkata', new Date('2027-01-01T01:35Z'), 20)).toHaveLength(1);
  });
});
describe('keys and retry', () => {
  it('builds deterministic keys', () =>
    expect(r2Key('post', '2027-05-15')).toBe('posts/2027/05/2027-05-15.jpg'));
  it('classifies errors', () => {
    expect(retryDecision(429, 1, 5).retry).toBe(true);
    expect(retryDecision(400, 1, 5).permanent).toBe(true);
    expect(retryDecision(503, 5, 5).permanent).toBe(true);
  });
});
describe('idempotency', () => {
  it('queues only a conditionally claimed job', async () => {
    const first = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValueOnce({ id: 4 }).mockResolvedValueOnce(null);
    const db = {
      prepare: vi.fn(() => ({ bind: vi.fn(() => ({ run: first, first: update })) })),
    } as unknown as D1Database;
    const queue = { send: vi.fn() } as unknown as Queue<{ jobId: number }>;
    const c = {
      date: '2027-01-01',
      type: 'story' as const,
      scheduledAt: 'x',
      r2Key: 'x',
      caption: null,
    };
    expect(await enqueueCandidate(db, queue, c)).toBe(true);
    expect(await enqueueCandidate(db, queue, c)).toBe(false);
    expect(queue.send).toHaveBeenCalledTimes(1);
  });
});
describe('Instagram', () => {
  it('parses graph errors', () =>
    expect(parseGraphError({ error: { message: 'bad', code: 100 } })).toEqual({
      message: 'bad',
      code: 100,
    }));
  it('creates, polls, and publishes a mocked image', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'container' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'media' }), { status: 200 }));
    const api = new GraphInstagramPublisher(
      'account',
      'v24.0',
      { getToken: async () => 'secret' },
      fetcher,
    );
    expect(await api.publishPost({ type: 'post', mediaUrl: 'https://example.com/a.jpg' })).toEqual({
      containerId: 'container',
      mediaId: 'media',
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('sends generated Stories as images', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'container' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'media' }), { status: 200 }));
    const api = new GraphInstagramPublisher(
      'account',
      'v24.0',
      { getToken: async () => 'secret' },
      fetcher,
    );
    await api.publishStory({ type: 'story', mediaUrl: 'https://example.com/story.jpg' });
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain('image_url=');
    expect(String(request.body)).toContain('media_type=STORIES');
    expect(String(request.body)).not.toContain('video_url=');
  });
});
