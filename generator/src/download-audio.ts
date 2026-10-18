import { mkdir, readFile } from 'node:fs/promises';
import { downloadAudioFile, type AudioDownload } from './download-audio-file.js';

const tracks = JSON.parse(await readFile('generator/audio/licenses/tracks.json', 'utf8')) as Record<
  string,
  AudioDownload & { file: string }
>;
await mkdir('generator/audio', { recursive: true });
for (const track of Object.values(tracks)) {
  await downloadAudioFile(track, `generator/audio/${track.file}`);
}
