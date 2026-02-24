"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { AddCandidateDialog } from '@/components/candidates/AddCandidateDialog';
import { FindDuplicatesDialog } from '@/components/candidates/FindDuplicatesDialog';
import { ImportCandidatesDialog } from '@/components/candidates/ImportCandidatesDialog';
import { BulkAddToPipelineDialog } from '@/components/candidates/BulkAddToPipelineDialog';
import { BulkAddToTalentPoolDialog } from '@/components/candidates/BulkAddToTalentPoolDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Filter, Download, Upload, Plus, Mail, Phone, MapPin, Users, CalendarPlus, 
  GitBranch, GitMerge, Loader2 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  CandidateSearchBar,
  AdvancedSearchPanel,
  CandidateFiltersPanel,
  ActiveFiltersBar,
  SavedSearchesDropdown,
  SortDropdown,
  type CandidateFilters,
  type FilterOption,
} from '@/components/candidates/search';
import { useCandidateSearch } from '@/hooks/useCandidateSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { useCandidatesWithEnrichment, useCandidateStats } from '@/hooks/useCandidates';
import { useQueryClient } from '@tanstack/react-query';
import { useCandidateListContext } from '@/contexts/CandidateListContext';
import { exportCandidatesToCsv } from '@/utils/exportCandidates';
import { parseBooleanSearch } from '@/utils/booleanSearchParser';
import { getStageColorClass } from '@/utils/stageColors';

function formatLastContact(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Infer experience level from job title (AI-deduced, not 100% accurate)
function inferExperienceLevels(title: string): string[] {
  if (!title || !title.trim()) return [];
  const t = title.toLowerCase();
  const levels: string[] = [];
  if (/\b(executive|ceo|cto|cfo|coo|vp|vice president|director|head of)\b/.test(t)) levels.push('executive');
  if (/\b(lead|principal|architect)\b/.test(t)) levels.push('lead');
  if (/\b(senior|sr\.?|staff)\b/.test(t)) levels.push('senior');
  if (/\b(mid|middle|engineer|developer|analyst)\b/.test(t) && !/\b(senior|lead|principal)\b/.test(t)) levels.push('mid');
  if (/\b(junior|jr\.?|entry|intern|graduate)\b/.test(t)) levels.push('entry');
  return levels;
}

function getDateAddedBoundary(preset: string): Date | null {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === 'today') return start;
  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return start;
  }
  if (preset === 'this_month') {
    start.setDate(1);
    return start;
  }
  if (preset === 'last_3_months') {
    start.setMonth(now.getMonth() - 3);
    return start;
  }
  return null;
}

function getLastContactBoundary(preset: string): { from?: Date; never?: boolean } | null {
  if (preset === 'never') return { never: true };
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === 'today') return { from: start };
  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return { from: start };
  }
  if (preset === 'this_month') {
    start.setDate(1);
    return { from: start };
  }
  return null;
}

