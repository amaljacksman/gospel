import { readFile, writeFile, readdir } from 'node:fs/promises';
import { AUDIO_KEYS, type YearContent } from '../../shared/types/content.js';

// Assign once in chronological order; rendering keeps the JSON's explicit choice.
const files = (await readdir('content')).filter((f) => /^\d{4}\.json$/.test(f)).sort();
let index = 0;
for (const file of files) {
  const path = `content/${file}`;
  const original = await readFile(path, 'utf8');
  const doc = JSON.parse(original) as YearContent;
  const keysByDate = new Map<string, (typeof AUDIO_KEYS)[number]>();
  for (const day of [...doc.content].sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.reel?.enabled) keysByDate.set(day.date, AUDIO_KEYS[index++ % AUDIO_KEYS.length]!);
  }
  // Replace only audio values, preserving scripture and all existing formatting.
  const updated = original.replace(
    /"date":\s*"([^"]+)"[\s\S]*?(?=(?:"date":\s*")|$)/g,
    (block, date: string) => {
      const key = keysByDate.get(date);
      return key
        ? block.replace(/("audio":\s*")[^"]+/, (_match, prefix: string) => `${prefix}${key}`)
        : block;
    },
  );
  // Parse before writing so a malformed replacement cannot overwrite the source.
  JSON.parse(updated);
  await writeFile(path, updated);
}
console.log(`Assigned ${AUDIO_KEYS.length} tracks across ${index} enabled reels.`);
