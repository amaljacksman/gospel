import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import type { YearContent } from '../shared/types/content.js';
import { renderCard } from '../generator/src/render-card.js';

for (const kind of ['post', 'story', 'reel'] as const) {
  it(`renders visible scripture and heading pixels for ${kind}`, async () => {
    const doc = JSON.parse(await readFile('content/2026.json', 'utf8')) as YearContent;
    const day = doc.content.find((d) => d.date === '2026-10-18')!;
    const height = kind === 'post' ? 1350 : 1920;
    const png = renderCard(day, 1080, height, kind);
    const { data, info } = await sharp(png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let versePixels = 0;
    let headingPixels = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < 1080; x++) {
        const i = (y * 1080 + x) * info.channels;
        if (
          y > height / 3 &&
          y < (height * 2) / 3 &&
          data[i]! > 220 &&
          data[i + 1]! > 220 &&
          data[i + 2]! > 220
        )
          versePixels++;
        if (y > 100 && y < 300 && data[i]! > 150) headingPixels++;
      }
    }
    expect(versePixels).toBeGreaterThan(1000);
    expect(headingPixels).toBeGreaterThan(500);
  });
}
