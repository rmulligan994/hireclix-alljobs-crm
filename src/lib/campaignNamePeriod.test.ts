import { describe, it, expect, vi, afterEach } from 'vitest';
import { ensureCampaignNameWithPeriod } from './campaignNamePeriod';

describe('ensureCampaignNameWithPeriod', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends current month and year when missing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    expect(ensureCampaignNameWithPeriod('Nurture')).toBe('Nurture · April 2026');
  });

  it('does not duplicate if period already in name', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    expect(ensureCampaignNameWithPeriod('Nurture · April 2026')).toBe('Nurture · April 2026');
  });
});
