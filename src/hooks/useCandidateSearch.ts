import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import type { CandidateFilters } from '@/components/candidates/search/CandidateFiltersPanel';
import type { SavedSearch } from '@/components/candidates/search/SavedSearchesDropdown';
import type { SortOption } from '@/components/candidates/search/SortDropdown';
import type { AdvancedSearchFields } from '@/components/candidates/search/AdvancedSearchPanel';

const SAVED_SEARCHES_KEY = 'beacon_saved_searches';
const RECENT_SEARCHES_KEY = 'beacon_recent_searches';

const initialFilters: CandidateFilters = {
  skills: [],
  locations: [],
  pipelines: [],
  pipelineStages: [],
  talentPools: [],
  sources: [],
  companies: [],
  experienceLevels: [],
  dateAdded: null,
  lastContact: null,
};

const initialAdvancedFields: AdvancedSearchFields = {
  name: '',
  email: '',
  phone: '',
  company: '',
  title: '',
  skills: [],
  location: '',
  dateAddedFrom: undefined,
  dateAddedTo: undefined,
  lastContactedFrom: undefined,
  lastContactedTo: undefined,
};

export const useCandidateSearch = () => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedFields, setAdvancedFields] = useState<AdvancedSearchFields>(initialAdvancedFields);
  
  // Filter state
  const [filters, setFilters] = useState<CandidateFilters>(initialFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Sort state
  const [sortOption, setSortOption] = useState<SortOption>('recently_added');
  
  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Loading state
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedSearches(parsed.map((s: SavedSearch) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        })));
      }
      
      const recent = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (recent) {
        setRecentSearches(JSON.parse(recent));
      }
    } catch (e) {
      console.error('Failed to load saved searches:', e);
    }
  }, []);

  // Save to localStorage when saved searches change
  useEffect(() => {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
  }, [savedSearches]);

  // Save recent searches
  useEffect(() => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Add to recent searches when search is performed
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.length >= 2) {
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s !== debouncedSearchQuery);
        return [debouncedSearchQuery, ...filtered].slice(0, 10);
      });
    }
  }, [debouncedSearchQuery]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.length > 0 ||
      Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== null) ||
      Object.values(advancedFields).some(v => 
        Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ''
      )
    );
  }, [searchQuery, filters, advancedFields]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilters(initialFilters);
    setAdvancedFields(initialAdvancedFields);
  }, []);

  // Clear search only
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Remove a specific filter
  const removeFilter = useCallback((type: keyof CandidateFilters, value: string) => {
    setFilters(prev => {
      const current = prev[type];
      if (Array.isArray(current)) {
        return { ...prev, [type]: current.filter(v => v !== value) };
      }
      return { ...prev, [type]: null };
    });
  }, []);

  // Save current search
  const saveSearch = useCallback((name: string) => {
    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name,
      filters: { ...filters },
      searchQuery,
      createdAt: new Date(),
    };
    setSavedSearches(prev => [newSearch, ...prev]);
  }, [filters, searchQuery]);

  // Delete saved search
  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  }, []);

  // Rename saved search
  const renameSavedSearch = useCallback((id: string, name: string) => {
    setSavedSearches(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  // Apply saved search
  const applySavedSearch = useCallback((search: SavedSearch) => {
    setFilters(search.filters);
    setSearchQuery(search.searchQuery);
  }, []);

  // Toggle advanced search
  const toggleAdvancedSearch = useCallback(() => {
    setIsAdvancedOpen(prev => !prev);
  }, []);

  // Toggle filters panel
  const toggleFiltersPanel = useCallback(() => {
    setIsFiltersOpen(prev => !prev);
  }, []);

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isAdvancedOpen,
    toggleAdvancedSearch,
    advancedFields,
    setAdvancedFields,
    
    // Filters
    filters,
    setFilters,
    isFiltersOpen,
    toggleFiltersPanel,
    setIsFiltersOpen,
    
    // Sort
    sortOption,
    setSortOption,
    
    // Saved searches
    savedSearches,
    recentSearches,
    saveSearch,
    deleteSavedSearch,
    renameSavedSearch,
    applySavedSearch,
    
    // Utility
    hasActiveFilters,
    clearAllFilters,
    clearSearch,
    removeFilter,
    isSearching,
    setIsSearching,
  };
};
