import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { talentPoolService } from '@/services';
import type { CreateTalentPoolData, UpdateTalentPoolData } from '@/types';
import { toast } from 'sonner';

/**
 * React Query hooks for talent pool operations
 */

export const useTalentPools = () => {
  return useQuery({
    queryKey: ['talentPools'],
    queryFn: talentPoolService.getAll,
  });
};

export const useTalentPoolsWithCounts = () => {
  return useQuery({
    queryKey: ['talentPools', 'withCounts'],
    queryFn: talentPoolService.getAllWithCounts,
  });
};

export const useTalentPool = (id: string) => {
  return useQuery({
    queryKey: ['talentPools', id],
    queryFn: () => talentPoolService.getById(id),
    enabled: !!id,
  });
};

export const useTalentPoolWithCandidates = (id: string) => {
  return useQuery({
    queryKey: ['talentPools', id, 'candidates'],
    queryFn: () => talentPoolService.getByIdWithCandidates(id),
    enabled: !!id,
  });
};

export const useTalentPoolCount = () => {
  return useQuery({
    queryKey: ['talentPools', 'count'],
    queryFn: talentPoolService.getCount,
  });
};

export const useCreateTalentPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTalentPoolData) => talentPoolService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talentPools'] });
      toast.success('Talent pool created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create talent pool: ${error.message}`);
    },
  });
};

export const useUpdateTalentPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTalentPoolData }) => 
      talentPoolService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talentPools'] });
      queryClient.invalidateQueries({ queryKey: ['talentPools', variables.id] });
      toast.success('Talent pool updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update talent pool: ${error.message}`);
    },
  });
};

export const useDeleteTalentPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => talentPoolService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talentPools'] });
      toast.success('Talent pool deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete talent pool: ${error.message}`);
    },
  });
};

export const useAddCandidateToPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ poolId, candidateId }: { poolId: string; candidateId: string }) => 
      talentPoolService.addCandidate(poolId, candidateId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talentPools', variables.poolId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate added to pool');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add candidate: ${error.message}`);
    },
  });
};

export const useAddCandidatesToPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ poolId, candidateIds }: { poolId: string; candidateIds: string[] }) =>
      talentPoolService.addCandidates(poolId, candidateIds),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talentPools', variables.poolId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      const { added, skipped } = result;
      if (skipped > 0) {
        toast.success(
          added > 0
            ? `${added} candidate${added !== 1 ? 's' : ''} added to pool (${skipped} already in pool)`
            : `All ${skipped} candidate${skipped !== 1 ? 's' : ''} were already in the pool`
        );
      } else {
        toast.success(`${added} candidate${added !== 1 ? 's' : ''} added to pool`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to add candidates: ${error.message}`);
    },
  });
};

export const useRemoveCandidateFromPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ poolId, candidateId }: { poolId: string; candidateId: string }) => 
      talentPoolService.removeCandidate(poolId, candidateId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talentPools', variables.poolId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate removed from pool');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove candidate: ${error.message}`);
    },
  });
};

export const useRemoveCandidatesFromPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ poolId, candidateIds }: { poolId: string; candidateIds: string[] }) => 
      talentPoolService.removeCandidates(poolId, candidateIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['talentPools', variables.poolId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success(`${variables.candidateIds.length} candidates removed from pool`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove candidates: ${error.message}`);
    },
  });
};
