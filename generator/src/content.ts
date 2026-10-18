import { readFile } from 'node:fs/promises';
import type { YearContent, DailyContent } from '../../shared/types/content.js';
import { validateContent } from './validate-content.js';
export async function loadYear(year: number): Promise<YearContent> {
  const path = `content/${year}.json`;
  const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
  const result = await validateContent(raw);
  if (!result.valid) throw new Error(`Invalid ${path}:\n${result.errors.join('\n')}`);
  return raw as YearContent;
}
export function findDay(doc: YearContent, date: string): DailyContent {
  const day = doc.content.find((x) => x.date === date);
  if (!day) throw new Error(`No content for ${date}`);
  return day;
}
