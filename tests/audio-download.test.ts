import { createHash } from 'node:crypto';
import { createServer, type RequestListener } from 'node:http';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { downloadAudioFile } from '../generator/src/download-audio-file.js';

const bytes = Buffer.from('test audio payload');
const track = {
  title: 'Test track',
  download: '',
  sha256: createHash('sha256').update(bytes).digest('hex'),
};
const cleanup: Array<() => Promise<unknown>> = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});
async function destination() {
  const dir = await mkdtemp(join(tmpdir(), 'gospel-audio-test-'));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  return join(dir, 'track.mp3');
}
async function endpoint(handler: RequestListener) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  );
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return `http://127.0.0.1:${address.port}/track.mp3`;
}
it('uses a verified local track without contacting an unavailable source', async () => {
  const path = await destination();
  await writeFile(path, bytes);
  await downloadAudioFile({ ...track, download: 'http://127.0.0.1:1/unavailable' }, path);
  expect(await readFile(path)).toEqual(bytes);
});
it('retries a temporary server failure and saves the verified download', async () => {
  const path = await destination();
  let requests = 0;
  const download = await endpoint((_req, res) => {
    requests++;
    res.writeHead(requests === 1 ? 503 : 200);
    res.end(requests === 1 ? 'temporarily unavailable' : bytes);
  });
  await downloadAudioFile({ ...track, download }, path);
  expect(requests).toBe(2);
  expect(await readFile(path)).toEqual(bytes);
  await expect(access(`${path}.part`)).rejects.toThrow();
}, 10_000);
it('rejects changed source bytes and preserves the existing file', async () => {
  const path = await destination();
  await writeFile(path, 'old invalid file');
  const download = await endpoint((_req, res) => res.end('different payload'));
  await expect(downloadAudioFile({ ...track, download }, path)).rejects.toThrow(
    'checksum mismatch',
  );
  expect(await readFile(path, 'utf8')).toBe('old invalid file');
  await expect(access(`${path}.part`)).rejects.toThrow();
});
