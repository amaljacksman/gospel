import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
async function files(dir: string): Promise<string[]> {
  return (await readdir(dir, { withFileTypes: true }))
    .flatMap((e) => (e.isDirectory() ? [] : [join(dir, e.name)]))
    .concat(
      ...(await Promise.all(
        (await readdir(dir, { withFileTypes: true }))
          .filter((e) => e.isDirectory())
          .map((e) => files(join(dir, e.name))),
      )),
    );
}
export async function uploadYear(year: number): Promise<number> {
  const account = need('R2_ACCOUNT_ID');
  const bucket = need('R2_BUCKET');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: need('R2_ACCESS_KEY_ID'),
      secretAccessKey: need('R2_SECRET_ACCESS_KEY'),
    },
  });
  const root = 'generated';
  let paths: string[] = [];
  try {
    paths = (await files(root)).filter(
      (p) => p.includes(`/${year}/`) && (p.endsWith('.jpg') || p.endsWith('.mp4')),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  paths.push(`content/${year}.json`);
  await mapConcurrent(paths, 5, async (path) => {
    const key = path.startsWith(`${root}/`) ? relative(root, path).replaceAll('\\', '/') : path;
    const contentType = key.endsWith('.mp4')
      ? 'video/mp4'
      : key.endsWith('.jpg')
        ? 'image/jpeg'
        : 'application/json';
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: await readFile(path),
        ContentType: contentType,
        // Calendar JSON and regenerated media use stable, replaceable keys.
        CacheControl: key.endsWith('.json') ? 'public, max-age=60' : 'public, max-age=300',
      }),
    );
    console.log(`Uploaded ${key}`);
  });
  return paths.length;
}

async function mapConcurrent<T>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker(): Promise<void> {
    while (next < values.length) {
      const value = values[next++];
      if (value !== undefined) await operation(value);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
}
function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}
