import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import * as hb from 'harfbuzzjs';
import { Resvg } from '@resvg/resvg-js';
import type { DailyContent } from '../../shared/types/content.js';
import { backgroundSvg, selectBackground } from './backgrounds.js';

const fontBytes = readFileSync(new URL('../fonts/NotoSansMalayalam.ttf', import.meta.url));
const blob = new hb.Blob(Uint8Array.from(fontBytes).buffer);
const face = new hb.Face(blob);
const font = new hb.Font(face);
const cache = new Map<
  string,
  {
    glyphs: ReturnType<hb.Buffer['getGlyphInfos']>;
    positions: ReturnType<hb.Buffer['getGlyphPositions']>;
  }
>();
function shape(text: string) {
  const cached = cache.get(text);
  if (cached) return cached;
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(font, buffer);
  const run = { glyphs: buffer.getGlyphInfos(), positions: buffer.getGlyphPositions() };
  if (cache.size > 1000) cache.clear();
  cache.set(text, run);
  return run;
}
function measuredWidth(text: string, size: number): number {
  return (shape(text).positions.reduce((sum, p) => sum + p.xAdvance, 0) * size) / face.upem;
}
export function malayalamLines(text: string, size = 44, maxWidth = 880): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measuredWidth(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
// HarfBuzz's Indic shaper positions Malayalam conjuncts and vowel marks before
// resvg rasterizes paths. This avoids relying on its SVG text shaping support.
function textPaths(text: string, size: number, baseline: number, color: string): string {
  const run = shape(text);
  const scale = size / face.upem;
  let x = (1080 - measuredWidth(text, size)) / 2;
  return run.glyphs
    .map((glyph, i) => {
      const position = run.positions[i]!;
      if (glyph.codepoint === 0) throw new Error(`Missing Malayalam glyph in: ${text}`);
      const path = `<path fill="${color}" transform="translate(${x + position.xOffset * scale} ${baseline - position.yOffset * scale}) scale(${scale} ${-scale})" d="${font.glyphToPath(glyph.codepoint)}"/>`;
      x += position.xAdvance * scale;
      return path;
    })
    .join('');
}
export function renderMalayalam(
  day: DailyContent,
  width: number,
  height: number,
  kind: 'story' | 'post' | 'reel',
): Buffer {
  const logicalHeight = (height * 1080) / width;
  // Malayalam prayer posts keep their devotional copy, while Malayalam Reels
  // publish the selected Bible verse from the categorized verse library.
  const isVerseReel = kind === 'reel';
  const lines = malayalamLines(
    isVerseReel ? day.verse.text : (day.devotional?.text ?? day.verse.text),
  );
  const boxHeight = lines.length * 72 + 160;
  const top = (logicalHeight - boxHeight) / 2;
  const body = lines.map((line, i) => textPaths(line, 44, top + 70 + i * 72, '#ffffff')).join('');
  const label = textPaths(
    isVerseReel ? day.verse.reference : (day.devotional?.label ?? day.verse.reference),
    26,
    top + boxHeight - 35,
    '#f2d9ac',
  );
  const theme = textPaths(day.theme, 28, logicalHeight - 190, '#f2d9ac');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1080 ${logicalHeight}">${backgroundSvg(selectBackground(day.date, kind, day.slot), logicalHeight)}<text x="540" y="180" text-anchor="middle" fill="#f2d9ac" font-size="24" font-family="DejaVu Sans" letter-spacing="5">+ GOSPEL OF JESUS</text><rect x="70" y="${top}" width="940" height="${boxHeight}" rx="30" fill="#081421" opacity=".68"/>${body}${label}${theme}</svg>`;
  return new Resvg(svg, {
    font: {
      fontFiles: [fileURLToPath(new URL('../fonts/DejaVuSans.ttf', import.meta.url))],
      loadSystemFonts: false,
    },
  })
    .render()
    .asPng();
}
