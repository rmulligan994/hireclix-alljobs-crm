import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/services/jobsService';

export function useJobs(page = 1, search?: string) {
  return useQuery({
    queryKey: ['jobs', page, search ?? ''],
    queryFn: () => fetchJobs(page, search),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
