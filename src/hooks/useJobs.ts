import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/services/jobsService';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
