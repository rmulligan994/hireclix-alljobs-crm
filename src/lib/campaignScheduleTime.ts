import { isBefore, parse } from 'date-fns';

/**
 * Combine a calendar day (YYYY-MM-DD) and wall-clock time (HH:mm) in the user's **local** timezone.
 * Do not use `new Date("YYYY-MM-DD")` — that parses as UTC and shifts the day for most users.
 */
export function localYmdTimeToDate(ymd: string, timeHm: string): Date {
  const base = parse(ymd.trim(), 'yyyy-MM-dd', new Date());
  if (Number.isNaN(base.getTime())) {
    throw new Error('Invalid schedule date');
  }
  const parts = timeHm.split(':');
  const hh = parseInt(parts[0] || '0', 10) || 0;
  const mm = parseInt(parts[1] || '0', 10) || 0;
  const d = new Date(base);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function isScheduleInPast(ymd: string, timeHm: string): boolean {
  return isBefore(localYmdTimeToDate(ymd, timeHm), new Date());
}
