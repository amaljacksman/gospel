import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';

interface Track {
  file: string;
  title: string;
  download: string;
  sha256: string;
}
const tracks = JSON.parse(await readFile('generator/audio/licenses/tracks.json', 'utf8')) as Record<
  string,
  Track
>;
await mkdir('generator/audio', { recursive: true });
for (const track of Object.values(tracks)) {
  const path = `generator/audio/${track.file}`;
  const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
  const existing = await readFile(path).catch(() => undefined);
  if (existing && checksum(existing) === track.sha256) {
    console.log(`Verified: ${track.title}`);
    continue;
  }
  const response = await fetch(track.download, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`${track.title}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (checksum(bytes) !== track.sha256) throw new Error(`${track.title}: checksum mismatch`);
  await writeFile(`${path}.part`, bytes);
  await rename(`${path}.part`, path);
  console.log(`Downloaded: ${track.title}`);
}
