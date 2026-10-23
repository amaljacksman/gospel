// Original vector landscapes: no network requests or external image licences.
export const BACKGROUNDS = ['sunset', 'morning', 'garden', 'clouds', 'mountains', 'ocean'] as const;
export type Background = (typeof BACKGROUNDS)[number];

export function backgroundSvg(style: Background, height: number): string {
  const palettes: Record<Background, [string, string, string]> = {
    sunset: ['#29294c', '#bd6267', '#efae79'],
    morning: ['#28596b', '#87b7bb', '#f5d49c'],
    garden: ['#153d3a', '#477665', '#b1b887'],
    clouds: ['#354969', '#829cb7', '#d5bbba'],
    mountains: ['#192e4b', '#647b92', '#cfbca6'],
    ocean: ['#183b58', '#4c8997', '#d9b893'],
  };
  const [top, middle, bottom] = palettes[style];
  const horizon = height * 0.69;
  const clouds = [
    [140, height * 0.2, 160],
    [850, height * 0.32, 210],
    [420, height * 0.12, 110],
  ]
    .map(
      ([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="35" fill="#fff" opacity=".12"/>`,
    )
    .join('');
  let scene = '';
  if (style === 'sunset' || style === 'morning') {
    scene = `<circle cx="790" cy="${horizon - 100}" r="115" fill="#ffddb0" opacity=".7"/><path d="M0 ${horizon + 130} Q260 ${horizon - 70} 540 ${horizon + 90} T1080 ${horizon + 30} V${height} H0Z" fill="#254651" opacity=".65"/>`;
  } else if (style === 'mountains') {
    scene = `<path d="M0 ${horizon + 140} L280 ${horizon - 240} L510 ${horizon + 65} L790 ${horizon - 170} L1080 ${horizon + 120} V${height} H0Z" fill="#40566a"/><path d="M185 ${horizon - 110} L280 ${horizon - 240} L380 ${horizon - 108} L285 ${horizon - 150}Z" fill="#e5e2db" opacity=".8"/>`;
  } else if (style === 'garden') {
    scene = Array.from({ length: 16 }, (_, i) => {
      const x = i * 74;
      const y = height - 100 - (i % 4) * 62;
      return `<path d="M${x} ${height} Q${x - 45} ${y} ${x + 20} ${y - 170}" fill="none" stroke="#8aa682" stroke-width="7"/><ellipse cx="${x}" cy="${y}" rx="42" ry="15" transform="rotate(-35 ${x} ${y})" fill="#739778"/><circle cx="${x + 20}" cy="${y - 170}" r="15" fill="${i % 2 ? '#e5b6aa' : '#ecd7a7'}"/>`;
    }).join('');
  } else if (style === 'ocean') {
    scene =
      `<rect y="${horizon}" width="1080" height="${height - horizon}" fill="#285b70"/>` +
      Array.from(
        { length: 8 },
        (_, i) =>
          `<path d="M-80 ${horizon + i * 65} Q160 ${horizon - 35 + i * 65} 420 ${horizon + i * 65} T1160 ${horizon + i * 65}" fill="none" stroke="#b6d4cc" stroke-width="3" opacity=".25"/>`,
      ).join('');
  }
  return `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset=".6" stop-color="${middle}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#07121e" stop-opacity=".35"/><stop offset=".5" stop-color="#07121e" stop-opacity=".7"/><stop offset="1" stop-color="#07121e" stop-opacity=".65"/></linearGradient></defs><rect width="1080" height="${height}" fill="url(#sky)"/>${clouds}${scene}<rect width="1080" height="${height}" fill="url(#shade)"/>`;
}
