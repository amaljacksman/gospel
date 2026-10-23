import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

async function plan(env: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), 'gospel-plan-'));
  const output = join(dir, 'output');
  try {
    execFileSync(process.execPath, ['generator/scripts/plan-media.mjs'], {
      env: {
        ...process.env,
        YEAR: '',
        FROM: '',
        TO: '',
        GITHUB_EVENT_NAME: 'schedule',
        GITHUB_OUTPUT: output,
        ...env,
      },
      stdio: 'pipe',
    });
    return JSON.parse((await readFile(output, 'utf8')).trim().slice('matrix='.length));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
it('plans today and two reserve days in India rather than the UTC calendar date', async () => {
  expect(await plan({ MEDIA_PLAN_NOW: '2026-10-19T20:17:00Z' })).toEqual({
    include: [{ year: '2026', from: '2026-10-20', to: '2026-10-22' }],
  });
});
it('splits generation by year over December 31', async () => {
  expect(await plan({ MEDIA_PLAN_NOW: '2026-12-30T20:17:00Z' })).toEqual({
    include: [
      { year: '2026', from: '2026-12-31', to: '2026-12-31' },
      { year: '2027', from: '2027-01-01', to: '2027-01-02' },
    ],
  });
});
it('retains manual one-day and whole-year runs', async () => {
  expect(
    await plan({
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      YEAR: '2026',
      FROM: '2026-10-20',
      TO: '2026-10-20',
    }),
  ).toEqual({ include: [{ year: '2026', from: '2026-10-20', to: '2026-10-20' }] });
  expect(await plan({ GITHUB_EVENT_NAME: 'workflow_dispatch', YEAR: '2027' })).toEqual({
    include: [{ year: '2027', from: '', to: '' }],
  });
});
it('fails clearly when future content has not been authored', async () => {
  await expect(plan({ MEDIA_PLAN_NOW: '2028-12-31T20:17:00Z' })).rejects.toThrow(
    'content/2029.json',
  );
});
it('includes rescheduled spillover content across the 2028 boundary', async () => {
  expect(await plan({ MEDIA_PLAN_NOW: '2027-12-31T20:17:00Z' })).toEqual({
    include: [{ year: '2028', from: '2028-01-01', to: '2028-01-03' }],
  });
  await expect(plan({ MEDIA_PLAN_NOW: '2028-01-02T20:17:00Z' })).rejects.toThrow(
    'Content is incomplete',
  );
});
it('rejects an invalid manual date before rendering or uploading', async () => {
  await expect(
    plan({
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      YEAR: '2026',
      FROM: '2026-02-30',
      TO: '2026-02-30',
    }),
  ).rejects.toThrow('Dates must be real');
});

it('bootstraps upcoming media when the automation or content is pushed', async () => {
  expect(await plan({ GITHUB_EVENT_NAME: 'push', MEDIA_PLAN_NOW: '2026-10-19T03:00:00Z' })).toEqual(
    { include: [{ year: '2026', from: '2026-10-19', to: '2026-10-21' }] },
  );
});
