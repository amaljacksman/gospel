import { DateTime } from 'luxon';
import { loadYear, findDay } from './content.js';
import { validateContent } from './validate-content.js';
import { readFile } from 'node:fs/promises';
import { generateDays } from './generate-year.js';
import { generateStory } from './generate-story.js';
import { generatePost } from './generate-post.js';
import { generateReel } from './generate-reel.js';
import { uploadYear } from './upload-r2.js';
const [command, ...args] = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const date = flag('date');
const year = Number(flag('year') ?? date?.slice(0, 4) ?? new Date().getUTCFullYear());
async function main() {
  if (command === 'validate') {
    const value: unknown = JSON.parse(await readFile(`content/${year}.json`, 'utf8'));
    const r = await validateContent(value);
    if (!r.valid) {
      console.error(r.errors.join('\n'));
      process.exitCode = 1;
    } else console.log(`content/${year}.json is valid`);
    return;
  }
  if (command === 'upload') {
    console.log(`Uploaded ${await uploadYear(year)} files`);
    return;
  }
  const doc = await loadYear(year);
  if (command === 'generate:story' || command === 'generate:post' || command === 'generate:reel') {
    if (!date) throw new Error('--date is required');
    const day = findDay(doc, date);
    const fn =
      command === 'generate:story'
        ? generateStory
        : command === 'generate:post'
          ? generatePost
          : generateReel;
    console.log(await fn(day));
    return;
  }
  let days = doc.content;
  if (command === 'generate:date') {
    if (!date) throw new Error('--date is required');
    days = [findDay(doc, date)];
  } else if (command === 'generate:range') {
    const from = flag('from'),
      to = flag('to');
    if (!from || !to || !DateTime.fromISO(from).isValid || !DateTime.fromISO(to).isValid)
      throw new Error('--from and --to are required ISO dates');
    days = days.filter((d) => d.date >= from && d.date <= to);
  } else if (command !== 'generate:year') throw new Error(`Unknown command ${command}`);
  const t = await generateDays(doc, days);
  console.log(
    `Stories generated: ${t.stories}\nPosts generated: ${t.posts}\nReels generated: ${t.reels}\nErrors: ${t.errors}`,
  );
  if (t.errors) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
