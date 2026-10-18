import { resolve } from 'node:path';
import { AUDIO_KEYS } from '../../shared/types/content.js';
type AudioKey = (typeof AUDIO_KEYS)[number];
export const AUDIO = Object.fromEntries(
  AUDIO_KEYS.map((key) => [key, { file: `${key}.mp3`, volume: 0.15 }]),
) as Record<AudioKey, { file: string; volume: number }>;
export function audioPath(key: AudioKey): string {
  return resolve('generator/audio', AUDIO[key].file);
}
