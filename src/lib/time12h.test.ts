import { describe, it, expect } from 'vitest';
import { formatHhmmAs12h, hhmm24ToParts, partsToHhmm24 } from './time12h';

describe('12h / 24h', () => {
  it('round-trips 4:15 PM', () => {
    const t = partsToHhmm24(4, 15, false);
    expect(t).toBe('16:15');
    const p = hhmm24ToParts(t);
    expect(p).toEqual({ hour12: 4, minute: 15, isAm: false });
  });

  it('round-trips 12:00 AM', () => {
    const t = partsToHhmm24(12, 0, true);
    expect(t).toBe('00:00');
    const p = hhmm24ToParts('00:00');
    expect(p.hour12).toBe(12);
    expect(p.isAm).toBe(true);
  });

  it('round-trips 12:00 PM', () => {
    const t = partsToHhmm24(12, 0, false);
    expect(t).toBe('12:00');
  });

  it('formats for display', () => {
    expect(formatHhmmAs12h('16:15')).toBe('4:15 PM');
    expect(formatHhmmAs12h('00:30')).toBe('12:30 AM');
  });
});
