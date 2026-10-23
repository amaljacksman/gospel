import { BACKGROUNDS, backgroundSvg } from './backgrounds.js';
import type { DailyContent } from '../../shared/types/content.js';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
function lines(text: string, max = 34): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    if (`${line} ${w}`.trim().length > max) {
      if (line) out.push(line);
      line = w;
    } else line = `${line} ${w}`.trim();
  }
  if (line) out.push(line);
  return out;
}
export function cardSvg(
  day: DailyContent,
  width: number,
  height: number,
  kind: 'story' | 'post' | 'reel',
): Buffer {
  const logicalHeight = (height / width) * 1080;
  const verse = lines(day.verse.text, kind === 'post' ? 35 : 32);
  const fontSize = Math.min(48, (logicalHeight * 0.44) / (verse.length * 1.4));
  const lineHeight = fontSize * 1.4;
  const start = logicalHeight / 2 - ((verse.length - 1) * lineHeight) / 2;
  const text = verse
    .map(
      (l, i) =>
        `<text x="540" y="${start + i * lineHeight}" fill="#fff" font-size="${fontSize}" font-family="DejaVu Sans" text-anchor="middle">${escape(l)}</text>`,
    )
    .join('');
  const accent = '#f2d9ac';
  const seed = Array.from(`${day.date}:${kind}`).reduce((n, c) => n + c.charCodeAt(0), 0);
  const background = BACKGROUNDS[seed % BACKGROUNDS.length]!;
  const theme = lines(day.theme.toUpperCase(), 38);
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 1080 ${logicalHeight}" xmlns="http://www.w3.org/2000/svg">${backgroundSvg(background, logicalHeight)}<text x="540" y="${kind === 'story' ? 260 : 180}" fill="${accent}" font-size="24" font-family="DejaVu Sans" text-anchor="middle" letter-spacing="5">+  GOSPEL OF JESUS</text><rect x="70" y="${start - fontSize - 36}" width="940" height="${verse.length * lineHeight + 155}" rx="30" fill="#081421" opacity=".68"/>${text}<text x="540" y="${start + verse.length * lineHeight + 40}" fill="${accent}" font-size="30" font-family="DejaVu Sans" text-anchor="middle">${escape(day.verse.reference)}</text><line x1="420" x2="660" y1="${logicalHeight - 250}" y2="${logicalHeight - 250}" stroke="${accent}"/>${theme.map((line, i) => `<text x="540" y="${logicalHeight - 190 + i * 36}" fill="${accent}" font-size="24" font-family="DejaVu Sans" text-anchor="middle" letter-spacing="3">${escape(line)}</text>`).join('')}</svg>`,
  );
}
