import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { BACKGROUNDS, backgroundSvg, selectBackground } from '../generator/src/backgrounds.js';

it('includes a portrait JPEG and recorded generation prompt for every scene', async () => {
  const manifest = JSON.parse(await readFile('generator/backgrounds/prompts.json', 'utf8')) as {
    images: Array<{ file: string; prompt: string }>;
  };
  expect(new Set(manifest.images.map((image) => image.file))).toEqual(
    new Set(BACKGROUNDS.map((style) => `${style}.jpg`)),
  );
  for (const style of BACKGROUNDS) {
    const metadata = await sharp(`generator/backgrounds/${style}.jpg`).metadata();
    expect([metadata.format, metadata.width, metadata.height]).toEqual(['jpeg', 1080, 1920]);
    expect(manifest.images.find((image) => image.file === `${style}.jpg`)!.prompt).toContain(
      'photorealistic-natural',
    );
  }
});

it('cycles through all 26 scenes in each format, including across a year boundary', () => {
  expect(BACKGROUNDS).toHaveLength(26);
  for (const kind of ['post', 'story', 'reel'] as const) {
    const selected = Array.from({ length: 26 }, (_, i) => {
      const date = new Date(Date.UTC(2026, 11, 20 + i)).toISOString().slice(0, 10);
      return selectBackground(date, kind);
    });
    expect(new Set(selected)).toEqual(new Set(BACKGROUNDS));
  }
  expect(
    new Set(
      ['post', 'story', 'reel'].map((kind) =>
        selectBackground('2026-10-24', kind as 'post' | 'story' | 'reel'),
      ),
    ).size,
  ).toBe(3);
});

it('rasterizes 26 distinct scenes at both supported aspect ratios', () => {
  for (const height of [1350, 1920]) {
    const hashes = BACKGROUNDS.map((style) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="216" height="${height / 5}" viewBox="0 0 1080 ${height}">${backgroundSvg(style, height)}</svg>`;
      const png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
      expect(png.length).toBeGreaterThan(1000);
      return createHash('sha256').update(png).digest('hex');
    });
    expect(new Set(hashes).size).toBe(26);
  }
});
