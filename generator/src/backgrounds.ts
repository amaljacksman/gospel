// Original vector landscapes: no network requests or external image licences.
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

export function backgroundSvg(style: Background, height: number): string {
  const palettes: Record<Background, [string, string, string]> = {
    sunset: ['#29294c', '#bd6267', '#efae79'],
    morning: ['#28596b', '#87b7bb', '#f5d49c'],
    garden: ['#153d3a', '#477665', '#b1b887'],
    clouds: ['#354969', '#829cb7', '#d5bbba'],
    mountains: ['#192e4b', '#647b92', '#cfbca6'],
    ocean: ['#183b58', '#4c8997', '#d9b893'],
    forest: ['#16393c', '#42685b', '#9ba582'],
    lake: ['#27465f', '#769ca9', '#dacba8'],
    meadow: ['#345f70', '#8aaa92', '#d9c789'],
    desert: ['#473e67', '#ba897c', '#dfb47a'],
    lavender: ['#353457', '#8b7aab', '#d3b4bf'],
    cherry: ['#3a475f', '#a38d9f', '#efc5be'],
    waterfall: ['#163743', '#497d83', '#a9c6bd'],
    aurora: ['#101b3c', '#255a64', '#638d83'],
    starry: ['#0b1533', '#29385c', '#806c8a'],
    moonlight: ['#15233e', '#4c6585', '#aab1bb'],
    autumn: ['#3d3a46', '#9e6a50', '#d4a965'],
    winter: ['#243b58', '#8aabba', '#e0ddd2'],
    tropical: ['#214d60', '#66a4a5', '#edc291'],
    river: ['#273c58', '#618b83', '#c5b694'],
    valley: ['#283d54', '#638374', '#c7ba8a'],
    rain: ['#233344', '#607d8d', '#9faeaa'],
    mist: ['#344c5b', '#8ca6a2', '#c5c9b7'],
    coast: ['#254c6a', '#78a9b1', '#d9c497'],
    wildflowers: ['#364b62', '#849c83', '#d3c39b'],
    twilight: ['#25213f', '#6c5d8a', '#cc8f96'],
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
  const hill = (y: number, fill: string, bend = 150) =>
    `<path d="M0 ${y} Q270 ${y - bend} 540 ${y + 30} T1080 ${y - 50} V${height} H0Z" fill="${fill}"/>`;
  const water = (y: number) =>
    `<rect y="${y}" width="1080" height="${height - y}" fill="#4d8191" opacity=".8"/>` +
    Array.from(
      { length: 7 },
      (_, i) =>
        `<path d="M80 ${y + 40 + i * 60} Q420 ${y + 10 + i * 60} 1000 ${y + 40 + i * 60}" fill="none" stroke="#d8e3d4" stroke-width="3" opacity=".25"/>`,
    ).join('');
  const trees = (color: string, snowy = false) =>
    Array.from({ length: 10 }, (_, i) => {
      const x = i * 124 - 10,
        y = height - 90 - (i % 3) * 60;
      return `<path d="M${x} ${y - 360} L${x - 95} ${y - 80} H${x - 60} L${x - 125} ${y + 30} H${x + 125} L${x + 60} ${y - 80} H${x + 95}Z" fill="${color}"/><path d="M${x} ${y} V${height}" stroke="#273e3b" stroke-width="14"/>${snowy ? `<path d="M${x} ${y - 360} L${x - 45} ${y - 225} L${x} ${y - 250} L${x + 45} ${y - 225}Z" fill="#e1e5e2"/>` : ''}`;
    }).join('');
  const stars = Array.from(
    { length: 65 },
    (_, i) =>
      `<circle cx="${(i * 163 + 37) % 1080}" cy="${(i * 97 + 45) % Math.round(height * 0.65)}" r="${(i % 3) + 1}" fill="#fff0d4" opacity="${0.3 + (i % 5) * 0.12}"/>`,
  ).join('');
  const flowers = (colors: string[]) =>
    Array.from({ length: 48 }, (_, i) => {
      const x = (i * 137 + 20) % 1080,
        y = height - 45 - (i % 6) * 43;
      return `<path d="M${x} ${height} L${x + 12} ${y}" stroke="#658568" stroke-width="4"/><circle cx="${x + 12}" cy="${y}" r="${8 + (i % 5)}" fill="${colors[i % colors.length]}"/>`;
    }).join('');
  switch (style) {
    case 'forest':
      scene = hill(horizon + 140, '#345b50') + trees('#25493f');
      break;
    case 'lake':
      scene = hill(horizon - 20, '#466567') + water(horizon + 80);
      break;
    case 'meadow':
      scene = hill(horizon + 40, '#6c9270') + hill(horizon + 230, '#4b7056') + flowers(['#e2d9a6']);
      break;
    case 'desert':
      scene =
        `<circle cx="800" cy="${horizon - 120}" r="85" fill="#edcc9c"/>` +
        hill(horizon + 90, '#bc8b67', 200) +
        hill(horizon + 270, '#94694f', -130);
      break;
    case 'lavender':
      scene = hill(horizon + 100, '#5b6866') + flowers(['#ad91ce', '#8974b5', '#c2a7d7']);
      break;
    case 'cherry':
      scene =
        `<path d="M-50 ${height} Q160 ${horizon + 60} 100 ${horizon - 330} M130 ${horizon - 110} Q300 ${horizon - 300} 520 ${horizon - 230}" stroke="#50444a" stroke-width="36" fill="none"/>` +
        Array.from(
          { length: 40 },
          (_, i) =>
            `<circle cx="${(i * 97) % 600}" cy="${horizon - 370 + ((i * 53) % 340)}" r="${18 + (i % 15)}" fill="#e7b6c0" opacity=".65"/>`,
        ).join('');
      break;
    case 'waterfall':
      scene = `<path d="M0 ${horizon - 70} L370 ${horizon - 160} L400 ${height} H0Z M660 ${horizon - 160} L1080 ${horizon - 70} V${height} H630Z" fill="#365b57"/><path d="M430 ${horizon - 100} Q500 ${horizon + 100} 440 ${height} H650 Q570 ${horizon + 100} 620 ${horizon - 100}Z" fill="#afd1d3" opacity=".8"/>`;
      break;
    case 'aurora':
      scene =
        stars +
        `<path d="M-80 220 Q260 580 540 210 T1160 350" stroke="#75d8b0" stroke-width="90" fill="none" opacity=".2"/><path d="M-80 310 Q260 670 540 300 T1160 440" stroke="#ab91d6" stroke-width="65" fill="none" opacity=".18"/>` +
        hill(height - 220, '#172d3a');
      break;
    case 'starry':
      scene = stars + hill(height - 210, '#19263c');
      break;
    case 'moonlight':
      scene = stars + `<circle cx="790" cy="300" r="85" fill="#e6dfcb"/>` + water(horizon + 150);
      break;
    case 'autumn':
      scene = hill(horizon + 160, '#725c43') + trees('#906744') + flowers(['#d9a156', '#bd6f49']);
      break;
    case 'winter':
      scene = hill(horizon + 100, '#c4d1d0') + trees('#59777c', true);
      break;
    case 'tropical':
      scene =
        water(horizon + 100) +
        hill(height - 80, '#c5ae7f', 30) +
        `<path d="M140 ${height} Q230 ${horizon + 70} 120 ${horizon - 140}" stroke="#3c6257" stroke-width="25" fill="none"/>` +
        Array.from(
          { length: 7 },
          (_, i) =>
            `<path d="M120 ${horizon - 140} Q${-100 + i * 75} ${horizon - 300} ${-180 + i * 100} ${horizon + 20}" stroke="#3c7565" stroke-width="24" fill="none"/>`,
        ).join('');
      break;
    case 'river':
      scene =
        hill(horizon + 50, '#486f5a') +
        `<path d="M540 ${horizon} Q250 ${horizon + 160} 560 ${horizon + 300} T380 ${height} H780 Q970 ${horizon + 300} 640 ${horizon + 150} T580 ${horizon}Z" fill="#79a3ab"/>`;
      break;
    case 'valley':
      scene = `<path d="M0 ${horizon - 240} L520 ${height} H0Z" fill="#3c6558"/><path d="M1080 ${horizon - 300} L430 ${height} H1080Z" fill="#56775d"/>`;
      break;
    case 'rain':
      scene =
        hill(horizon + 140, '#425c62') +
        Array.from({ length: 65 }, (_, i) => {
          const x = (i * 157) % 1080,
            y = (i * 109) % height;
          return `<path d="M${x} ${y} l-25 65" stroke="#b4d0d7" stroke-width="3" opacity=".25"/>`;
        }).join('');
      break;
    case 'mist':
      scene =
        hill(horizon - 20, '#6f8983') +
        hill(horizon + 140, '#536d68') +
        Array.from(
          { length: 5 },
          (_, i) =>
            `<ellipse cx="${i % 2 ? 750 : 260}" cy="${horizon + i * 80}" rx="650" ry="45" fill="#d9e2d9" opacity=".14"/>`,
        ).join('');
      break;
    case 'coast':
      scene =
        water(horizon + 50) +
        `<path d="M0 ${horizon - 40} L260 ${horizon + 30} L380 ${height} H0Z" fill="#6c7868"/><path d="M420 ${height} Q320 ${horizon + 230} 850 ${horizon + 200} T1080 ${horizon + 140} V${height}Z" fill="#c3b18d"/>`;
      break;
    case 'wildflowers':
      scene =
        hill(horizon + 100, '#66816a') + flowers(['#e9c0a5', '#c7abd7', '#e2d49c', '#b6cfdd']);
      break;
    case 'twilight':
      scene =
        stars +
        `<circle cx="830" cy="280" r="65" fill="#e1cfbe"/><circle cx="852" cy="262" r="62" fill="#504366"/>` +
        hill(height - 250, '#333951');
      break;
  }
  return `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset=".6" stop-color="${middle}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#07121e" stop-opacity=".35"/><stop offset=".5" stop-color="#07121e" stop-opacity=".7"/><stop offset="1" stop-color="#07121e" stop-opacity=".65"/></linearGradient></defs><rect width="1080" height="${height}" fill="url(#sky)"/>${clouds}${scene}<rect width="1080" height="${height}" fill="url(#shade)"/>`;
}
