import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { tagCatalogService } from '@/services/tagCatalogService';

const DEBOUNCE_MS = 200;

/**
 * Debounced prefix query against tag_catalog for comboboxes.
 */
export function useTagSuggestions(prefix: string, options?: { limit?: number; enabled?: boolean }) {
  const debounced = useDebounce(prefix, DEBOUNCE_MS);
  const limit = options?.limit ?? 20;
  const enabled = options?.enabled !== false && debounced.trim().length > 0;

  const query = useQuery({
    queryKey: ['tag_catalog', 'suggest', debounced.trim().toLowerCase(), limit],
    queryFn: () => tagCatalogService.suggestTags(debounced, limit),
    enabled,
    staleTime: 60 * 1000,
  });

  return useMemo(
    () => ({
      suggestions: query.data ?? [],
      isLoading: query.isLoading,
    }),
    [query.data, query.isLoading]
  );
}
