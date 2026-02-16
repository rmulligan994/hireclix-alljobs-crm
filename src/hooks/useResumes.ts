import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resumeService } from '@/services';
import { toast } from 'sonner';

export function useResumes(candidateId: string) {
  return useQuery({
    queryKey: ['resumes', candidateId],
    queryFn: () => resumeService.listByCandidate(candidateId),
    enabled: !!candidateId,
  });
}

export function useUploadResume(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => resumeService.upload(candidateId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes', candidateId] });
      toast.success('Resume uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload: ${error.message}`);
    },
  });
}

export function useSetPrimaryResume(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resumeId: string) => resumeService.setPrimary(resumeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes', candidateId] });
      toast.success('Primary resume updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useDeleteResume(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resumeId: string) => resumeService.delete(resumeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes', candidateId] });
      toast.success('Resume deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
