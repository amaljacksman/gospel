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

const PUBLICATION_ORDER = [
  'story',
  'post',
  'reel',
  'morning-verse:post',
  'afternoon-verse:post',
  'afternoon-story:story',
  'malayalam-morning:post',
  'malayalam-evening:post',
  'malayalam-evening:reel',
  'evening-story:story',
] as const;
const PUBLICATION_OFFSETS = [0, 9, 18, 1, 2, 3, 4, 5, 7, 6] as const;

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function publicationRank(slot: string | undefined, kind: 'story' | 'post' | 'reel'): number {
  const identity = slot ? `${slot}:${kind}` : kind;
  const known = PUBLICATION_ORDER.indexOf(identity as (typeof PUBLICATION_ORDER)[number]);
  if (known >= 0) return known;
  return (
    PUBLICATION_ORDER.length + (hash(identity) % (BACKGROUNDS.length - PUBLICATION_ORDER.length))
  );
}

// Keep the original format rotation stable while assigning extra slots distinct
// deterministic offsets on the same date. Rerunning a date produces the same image.
export function selectBackground(
  date: string,
  kind: 'story' | 'post' | 'reel',
  slot?: string,
): Background {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const rank = publicationRank(slot, kind);
  const offset =
    PUBLICATION_OFFSETS[rank] ??
    PUBLICATION_ORDER.length + (hash(`${date}:${slot ?? ''}:${kind}`) % 17);
  const index = (((day + offset) % BACKGROUNDS.length) + BACKGROUNDS.length) % BACKGROUNDS.length;
  return BACKGROUNDS[index]!;
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