const TalentPool = () => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [findDuplicatesOpen, setFindDuplicatesOpen] = useState(false);
  const [importCandidatesOpen, setImportCandidatesOpen] = useState(false);
  const [bulkAddToPipelineOpen, setBulkAddToPipelineOpen] = useState(false);
  const [bulkAddToTalentPoolOpen, setBulkAddToTalentPoolOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  // Use the candidate search hook
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isAdvancedOpen,
    toggleAdvancedSearch,
    advancedFields,
    setAdvancedFields,
    filters,
    setFilters,
    isFiltersOpen,
    setIsFiltersOpen,
    sortOption,
    setSortOption,
    savedSearches,
    recentSearches,
    saveSearch,
    deleteSavedSearch,
    renameSavedSearch,
    applySavedSearch,
    hasActiveFilters,
    clearAllFilters,
    clearSearch,
    removeFilter,
  } = useCandidateSearch();

  // Candidate list context for navigation
  const { setCandidateList } = useCandidateListContext();
  const queryClient = useQueryClient();

  // Fetch real data from database with pipeline associations and last contact
  const { data: dbCandidates, isLoading } = useCandidatesWithEnrichment();
  const { data: stats } = useCandidateStats();

  // Measure time from debounce firing to results rendered (no "Searching..." for client-side filter - keeps results visible while typing)
  const searchStartRef = useRef<number | null>(null);
  const [lastRenderMs, setLastRenderMs] = useState<number | null>(null);
  const prevDebouncedRef = useRef(debouncedSearchQuery);
  useEffect(() => {
    if (debouncedSearchQuery !== prevDebouncedRef.current) {
      prevDebouncedRef.current = debouncedSearchQuery;
      searchStartRef.current = performance.now();
    }
  }, [debouncedSearchQuery]);

  // Filter and sort candidates - use real database candidates with enrichment
  const filteredCandidates = useMemo(() => {
    const candidates = (dbCandidates || []).map(c => ({
      id: c.id,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      email: c.email || '',
      phone: c.phone || '',
      title: c.title || '',
      company: c.company || '',
      location: c.location || '',
      skills: c.tags || [],
      pipelineAssociations: c.pipelineAssociations || [],
      source: c.source || '',
      linkedinUrl: c.linkedinUrl || '',
      lastContact: formatLastContact(c.lastContactAt),
      lastContactAt: c.lastContactAt,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));

    let results = [...candidates];

    // Apply advanced search fields
    if (advancedFields.name) {
      const nameQuery = advancedFields.name.toLowerCase();
      results = results.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(nameQuery)
      );
    }
    if (advancedFields.email) {
      const emailQuery = advancedFields.email.toLowerCase();
      results = results.filter(c =>
        (c.email || '').toLowerCase().includes(emailQuery)
      );
    }
    if (advancedFields.phone) {
      const phoneQuery = advancedFields.phone.replace(/\D/g, '');
      results = results.filter(c =>
        (c.phone || '').replace(/\D/g, '').includes(phoneQuery)
      );
    }
    if (advancedFields.company) {
      const companyQuery = advancedFields.company.toLowerCase();
      results = results.filter(c =>
        (c.company || '').toLowerCase().includes(companyQuery)
      );
    }
    if (advancedFields.title) {
      const titleQuery = advancedFields.title.toLowerCase();
      results = results.filter(c =>
        (c.title || '').toLowerCase().includes(titleQuery)
      );
    }
    if (advancedFields.location) {
      const locationQuery = advancedFields.location.toLowerCase();
      results = results.filter(c =>
        (c.location || '').toLowerCase().includes(locationQuery)
      );
    }
    if (advancedFields.skills.length > 0) {
      results = results.filter(c =>
        advancedFields.skills.every(skill =>
          c.skills.some(s => s.toLowerCase() === skill.toLowerCase())
        )
      );
    }
    if (advancedFields.dateAddedFrom) {
      const from = new Date(advancedFields.dateAddedFrom);
      from.setHours(0, 0, 0, 0);
      results = results.filter(c => c.createdAt >= from);
    }
    if (advancedFields.dateAddedTo) {
      const to = new Date(advancedFields.dateAddedTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(c => c.createdAt <= to);
    }
    if (advancedFields.lastContactedFrom) {
      const from = new Date(advancedFields.lastContactedFrom);
      from.setHours(0, 0, 0, 0);
      results = results.filter(c =>
        c.lastContactAt ? new Date(c.lastContactAt) >= from : false
      );
    }
    if (advancedFields.lastContactedTo) {
      const to = new Date(advancedFields.lastContactedTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(c =>
        c.lastContactAt ? new Date(c.lastContactAt) <= to : false
      );
    }

    // Apply text search (supports boolean: "Senior Engineer" AND (Boston OR Gloucester) NOT Manchester)
    if (debouncedSearchQuery) {
      const matcher = parseBooleanSearch(debouncedSearchQuery);
      if (matcher) {
        results = results.filter((c) => matcher(c));
      } else {
        // Fallback: simple substring match when parse fails
        const query = debouncedSearchQuery.toLowerCase();
        results = results.filter(c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.company?.toLowerCase().includes(query) ||
          c.title?.toLowerCase().includes(query) ||
          c.location?.toLowerCase().includes(query) ||
          c.skills.some(s => s.toLowerCase().includes(query))
        );
      }
    }

    // Apply skill filters
    if (filters.skills.length > 0) {
      results = results.filter(c => 
        filters.skills.some(skill => c.skills.includes(skill))
      );
    }

    // Apply location filters
    if (filters.locations.length > 0) {
      results = results.filter(c => 
        filters.locations.includes(c.location || '')
      );
    }

    // Apply pipeline filters
    if (filters.pipelines.length > 0) {
      if (filters.pipelines.includes('none')) {
        results = results.filter(c => c.pipelineAssociations.length === 0);
      } else {
        results = results.filter(c => 
          c.pipelineAssociations.some(p => filters.pipelines.includes(p.name))
        );
      }
    }

    // Apply pipeline stage filters
    if (filters.pipelineStages.length > 0) {
      results = results.filter(c => 
        c.pipelineAssociations.some(p => filters.pipelineStages.includes(p.stage))
      );
    }

    // Apply source filters
    if (filters.sources.length > 0) {
      results = results.filter(c => 
        filters.sources.includes(c.source || '')
      );
    }

    // Apply company filters
    if (filters.companies.length > 0) {
      results = results.filter(c => 
        filters.companies.includes(c.company || '')
      );
    }

    // Apply experience level filter (inferred from title)
    if (filters.experienceLevels.length > 0) {
      results = results.filter(c => {
        const levels = inferExperienceLevels(c.title);
        return filters.experienceLevels.some(l => levels.includes(l));
      });
    }

    // Apply date added filter
    if (filters.dateAdded && filters.dateAdded !== 'custom') {
      const from = getDateAddedBoundary(filters.dateAdded);
      if (from) {
        results = results.filter(c => c.createdAt >= from);
      }
    }

    // Apply last contact filter
    if (filters.lastContact && filters.lastContact !== 'custom') {
      const boundary = getLastContactBoundary(filters.lastContact);
      if (boundary?.never) {
        results = results.filter(c => !c.lastContactAt);
      } else if (boundary?.from) {
        results = results.filter(c =>
          c.lastContactAt ? new Date(c.lastContactAt) >= boundary.from! : false
        );
      }
    }

    // Apply sorting
    switch (sortOption) {
      case 'name_asc':
        results.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        break;
      case 'name_desc':
        results.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
        break;
      case 'recently_added':
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest_first':
        results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'last_contacted_recent':
        results.sort((a, b) => {
          const aTime = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
          const bTime = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'last_contacted_oldest':
        results.sort((a, b) => {
          const aTime = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
          const bTime = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
          return aTime - bTime;
        });
        break;
      case 'last_updated':
        results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      default:
        break;
    }

    return results;
  }, [dbCandidates, debouncedSearchQuery, filters, sortOption, advancedFields]);

  // Update candidate list context when filtered candidates change
  useEffect(() => {
    setCandidateList(filteredCandidates.map(c => c.id));
  }, [filteredCandidates, setCandidateList]);

  // Capture render time when filtered results update
  useEffect(() => {
    if (searchStartRef.current != null) {
      setLastRenderMs(Math.round(performance.now() - searchStartRef.current));
      searchStartRef.current = null;
    }
  }, [filteredCandidates]);


  // Debounce suggestions to avoid blocking main thread on every keystroke
  const debouncedSuggestionsQuery = useDebounce(searchQuery, 100);
  const searchSuggestions = useMemo(() => {
    if (!debouncedSuggestionsQuery || debouncedSuggestionsQuery.length < 2) return [];
    
    const query = debouncedSuggestionsQuery.toLowerCase();
    const suggestions: Array<{ type: 'candidate' | 'company' | 'skill'; value: string; subtext?: string }> = [];
    const candidates = dbCandidates || [];

    // Candidate suggestions
    candidates
      .filter(c => `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach(c => suggestions.push({
        type: 'candidate',
        value: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        subtext: `${c.title || ''} at ${c.company || ''}`
      }));

    // Company suggestions
    const companies = [...new Set(candidates.map(c => c.company).filter(Boolean))];
    companies
      .filter(c => c?.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach(c => suggestions.push({ type: 'company', value: c || '' }));

    // Skill suggestions from candidates' tags
    const allSkills = [...new Set(candidates.flatMap(c => c.tags || []))];
    allSkills
      .filter(s => s.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach(s => suggestions.push({ type: 'skill', value: s }));

    return suggestions;
  }, [debouncedSuggestionsQuery, dbCandidates]);

  // Dynamic filter options derived from current filtered result set (updates as you filter)
  const filterOptions = useMemo(() => {
    const c = filteredCandidates;
    const skillCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    const pipelineCounts = new Map<string, number>();
    const stageCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const companyCounts = new Map<string, number>();

    c.forEach((cand) => {
      (cand.skills || []).forEach((s) => {
        if (s?.trim()) skillCounts.set(s, (skillCounts.get(s) || 0) + 1);
      });
      if (cand.location?.trim()) {
        locationCounts.set(cand.location, (locationCounts.get(cand.location) || 0) + 1);
      }
      (cand.pipelineAssociations || []).forEach((p) => {
        if (p?.name) pipelineCounts.set(p.name, (pipelineCounts.get(p.name) || 0) + 1);
        if (p?.stage) stageCounts.set(p.stage, (stageCounts.get(p.stage) || 0) + 1);
      });
      if (cand.source?.trim()) {
        sourceCounts.set(cand.source, (sourceCounts.get(cand.source) || 0) + 1);
      }
      if (cand.company?.trim()) {
        companyCounts.set(cand.company, (companyCounts.get(cand.company) || 0) + 1);
      }
    });

    return {
      skills: Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: skillCounts.get(value) })),
      locations: Array.from(locationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: locationCounts.get(value) })),
      pipelines: Array.from(pipelineCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: pipelineCounts.get(value) })),
      pipelineStages: Array.from(stageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: stageCounts.get(value) })),
      talentPools: [] as FilterOption[],
      sources: Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: sourceCounts.get(value) })),
      companies: Array.from(companyCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: companyCounts.get(value) })),
    };
  }, [filteredCandidates]);

  const availableSkills = useMemo(() => filterOptions.skills.map((s) => s.value), [filterOptions.skills]);

  const totalCandidates = dbCandidates?.length || 0;
  const snapshotMetrics = [
    { label: 'Total Candidates', value: stats?.total || totalCandidates, icon: Users },
    { label: 'New This Week', value: stats?.newThisWeek || 0, icon: CalendarPlus },
    { label: 'In Active Pipelines', value: filteredCandidates.filter(c => c.pipelineAssociations.length > 0).length, icon: GitBranch },
  ];

  const getStageColor = (stage: string) => getStageColorClass(stage);

  const toggleSelectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.id));
    }
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidates(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleSkillClick = (skill: string) => {
    if (!filters.skills.includes(skill)) {
      setFilters(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    }
  };

  const handleLocationClick = (location: string) => {
    if (!filters.locations.includes(location)) {
      setFilters(prev => ({ ...prev, locations: [...prev.locations, location] }));
    }
  };

  const handlePipelineClick = (pipelineName: string) => {
    if (!filters.pipelines.includes(pipelineName)) {
      setFilters(prev => ({ ...prev, pipelines: [...prev.pipelines, pipelineName] }));
    }
  };

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar 
          onCopilotToggle={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                  Candidates
                </h1>
                <p className="font-body text-muted-foreground">
                  Search, filter, and manage your candidate database
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  className="border-sunrise text-sunrise hover:bg-sunrise hover:text-white"
                  onClick={() => setFindDuplicatesOpen(true)}
                >
                  <GitMerge className="w-4 h-4 mr-2" />
                  Find Duplicates
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem
                      onClick={() => exportCandidatesToCsv(filteredCandidates)}
                      className="cursor-pointer"
                    >
                      Export visible ({filteredCandidates.length})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportCandidatesToCsv(
                        (dbCandidates || []).map(c => ({
                          id: c.id,
                          firstName: c.firstName,
                          lastName: c.lastName,
                          email: c.email,
                          phone: c.phone,
                          company: c.company,
                          title: c.title,
                          location: c.location,
                          source: c.source,
                          tags: c.tags,
                          linkedinUrl: c.linkedinUrl,
                          createdAt: c.createdAt,
                        }))
                      )}
                      className="cursor-pointer"
                    >
                      Export all ({dbCandidates?.length ?? 0})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                  onClick={() => setImportCandidatesOpen(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setAddCandidateOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </Button>
              </div>
            </div>
          </div>

          {/* Snapshot Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {snapshotMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-sky-blue/10">
                        <Icon className="w-5 h-5 text-sky-blue" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-foreground">{metric.value.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-card rounded-lg border border-border p-4 mb-4">
            <div className="flex items-center gap-3">
              <CandidateSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onAdvancedSearchToggle={toggleAdvancedSearch}
                isAdvancedOpen={isAdvancedOpen}
                suggestions={searchSuggestions}
                recentSearches={recentSearches}
                isLoading={false}
              />
              
              <SortDropdown value={sortOption} onChange={setSortOption} />
              
              <SavedSearchesDropdown
                savedSearches={savedSearches}
                recentSearches={recentSearches}
                onSelect={applySavedSearch}
                onApplyRecentSearch={(query) => setSearchQuery(query)}
                onSave={saveSearch}
                onDelete={deleteSavedSearch}
                onRename={renameSavedSearch}
                hasActiveFilters={hasActiveFilters}
              />
              
              <Button 
                variant="outline" 
                className="border-border text-foreground"
                onClick={() => setIsFiltersOpen(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-sky-blue" />
                )}
              </Button>
            </div>

            {/* Advanced Search Panel */}
            <AdvancedSearchPanel
              isOpen={isAdvancedOpen}
              fields={advancedFields}
              onChange={setAdvancedFields}
              onSearch={toggleAdvancedSearch}
              onClear={() => setAdvancedFields({
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
              })}
              availableSkills={availableSkills}
            />
          </div>

          {/* Results count + render time (testing) */}
          {!isLoading && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <span>
                {hasActiveFilters
                  ? `Showing ${filteredCandidates.length.toLocaleString()} of ${totalCandidates.toLocaleString()} candidates`
                  : `${filteredCandidates.length.toLocaleString()} candidates`}
              </span>
              {lastRenderMs != null && (
                <>
                  <span className="text-border">•</span>
                  <span>Rendered in {lastRenderMs}ms</span>
                </>
              )}
            </div>
          )}

          {/* Active Filters Bar */}
          <ActiveFiltersBar
            filters={filters}
            searchQuery={searchQuery}
            totalResults={filteredCandidates.length}
            totalCandidates={totalCandidates}
            onRemoveFilter={removeFilter}
            onClearAll={clearAllFilters}
            onClearSearch={clearSearch}
          />

          {/* Bulk Actions Bar */}
          {selectedCandidates.length > 0 && (
            <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-lg p-3 mb-4 flex items-center justify-between animate-in slide-in-from-top-2">
              <span className="text-sm text-foreground">
                {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sky-blue text-sky-blue"
                  onClick={() => setBulkAddToPipelineOpen(true)}
                >
                  Add to Pipeline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sky-blue text-sky-blue"
                  onClick={() => setBulkAddToTalentPoolOpen(true)}
                >
                  Add to Talent Pool
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sky-blue text-sky-blue"
                  onClick={() => exportCandidatesToCsv(
                    filteredCandidates.filter(c => selectedCandidates.includes(c.id))
                  )}
                >
                  Export Selected
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-muted-foreground"
                  onClick={() => setSelectedCandidates([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Candidates Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[320px] py-12">
                <Loader2 className="w-6 h-6 animate-spin text-sky-blue" />
                <span className="ml-2 text-muted-foreground">Searching...</span>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[320px] py-12">
                <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No candidates found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-deep-sea hover:bg-deep-sea">
                    <TableHead className="text-white w-10">
                      <Checkbox
                        checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">Current Role</TableHead>
                    <TableHead className="text-white">Location</TableHead>
                    <TableHead className="text-white">Skills</TableHead>
                    <TableHead className="text-white">Pipelines</TableHead>
                    <TableHead className="text-white">Last Contact</TableHead>
                    <TableHead className="text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow 
                      key={candidate.id} 
                      className="hover:bg-sky-blue/5 cursor-pointer"
                      onClick={() => router.push(`/candidates/${candidate.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedCandidates.includes(candidate.id)}
                          onCheckedChange={() => toggleSelectCandidate(candidate.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="text-foreground hover:text-sky-blue transition-colors">
                            {candidate.firstName} {candidate.lastName}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Mail className="w-3 h-3 mr-1" />
                            <Phone className="w-3 h-3 ml-2 mr-1" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-foreground">{candidate.title}</div>
                          <div className="text-xs text-muted-foreground">{candidate.company}</div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleLocationClick(candidate.location || '')}
                          className="flex items-center text-muted-foreground hover:text-sky-blue transition-colors"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {candidate.location}
                        </button>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 4).map((skill) => (
                            <Badge 
                              key={skill} 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-sky-blue/20 hover:text-sky-blue transition-colors"
                              onClick={() => handleSkillClick(skill)}
                            >
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 4 && (
                            <Badge variant="secondary" className="text-xs">+{candidate.skills.length - 4}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 max-w-xs">
                          {candidate.pipelineAssociations.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Not in pipeline</span>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground">
                                {candidate.pipelineAssociations.length} pipeline{candidate.pipelineAssociations.length !== 1 ? 's' : ''}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {candidate.pipelineAssociations.map((pipeline) => (
                                  <Badge 
                                    key={`${pipeline.id}-${pipeline.name}`}
                                    className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStageColor(pipeline.stage)}`}
                                    onClick={() => handlePipelineClick(pipeline.name)}
                                  >
                                    {pipeline.name.length > 15 ? `${pipeline.name.slice(0, 15)}...` : pipeline.name}: {pipeline.stage}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{candidate.lastContact}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-sky-blue hover:bg-sky-blue/10"
                          onClick={() => router.push(`/candidates/${candidate.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </main>
      </div>

      {/* Filters Side Panel */}
      <CandidateFiltersPanel
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        options={filterOptions}
      />

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

      <AddCandidateDialog 
        open={addCandidateOpen}
        onOpenChange={setAddCandidateOpen}
      />

      <FindDuplicatesDialog
        open={findDuplicatesOpen}
        onOpenChange={setFindDuplicatesOpen}
      />

      <ImportCandidatesDialog
        open={importCandidatesOpen}
        onOpenChange={setImportCandidatesOpen}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['candidates'] })}
      />

      <BulkAddToPipelineDialog
        open={bulkAddToPipelineOpen}
        onOpenChange={setBulkAddToPipelineOpen}
        candidateIds={selectedCandidates}
        onComplete={() => setSelectedCandidates([])}
      />

      <BulkAddToTalentPoolDialog
        open={bulkAddToTalentPoolOpen}
        onOpenChange={setBulkAddToTalentPoolOpen}
        candidateIds={selectedCandidates}
        onComplete={() => setSelectedCandidates([])}
      />
    </div>
  );
};

export default TalentPool;
