import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dueCandidates, enqueueCandidate } from '../apps/scheduler-worker/src/scheduler.js';
import { validateContent } from '../generator/src/validate-content.js';
import type { YearContent } from '../shared/types/content.js';

async function calendar() {
  return JSON.parse(await readFile('content/2027.json', 'utf8')) as YearContent;
}
describe('additional publication slots', () => {
  it('schedules ten distinct publications with independent media paths', async () => {
    const doc = await calendar();
    const day = doc.content[0]!;
    const candidates = dueCandidates(day, doc.timezone, new Date('2027-01-01T16:30Z'), 24 * 60);
    expect(candidates).toHaveLength(10);
    expect(new Set(candidates.map((c) => c.r2Key)).size).toBe(10);
    expect(candidates.find((c) => c.slot === 'morning-verse')?.scheduledAt).toBe(
      '2027-01-01T04:30:00.000Z',
    );
    expect(candidates.find((c) => c.slot === 'afternoon-story')?.scheduledAt).toBe(
      '2027-01-01T12:30:00.000Z',
    );
    expect(
      new Set([day.verse.reference, ...day.additional!.map((item) => item.verse.reference)]).size,
    ).toBe(5);
    expect(candidates.find((c) => c.slot === 'afternoon-verse')?.scheduledAt).toBe(
      '2027-01-01T11:00:00.000Z',
    );
    expect(candidates.find((c) => c.slot === 'evening-story')?.r2Key).toBe(
      'stories/2027/01/2027-01-01-evening-story.jpg',
    );
    expect(candidates.find((c) => c.slot === 'malayalam-evening' && c.type === 'reel')?.r2Key).toBe(
      'reels/2027/01/2027-01-01-malayalam-evening.mp4',
    );
    expect(dueCandidates(day, doc.timezone, new Date('2027-01-01T11:01Z'), 5)).toHaveLength(1);
  });
  it('rejects duplicate slots, mismatched dates and unsafe filenames', async () => {
    for (const mutation of ['duplicate', 'date', 'path']) {
      const doc = await calendar();
      const day = doc.content[0]!;
      if (mutation === 'duplicate') day.additional!.push(structuredClone(day.additional![0]!));
      if (mutation === 'date') day.additional![0]!.date = '2027-01-02';
      if (mutation === 'path') day.additional![0]!.slot = '../escape';
      expect((await validateContent(doc, false)).valid).toBe(false);
    }
  });
  it('includes slot identity in both insert and conditional claim', async () => {
    const bind = vi.fn(() => ({ run: async () => ({}), first: async () => ({ id: 1 }) }));
    const db = { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database;
    const queue = { send: vi.fn() } as unknown as Queue<{ jobId: number }>;
    const doc = await calendar();
    const candidate = dueCandidates(
      doc.content[0]!,
      doc.timezone,
      new Date('2027-01-01T11:01Z'),
      5,
    )[0]!;
    await enqueueCandidate(db, queue, candidate);
    expect(bind.mock.calls.every((args) => (args as unknown[]).includes('afternoon-verse'))).toBe(
      true,
    );
  });
});

it('includes exactly two distinct Malayalam prayer posts on every expanded date', async () => {
  for (const year of [2026, 2027, 2028]) {
    const doc = JSON.parse(await readFile(`content/${year}.json`, 'utf8')) as YearContent;
    for (const day of doc.content) {
      const items = (day.additional ?? []).filter((item) => item.language === 'ml');
      expect(items).toHaveLength(day.date >= '2026-11-07' ? 2 : 0);
      if (!items.length) continue;
      expect(items.map((item) => item.post?.publishTime)).toEqual(['08:30', '19:00']);
      expect(new Set(items.map((item) => item.devotional?.text)).size).toBe(2);
      const reels = items.filter((item) => item.reel?.enabled);
      expect(reels).toHaveLength(1);
      expect(reels[0]?.slot).toBe('malayalam-evening');
      expect(reels[0]?.reel?.publishTime).toBe('21:30');
      for (const item of items) {
        expect(item.devotional?.label).toBe('പ്രാർത്ഥന');
        expect(item.post?.caption).toContain(item.devotional!.text);
        expect(item.post?.enabled).toBe(true);
      }
    }
  }
});
