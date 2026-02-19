import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/services/jobsService';

export function useJobs(page = 1) {
  return useQuery({
    queryKey: ['jobs', page],
    queryFn: () => fetchJobs(page),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
