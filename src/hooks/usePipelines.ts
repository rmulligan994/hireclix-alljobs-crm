import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineService } from '@/services';
import type { CreatePipelineData, UpdatePipelineData } from '@/types';
import { toast } from 'sonner';

/**
 * React Query hooks for pipeline operations
 */

export const usePipelines = (filter: 'all' | 'active' | 'archived' = 'all') => {
  return useQuery({
    queryKey: ['pipelines', filter],
    queryFn: () => {
      switch (filter) {
        case 'active':
          return pipelineService.getActive();
        case 'archived':
          return pipelineService.getArchived();
        default:
          return pipelineService.getAll();
      }
    },
  });
};

export const usePipeline = (id: string) => {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => pipelineService.getById(id),
    enabled: !!id,
  });
};

export const usePipelineWithCandidates = (id: string) => {
  return useQuery({
    queryKey: ['pipelines', id, 'candidates'],
    queryFn: () => pipelineService.getByIdWithCandidates(id),
    enabled: !!id,
  });
};

export const useActivePipelineCount = () => {
  return useQuery({
    queryKey: ['pipelines', 'activeCount'],
    queryFn: pipelineService.getActiveCount,
  });
};

export const useCandidatesByStage = (pipelineId?: string) => {
  return useQuery({
    queryKey: ['pipelines', 'candidatesByStage', pipelineId ?? 'all'],
    queryFn: () => pipelineService.getCandidatesByStage(pipelineId),
  });
};

export const useCreatePipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePipelineData) => pipelineService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Pipeline created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create pipeline: ${error.message}`);
    },
  });
};

export const useUpdatePipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePipelineData }) => 
      pipelineService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.id] });
      toast.success('Pipeline updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update pipeline: ${error.message}`);
    },
  });
};

export const useArchivePipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pipelineService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Pipeline archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive pipeline: ${error.message}`);
    },
  });
};

export const useUnarchivePipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pipelineService.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Pipeline restored');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore pipeline: ${error.message}`);
    },
  });
};

export const useDeletePipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pipelineService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success('Pipeline deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete pipeline: ${error.message}`);
    },
  });
};

export const useAddCandidatesToPipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, candidateIds }: { pipelineId: string; candidateIds: string[] }) =>
      pipelineService.addCandidates(pipelineId, candidateIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['myActivity'] });
      toast.success(`${variables.candidateIds.length} candidate${variables.candidateIds.length !== 1 ? 's' : ''} added to pipeline`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add candidates: ${error.message}`);
    },
  });
};

export const useAddCandidateToPipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, candidateId, stage }: { pipelineId: string; candidateId: string; stage: string }) => 
      pipelineService.addCandidate(pipelineId, candidateId, stage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['myActivity'] });
      toast.success('Candidate added to pipeline');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add candidate: ${error.message}`);
    },
  });
};

export const useRemoveCandidateFromPipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, candidateId }: { pipelineId: string; candidateId: string }) => 
      pipelineService.removeCandidate(pipelineId, candidateId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate removed from pipeline');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove candidate: ${error.message}`);
    },
  });
};

export const useUpdateCandidateStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, candidateId, stage }: { pipelineId: string; candidateId: string; stage: string }) => 
      pipelineService.updateCandidateStage(pipelineId, candidateId, stage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['myActivity'] });
      toast.success('Stage updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stage: ${error.message}`);
    },
  });
};
