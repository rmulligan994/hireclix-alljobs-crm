import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSyncLogs, triggerSync } from '@/services/jobsSyncService';

export function useJobsSyncLogs() {
  return useQuery({
    queryKey: ['jobs-sync-logs'],
    queryFn: () => fetchSyncLogs(5),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useTriggerJobsSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
