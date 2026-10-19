import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import type { DailyContent } from '../../shared/types/content.js';
import { cardSvg } from './svg.js';

const fontFile = fileURLToPath(new URL('../fonts/DejaVuSans.ttf', import.meta.url));

// Supply the exact font instead of relying on the host's SVG text support or
// font discovery. Sharp still handles JPEG encoding after SVG rasterization.
export function renderCard(
  day: DailyContent,
  width: number,
  height: number,
  kind: 'story' | 'post' | 'reel',
): Buffer {
  return new Resvg(cardSvg(day, width, height, kind), {
    font: {
      fontFiles: [fontFile],
      loadSystemFonts: false,
      defaultFontFamily: 'DejaVu Sans',
    },
  })
    .render()
    .asPng();
}
