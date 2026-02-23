import { useQuery } from '@tanstack/react-query';
import { fetchJobs, fetchJobsForCampaign, fetchJobById } from '@/services/jobsService';

export function useJobById(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId ?? ''],
    queryFn: () => fetchJobById(jobId!),
    enabled: Boolean(jobId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useJobs(page = 1, search?: string) {
  return useQuery({
    queryKey: ['jobs', page, search ?? ''],
    queryFn: () => fetchJobs(page, search),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useJobsForCampaign(search?: string) {
  return useQuery({
    queryKey: ['jobs-for-campaign', search ?? ''],
    queryFn: () => fetchJobsForCampaign(search),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
