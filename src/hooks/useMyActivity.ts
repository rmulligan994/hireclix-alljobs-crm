import { useQuery } from '@tanstack/react-query';
import {
  getMyActivityStats,
  getMyActivityTimeSeries,
  type DateRange,
  type ActivityMetricKey,
  type ActivityScope,
} from '@/services/activityService';
import {
  getDateRangeFromPreset,
  normalizeDateRange,
  type DatePreset,
} from '@/hooks/useAnalytics';

export type { DatePreset, ActivityMetricKey };

export function useMyActivityStats(
  userId: string | undefined,
  dateRange?: DateRange,
  scope: ActivityScope = 'self'
) {
  return useQuery({
    queryKey: [
      'myActivity',
      userId,
      scope,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
    ],
    queryFn: () => getMyActivityStats(userId!, dateRange, scope),
    enabled: !!userId,
  });
}

export function useMyActivityTimeSeries(
  userId: string | undefined,
  metricKey: ActivityMetricKey,
  dateRange?: DateRange,
  scope: ActivityScope = 'self'
) {
  return useQuery({
    queryKey: [
      'myActivity',
      'timeSeries',
      userId,
      metricKey,
      scope,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
    ],
    queryFn: () => getMyActivityTimeSeries(userId!, metricKey, dateRange, scope),
    enabled: !!userId && !!metricKey,
  });
}

export { getDateRangeFromPreset, normalizeDateRange };
