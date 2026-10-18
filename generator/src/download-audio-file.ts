import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, rename, unlink } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
export interface AudioDownload {
  title: string;
  download: string;
  sha256: string;
}
const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export async function downloadAudioFile(track: AudioDownload, path: string): Promise<void> {
  const existing = await readFile(path).catch(() => undefined);
  if (existing && checksum(existing) === track.sha256) {
    console.log(`Verified: ${track.title}`);
    return;
  }
  const partial = `${path}.part`;
  console.log(`Downloading: ${track.title}`);
  try {
    // curl allows a longer connection timeout and retries transport failures as
    // well as HTTP failures. Each transfer stays bounded even during outages.
    await run('curl', [
      '--fail',
      '--location',
      '--silent',
      '--show-error',
      '--connect-timeout',
      '30',
      '--max-time',
      '180',
      '--retry',
      '4',
      '--retry-all-errors',
      '--retry-delay',
      '2',
      '--retry-max-time',
      '600',
      '--output',
      partial,
      track.download,
    ]);
    if (checksum(await readFile(partial)) !== track.sha256)
      throw new Error('checksum mismatch; source file differs from the licensed copy');
    await rename(partial, path);
    console.log(`Downloaded: ${track.title}`);
  } catch (error) {
    throw new Error(
      `Unable to restore "${track.title}": ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await unlink(partial).catch(() => undefined);
  }
}
