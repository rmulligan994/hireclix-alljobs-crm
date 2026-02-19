import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/services';
import type { CreateCandidateData, UpdateCandidateData } from '@/types';
import { toast } from 'sonner';

/**
 * React Query hooks for candidate operations
 */

export const useCandidates = () => {
  return useQuery({
    queryKey: ['candidates'],
    queryFn: candidateService.getAll,
  });
};

export const useCandidatesWithEnrichment = () => {
  return useQuery({
    queryKey: ['candidates', 'enriched'],
    queryFn: candidateService.getListWithEnrichment,
  });
};

export const useCandidate = (id: string) => {
  return useQuery({
    queryKey: ['candidates', id],
    queryFn: () => candidateService.getById(id),
    enabled: !!id,
  });
};

export const useCandidateWithAssociations = (id: string) => {
  return useQuery({
    queryKey: ['candidates', id, 'associations'],
    queryFn: () => candidateService.getByIdWithAssociations(id),
    enabled: !!id,
  });
};

export const useCandidateSearch = (query: string) => {
  return useQuery({
    queryKey: ['candidates', 'search', query],
    queryFn: () => candidateService.search(query),
    enabled: query.length > 0,
  });
};

export const useCandidateStats = () => {
  return useQuery({
    queryKey: ['candidates', 'stats'],
    queryFn: async () => {
      const [total, newThisWeek] = await Promise.all([
        candidateService.getCount(),
        candidateService.getNewThisWeek(),
      ]);
      return { total, newThisWeek };
    },
  });
};

export const useCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCandidateData) => candidateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create candidate: ${error.message}`);
    },
  });
};

export const useUpdateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCandidateData }) => 
      candidateService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates', variables.id] });
      toast.success('Candidate updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update candidate: ${error.message}`);
    },
  });
};

export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => candidateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete candidate: ${error.message}`);
    },
  });
};

export const useFindDuplicates = (email?: string, phone?: string) => {
  return useQuery({
    queryKey: ['candidates', 'duplicates', email, phone],
    queryFn: () => candidateService.findDuplicates(email, phone),
    enabled: !!(email || phone),
  });
};

export const useFindAllDuplicates = (enabled = true) => {
  return useQuery({
    queryKey: ['candidates', 'all-duplicates'],
    queryFn: () => candidateService.findAllDuplicates(),
    enabled,
  });
};

export const useMergeCandidates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      keepId,
      removeId,
      mergedData,
    }: {
      keepId: string;
      removeId: string;
      mergedData: UpdateCandidateData;
    }) => candidateService.mergeCandidates(keepId, removeId, mergedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidates merged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to merge candidates: ${error.message}`);
    },
  });
};
