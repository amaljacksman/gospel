import { readFileSync } from 'node:fs';

// Locally stored AI-generated photographic landscapes; no runtime network requests.
export const BACKGROUNDS = [
  'sunset',
  'morning',
  'garden',
  'clouds',
  'mountains',
  'ocean',
  'forest',
  'lake',
  'meadow',
  'desert',
  'lavender',
  'cherry',
  'waterfall',
  'aurora',
  'starry',
  'moonlight',
  'autumn',
  'winter',
  'tropical',
  'river',
  'valley',
  'rain',
  'mist',
  'coast',
  'wildflowers',
  'twilight',
] as const;
export type Background = (typeof BACKGROUNDS)[number];

// Calendar-day rotation reaches every scene, unlike a sum of date characters.
export function selectBackground(date: string, kind: 'story' | 'post' | 'reel'): Background {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const offset = { story: 0, post: 9, reel: 18 }[kind];
  return BACKGROUNDS[
    (((day + offset) % BACKGROUNDS.length) + BACKGROUNDS.length) % BACKGROUNDS.length
  ]!;
}

const images = new Map<Background, string>();

export function backgroundSvg(style: Background, height: number): string {
  let image = images.get(style);
  if (!image) {
    image = readFileSync(new URL(`../backgrounds/${style}.jpg`, import.meta.url), {
      encoding: 'base64',
    });
    images.set(style, image);
  }
  return `<defs><linearGradient id="photoShade" x2="0" y2="1"><stop stop-color="#07121e" stop-opacity=".48"/><stop offset=".5" stop-color="#07121e" stop-opacity=".18"/><stop offset="1" stop-color="#07121e" stop-opacity=".58"/></linearGradient></defs><image href="data:image/jpeg;base64,${image}" x="0" y="0" width="1080" height="${height}" preserveAspectRatio="xMidYMid slice"/><rect width="1080" height="${height}" fill="url(#photoShade)"/>`;
}
