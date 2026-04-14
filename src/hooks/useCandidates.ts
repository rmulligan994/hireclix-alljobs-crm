import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/services';
import type { CreateCandidateData, UpdateCandidateData } from '@/types';
import type { AdvancedSearchFields, CandidateFilters, SortOption } from '@/lib/candidateSearch';
import { stableStringify } from '@/lib/stableStringify';
import { toast } from 'sonner';

/**
 * Search params for candidate search - matches useCandidateSearch UI state
 */
export interface CandidatesSearchParams {
  searchQuery?: string;
  advancedFields?: AdvancedSearchFields;
  filters?: CandidateFilters;
  sortOption?: SortOption;
  excludeIds?: string[];
  /** When set, search is restricted to these candidate ids (e.g. pool/pipeline scope). */
  scopeCandidateIds?: string[];
}

/**
 * Search and filter candidates with pagination.
 * Use pageSize for infinite scroll (TalentPool) or large limit for single page (Add Candidates dialogs).
 */
export const useCandidatesSearch = (
  params: CandidatesSearchParams,
  options?: { pageSize?: number; limit?: number }
) => {
  const pageSize = options?.limit ?? options?.pageSize ?? 50;

  const query = useInfiniteQuery({
    queryKey: ['candidates', 'search', stableStringify(params)],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await candidateService.searchPaginated({
        ...params,
        limit: pageSize,
        offset: pageParam,
      });
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.data.length >= pageSize ? lastPage.nextOffset : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data]
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const allFiltered = query.data?.pages[0] && 'allFiltered' in query.data.pages[0]
    ? (query.data.pages[0] as { allFiltered?: unknown[] }).allFiltered
    : undefined;

  return {
    data,
    total,
    allFiltered: allFiltered ?? data,
    isLoading: query.isLoading,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};

export const useCandidates = () => {
  return useQuery({
    queryKey: ['candidates'],
    queryFn: candidateService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes - instant back-navigation to cached data
  });
};

export const useCandidatesWithEnrichment = () => {
  return useQuery({
    queryKey: ['candidates', 'enriched'],
    queryFn: candidateService.getListWithEnrichment,
    staleTime: 5 * 60 * 1000, // 5 minutes - instant back-navigation to cached data
  });
};

/**
 * Enriched candidate rows for a bounded id list (no full-table fetch).
 */
export const useCandidatesEnrichedByIds = (ids: string[]) => {
  const sortedKey = [...ids].sort().join(',');
  return useQuery({
    queryKey: ['candidates', 'enriched', 'byIds', sortedKey],
    queryFn: () => candidateService.getEnrichedByIds(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
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

export const useCandidateStats = () => {
  return useQuery({
    queryKey: ['candidates', 'stats'],
    queryFn: async () => {
      const [total, newThisWeek, inPipelines] = await Promise.all([
        candidateService.getCount(),
        candidateService.getNewThisWeek(),
        candidateService.getInPipelinesCount(),
      ]);
      return { total, newThisWeek, inPipelines };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCandidateData) => candidateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['myActivity'] });
      queryClient.invalidateQueries({ queryKey: ['candidates', 'stats'] });
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
