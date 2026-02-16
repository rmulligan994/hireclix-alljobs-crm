import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resumeService } from '@/services';
import { toast } from 'sonner';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message?: string }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  if (typeof error === 'string' && error) return error;
  return fallback;
}

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
    onError: (error: unknown) => {
      toast.error(`Failed to upload: ${getErrorMessage(error, 'Unknown error')}`);
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
    onError: (error: unknown) => {
      toast.error(`Failed to update: ${getErrorMessage(error, 'Unknown error')}`);
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
    onError: (error: unknown) => {
      toast.error(`Failed to delete: ${getErrorMessage(error, 'Unknown error')}`);
    },
  });
}
