import { useQuery } from '@tanstack/react-query';
import { fetchJobs, fetchJobsForCampaign, fetchJobsForMergePanel } from '@/services/jobsService';

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

export function useJobsForMergePanel(search?: string) {
  return useQuery({
    queryKey: ['jobs-for-merge-panel', search ?? ''],
    queryFn: () => fetchJobsForMergePanel(search),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
