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

export type DatePreset = '7' | '30' | '90' | 'all';

export function getDateRangeFromPreset(preset: DatePreset): DateRange | undefined {
  if (preset === 'all') return undefined;

  const end = new Date();
  const start = new Date();
  const days = parseInt(preset, 10);
  start.setDate(start.getDate() - days);
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
