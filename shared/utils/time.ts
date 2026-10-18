import { DateTime } from 'luxon';
export function scheduledInstant(date: string, time: string, zone: string): Date {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) throw new Error(`Invalid local schedule: ${dt.invalidExplanation}`);
  return dt.toUTC().toJSDate();
}
export function localDate(now: Date, zone: string): string {
  const value = DateTime.fromJSDate(now).setZone(zone);
  if (!value.isValid) throw new Error(`Invalid timezone: ${zone}`);
  return value.toISODate()!;
}
export function localDatesInWindow(now: Date, zone: string, minutes: number): string[] {
  const end = DateTime.fromJSDate(now).setZone(zone);
  const start = end.minus({ minutes });
  if (!end.isValid || !start.isValid) throw new Error(`Invalid timezone: ${zone}`);
  const dates = new Set<string>();
  let cursor = start.startOf('day');
  while (cursor <= end) {
    dates.add(cursor.toISODate()!);
    cursor = cursor.plus({ days: 1 });
  }
  return [...dates];
}
export function isDue(scheduled: Date, now: Date, graceMinutes: number): boolean {
  const age = now.getTime() - scheduled.getTime();
  return age >= 0 && age <= graceMinutes * 60_000;
}
