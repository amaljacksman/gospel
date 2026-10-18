export const AUDIO_LIBRARY = {
  peaceful_01: {
    title: 'Morning',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_02: {
    title: 'Evening',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_03: {
    title: 'Dreamer',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  hopeful_01: {
    title: 'Infinite Perspective',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  prayer_01: {
    title: 'Meditation Impromptu 01',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  night_01: {
    title: 'Midnight Tale',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_04: {
    title: 'Fresh Air',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_05: {
    title: 'Water Lily',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_06: {
    title: 'Reawakening',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_07: {
    title: 'Clean Soul',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_08: {
    title: 'Dream Culture',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_09: {
    title: 'Immersed',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_10: {
    title: 'Gymnopedie No. 1',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_11: {
    title: 'Gymnopedie No. 2',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_12: {
    title: 'Avec Soin',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_13: {
    title: 'Facile',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_14: {
    title: 'Clear Waters',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_15: {
    title: 'Midsummer Sky',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_16: {
    title: 'Moonstone',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
  peaceful_17: {
    title: 'Eternal Hope',
    source: 'https://incompetech.com/music/royalty-free/music.html',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
} as const;

export function audioCredit(key: keyof typeof AUDIO_LIBRARY): string {
  const track = AUDIO_LIBRARY[key];
  return `Music: "${track.title}" by Kevin MacLeod (incompetech.com)\nSource: ${track.source}\nLicense: CC BY 4.0 (${track.license})\nEdited: excerpt, volume normalization and fades.`;
}
