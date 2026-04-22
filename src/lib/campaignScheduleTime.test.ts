import { describe, it, expect } from 'vitest';
import { isScheduleInPast, localYmdTimeToDate } from './campaignScheduleTime';

describe('localYmdTimeToDate', () => {
  it('uses local wall calendar for YYYY-MM-DD (not UTC date-only parse)', () => {
    const d = localYmdTimeToDate('2026-06-10', '16:15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(16);
    expect(d.getMinutes()).toBe(15);
  });
});

describe('isScheduleInPast', () => {
  it('treats same calendar day in the past as in the past', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const ymd = `${y}-${m}-${day}`;
    expect(isScheduleInPast(ymd, '00:00')).toBe(true);
  });
});
