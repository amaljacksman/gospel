/* global process, console */
import { readFileSync, appendFileSync } from 'node:fs';

const scheduled = ['schedule', 'push'].includes(process.env.GITHUB_EVENT_NAME);
const plan = [];
if (scheduled) {
  const now = new Date(process.env.MEDIA_PLAN_NOW || Date.now());
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  // Generate today plus two days of reserve, including across December 31.
  for (let offset = 0; offset < 3; offset++) {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const value = date.toISOString().slice(0, 10);
    const year = value.slice(0, 4);
    const entry = plan.find((p) => p.year === year);
    if (entry) entry.to = value;
    else plan.push({ year, from: value, to: value });
  }
} else {
  plan.push({
    year: process.env.YEAR || '',
    from: process.env.FROM || '',
    to: process.env.TO || '',
  });
}
for (const { year, from, to } of plan) {
  if (!/^\d{4}$/.test(year)) throw new Error('Invalid content year');
  if (Boolean(from) !== Boolean(to)) throw new Error('Provide both dates or neither');
  for (const date of [from, to].filter(Boolean)) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !date.startsWith(`${year}-`) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new Error('Dates must be real YYYY-MM-DD dates in the selected year');
  }
  if (from > to) throw new Error('First date must not follow last date');
  let doc;
  try {
    doc = JSON.parse(readFileSync(`content/${year}.json`, 'utf8'));
  } catch {
    throw new Error(
      `Missing or unreadable content/${year}.json. Add authored content before automatic generation can continue.`,
    );
  }
  const selected = doc.content.filter((d) => !from || (d.date >= from && d.date <= to));
  if (!selected.length) throw new Error('No content in requested range');
  if (from) {
    const expected = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
    if (new Set(selected.map((d) => d.date)).size !== expected)
      throw new Error(`Content is incomplete for ${from} through ${to}`);
  }
}
const matrix = JSON.stringify({ include: plan });
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${matrix}\n`);
console.log(`Generation plan: ${matrix}`);
