import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { AUDIO_KEYS, type YearContent } from '../shared/types/content.js';
import { AUDIO_LIBRARY, audioCredit } from '../shared/audio-library.js';
import { dueCandidates } from '../apps/scheduler-worker/src/scheduler.js';

describe('licensed audio rotation', () => {
  it('rotates all 20 tracks across enabled reels, including the year boundary', async () => {
    const days = [];
    for (const year of [2026, 2027]) {
      const doc = JSON.parse(await readFile(`content/${year}.json`, 'utf8')) as YearContent;
      days.push(...doc.content.filter((day) => day.reel?.enabled));
    }
    expect(new Set(days.map((day) => day.reel!.audio)).size).toBe(20);
    days.forEach((day, i) => expect(day.reel!.audio).toBe(AUDIO_KEYS[i % 20]));
    expect(Object.keys(AUDIO_LIBRARY)).toEqual([...AUDIO_KEYS]);
  });

  it('includes the selected track attribution in the scheduled Reel caption', async () => {
    const doc = JSON.parse(await readFile('content/2026.json', 'utf8')) as YearContent;
    const day = doc.content[0]!;
    const now = new Date(`${day.date}T${day.reel!.publishTime}:00Z`);
    const reel = dueCandidates(day, 'UTC', now, 1).find((c) => c.type === 'reel');
    expect(reel?.caption).toBe(audioCredit(day.reel!.audio));
    expect(reel?.caption).toContain('Kevin MacLeod');
    expect(reel?.caption).toContain('https://creativecommons.org/licenses/by/4.0/');
    expect(reel?.caption).toContain('Edited:');
  });
});
