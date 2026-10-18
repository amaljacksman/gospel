import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { DailyContent } from '../../shared/types/content.js';
import { r2Key } from '../../shared/utils/paths.js';
import { cardSvg } from './svg.js';
export async function generateStory(day: DailyContent): Promise<string> {
  const out = resolve('generated', r2Key('story', day.date));
  await mkdir(dirname(out), { recursive: true });
  await sharp(cardSvg(day, 1080, 1920, 'story'))
    .jpeg({ quality: 92, chromaSubsampling: '4:2:0' })
    .toFile(out);
  return out;
}
