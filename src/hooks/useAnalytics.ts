import { useQuery } from '@tanstack/react-query';
import {
  getSourceStats,
  getConversionFunnel,
  getHiringTimeline,
  type DateRange,
} from '@/services/analyticsService';

/**
 * React Query hooks for analytics data
 */

export type DatePreset = '7' | '30' | '90' | 'all' | 'custom';

export function getDateRangeFromPreset(preset: DatePreset): DateRange | undefined {
  if (preset === 'all' || preset === 'custom') return undefined;

  const end = new Date();
  const start = new Date();
  const days = parseInt(preset, 10);
  start.setDate(start.getDate() - days);
  return normalizeDateRange({ start, end });
}

/** Normalize start to midnight and end to end-of-day for consistent date range queries */
export function normalizeDateRange(range: DateRange): DateRange {
  const start = new Date(range.start);
  const end = new Date(range.end);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function useSourceStats(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'sourceStats', dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: () => getSourceStats(dateRange),
  });
}

export function useConversionFunnel(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'conversionFunnel', dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: () => getConversionFunnel(dateRange),
  });
}

export function useHiringTimeline(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'hiringTimeline', dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: () => getHiringTimeline(dateRange),
  });
}
