import type { DailyContent, YearContent } from '../../shared/types/content.js';
import { generateStory } from './generate-story.js';
import { generatePost } from './generate-post.js';
import { generateReel } from './generate-reel.js';
export interface Totals {
  stories: number;
  posts: number;
  reels: number;
  errors: number;
}
export async function generateDays(doc: YearContent, days: DailyContent[]): Promise<Totals> {
  const totals: Totals = { stories: 0, posts: 0, reels: 0, errors: 0 };
  for (const [i, day] of days.entries()) {
    for (const type of ['story', 'post', 'reel'] as const) {
      if (!day[type]?.enabled) continue;
      try {
        if (type === 'story') await generateStory(day);
        if (type === 'post') await generatePost(day);
        if (type === 'reel') await generateReel(day);
        totals[`${type}s` as 'stories' | 'posts' | 'reels']++;
        console.log(`[${String(i + 1).padStart(3, '0')}/${days.length}] ${type} generated`);
      } catch (e) {
        totals.errors++;
        console.error(`${day.date} ${type}:`, e);
      }
    }
  }
  return totals;
}
