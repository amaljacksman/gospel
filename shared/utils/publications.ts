import type { DailyContent } from '../types/content.js';
/** Additional entries inherit their parent date; never infer identity from order. */
export function publications(day: DailyContent): DailyContent[] {
  return [day, ...(day.additional ?? []).map((item) => ({ ...item, date: day.date }))];
}
