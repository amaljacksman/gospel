import { MEDIA } from '../constants/index.js';
import type { ContentType } from '../types/content.js';
export function r2Key(type: ContentType, date: string): string {
  const m = MEDIA[type];
  return `${m.folder}/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.${m.extension}`;
}
