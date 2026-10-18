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
      out.push(line);
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
  const verse = lines(day.verse.text, kind === 'post' ? 38 : 32);
  const start = height / 2 - (verse.length * 56) / 2;
  const text = verse
    .map(
      (l, i) =>
        `<text x="540" y="${start + i * 60}" fill="#fff" font-size="44" font-family="DejaVu Sans" text-anchor="middle">${escape(l)}</text>`,
    )
    .join('');
  const accent = kind === 'post' ? '#c9aa71' : '#d7bd8a';
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="#080808"/><text x="540" y="${kind === 'story' ? 260 : 180}" fill="${accent}" font-size="24" font-family="DejaVu Sans" text-anchor="middle" letter-spacing="5">+  GOSPEL OF JESUS</text>${text}<text x="540" y="${start + verse.length * 60 + 55}" fill="#ddd" font-size="30" font-family="DejaVu Sans" text-anchor="middle">${escape(day.verse.reference)}</text><line x1="420" x2="660" y1="${height - 230}" y2="${height - 230}" stroke="${accent}"/><text x="540" y="${height - 170}" fill="${accent}" font-size="24" font-family="DejaVu Sans" text-anchor="middle" letter-spacing="5">${escape(day.theme.toUpperCase())}</text></svg>`,
  );
}
