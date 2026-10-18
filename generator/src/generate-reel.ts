import sharp from 'sharp';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { DailyContent } from '../../shared/types/content.js';
import { r2Key } from '../../shared/utils/paths.js';
import { cardSvg } from './svg.js';
import { AUDIO, audioPath } from './audio.js';
function run(args: string[]): Promise<void> {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += String(d)));
    p.on('error', fail);
    p.on('close', (c) =>
      c === 0 ? ok() : fail(new Error(`ffmpeg exited ${c}: ${err.slice(-1500)}`)),
    );
  });
}
export async function generateReel(day: DailyContent): Promise<string> {
  if (!day.reel) throw new Error('Reel is absent');
  const out = resolve('generated', r2Key('reel', day.date));
  const frame = `${out}.png`;
  await mkdir(dirname(out), { recursive: true });
  await writeFile(
    frame,
    await sharp(cardSvg(day, 1080, 1920, 'reel'))
      .png()
      .toBuffer(),
  );
  const d = day.reel.durationSeconds;
  const audio = AUDIO[day.reel.audio];
  try {
    await run([
      '-y',
      '-loop',
      '1',
      '-i',
      frame,
      '-i',
      audioPath(day.reel.audio),
      '-filter_complex',
      `[0:v]scale=1080:1920,zoompan=z='min(zoom+0.00015,1.03)':d=${d * 30}:s=1080x1920:fps=30,fade=t=in:st=0:d=1,fade=t=out:st=${d - 1}:d=1[v];[1:a]volume=${audio.volume},loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:st=0:d=1,afade=t=out:st=${d - 1}:d=1[a]`,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-t',
      String(d),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-profile:v',
      'high',
      '-level',
      '4.1',
      '-r',
      '30',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      out,
    ]);
  } finally {
    await unlink(frame).catch(() => undefined);
  }
  return out;
}
