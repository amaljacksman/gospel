import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile, access } from 'node:fs/promises';
import { DateTime } from 'luxon';
import type { YearContent } from '../../shared/types/content.js';
import { audioPath } from './audio.js';
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
export async function validateContent(
  value: unknown,
  checkAssets = true,
): Promise<ValidationResult> {
  const schema = JSON.parse(await readFile('content/schema.json', 'utf8')) as object;
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const errors: string[] = [];
  if (!validate(value))
    errors.push(...(validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`));
  if (value && typeof value === 'object' && Array.isArray((value as YearContent).content)) {
    const doc = value as YearContent;
    try {
      if (!DateTime.local().setZone(doc.timezone).isValid)
        errors.push(`/timezone is not a valid IANA timezone`);
    } catch {
      errors.push('/timezone is not a valid IANA timezone');
    }
    const seen = new Set<string>();
    for (const [i, day] of doc.content.entries()) {
      if (seen.has(day.date)) errors.push(`/content/${i}/date duplicates ${day.date}`);
      seen.add(day.date);
      if (day.date.slice(0, 4) !== String(doc.year))
        errors.push(`/content/${i}/date does not belong to ${doc.year}`);
      if (day.post && `${day.post.caption}\n\n${day.post.hashtags.join(' ')}`.length > 2200)
        errors.push(`/content/${i}/post exceeds Instagram caption limit`);
      if (checkAssets && day.reel?.enabled) {
        try {
          await access(audioPath(day.reel.audio));
        } catch {
          errors.push(`/content/${i}/reel/audio missing asset ${day.reel.audio}.mp3`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
