import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { AddCandidateDialog } from '@/components/candidates/AddCandidateDialog';
import { FindDuplicatesDialog } from '@/components/candidates/FindDuplicatesDialog';
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
import { useCandidates, useCandidateStats } from '@/hooks/useCandidates';

// Mock data for filter options - in production, these would come from the database
const mockFilterOptions = {
  skills: [
    { value: 'React', label: 'React', count: 234 },
    { value: 'TypeScript', label: 'TypeScript', count: 198 },
    { value: 'Python', label: 'Python', count: 156 },
    { value: 'Node.js', label: 'Node.js', count: 189 },
    { value: 'JavaScript', label: 'JavaScript', count: 312 },
    { value: 'SQL', label: 'SQL', count: 145 },
    { value: 'AWS', label: 'AWS', count: 98 },
    { value: 'Docker', label: 'Docker', count: 87 },
    { value: 'Kubernetes', label: 'Kubernetes', count: 56 },
    { value: 'GraphQL', label: 'GraphQL', count: 78 },
    { value: 'ML', label: 'Machine Learning', count: 67 },
    { value: 'Agile', label: 'Agile', count: 234 },
    { value: 'Product Strategy', label: 'Product Strategy', count: 89 },
    { value: 'Analytics', label: 'Analytics', count: 123 },
    { value: 'Statistics', label: 'Statistics', count: 45 },
  ] as FilterOption[],
  locations: [
    { value: 'San Francisco, CA', label: 'San Francisco, CA', count: 89 },
    { value: 'New York, NY', label: 'New York, NY', count: 67 },
    { value: 'Austin, TX', label: 'Austin, TX', count: 45 },
    { value: 'Seattle, WA', label: 'Seattle, WA', count: 56 },
    { value: 'Los Angeles, CA', label: 'Los Angeles, CA', count: 34 },
    { value: 'Chicago, IL', label: 'Chicago, IL', count: 28 },
    { value: 'Denver, CO', label: 'Denver, CO', count: 23 },
    { value: 'Boston, MA', label: 'Boston, MA', count: 31 },
    { value: 'Remote', label: 'Remote', count: 156 },
  ] as FilterOption[],
  pipelines: [
    { value: 'Senior Frontend Dev - Q1', label: 'Senior Frontend Dev - Q1', count: 137 },
    { value: 'Backend Engineer - Remote', label: 'Backend Engineer - Remote', count: 153 },
    { value: 'Product Manager - NYC', label: 'Product Manager - NYC', count: 89 },
    { value: 'Data Scientist - ML Team', label: 'Data Scientist - ML Team', count: 67 },
  ] as FilterOption[],
  pipelineStages: [
    { value: 'Sourced', label: 'Sourced' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Engaged', label: 'Engaged' },
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Submitted', label: 'Submitted' },
    { value: 'Hired', label: 'Hired' },
  ] as FilterOption[],
  talentPools: [
    { value: 'Senior Engineers', label: 'Senior Engineers', count: 234 },
    { value: 'JavaScript Experts', label: 'JavaScript Experts', count: 189 },
    { value: 'Product Leaders', label: 'Product Leaders', count: 78 },
    { value: 'Data Scientists', label: 'Data Scientists', count: 56 },
  ] as FilterOption[],
  sources: [
    { value: 'LinkedIn', label: 'LinkedIn', count: 456 },
    { value: 'Referral', label: 'Referral', count: 234 },
    { value: 'Career Site', label: 'Career Site', count: 189 },
    { value: 'Indeed', label: 'Indeed', count: 123 },
    { value: 'AngelList', label: 'AngelList', count: 67 },
    { value: 'Direct', label: 'Direct Outreach', count: 178 },
  ] as FilterOption[],
  companies: [
    { value: 'Tech Corp', label: 'Tech Corp', count: 45 },
    { value: 'Innovation Labs', label: 'Innovation Labs', count: 32 },
    { value: 'AI Solutions', label: 'AI Solutions', count: 28 },
    { value: 'DataTech', label: 'DataTech', count: 23 },
    { value: 'CloudFirst', label: 'CloudFirst', count: 19 },
    { value: 'StartupXYZ', label: 'StartupXYZ', count: 15 },
  ] as FilterOption[],
};

const availableSkills = mockFilterOptions.skills.map(s => s.value);

// Extended mock candidates data
const mockCandidates = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 123-4567',
    title: 'Senior Frontend Developer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    skills: ['React', 'TypeScript', 'Node.js'],
    pipelineAssociations: [
      { id: '1', name: 'Senior Frontend Dev - Q1', stage: 'Qualified' },
      { id: '2', name: 'Backend Engineer - Remote', stage: 'Contacted' },
    ],
    source: 'LinkedIn',
    lastContact: '2 days ago',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@email.com',
    phone: '+1 (555) 234-5678',
    title: 'Product Manager',
    company: 'Innovation Labs',
    location: 'New York, NY',
    skills: ['Agile', 'Product Strategy', 'Analytics'],
    pipelineAssociations: [
      { id: '3', name: 'Product Manager - NYC', stage: 'Engaged' },
    ],
    source: 'Referral',
    lastContact: '1 week ago',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    firstName: 'David',
    lastName: 'Chen',
    email: 'david.chen@email.com',
    phone: '+1 (555) 345-6789',
    title: 'Data Scientist',
    company: 'AI Solutions',
    location: 'Austin, TX',
    skills: ['Python', 'ML', 'Statistics'],
    pipelineAssociations: [
      { id: '4', name: 'Data Scientist - ML Team', stage: 'Submitted' },
      { id: '1', name: 'Senior Frontend Dev - Q1', stage: 'Sourced' },
      { id: '2', name: 'Backend Engineer - Remote', stage: 'Engaged' },
    ],
    source: 'Indeed',
    lastContact: '3 days ago',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Williams',
    email: 'emily.w@email.com',
    phone: '+1 (555) 456-7890',
    title: 'Full Stack Developer',
    company: 'CloudFirst',
    location: 'Seattle, WA',
    skills: ['React', 'Node.js', 'AWS', 'Docker'],
    pipelineAssociations: [
      { id: '2', name: 'Backend Engineer - Remote', stage: 'Qualified' },
    ],
    source: 'Career Site',
    lastContact: '5 days ago',
    createdAt: new Date('2024-01-18'),
  },
  {
    id: '5',
    firstName: 'James',
    lastName: 'Brown',
    email: 'james.brown@email.com',
    phone: '+1 (555) 567-8901',
    title: 'DevOps Engineer',
    company: 'DataTech',
    location: 'Denver, CO',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Python'],
    pipelineAssociations: [],
    source: 'AngelList',
    lastContact: 'Never',
    createdAt: new Date('2024-01-22'),
  },
];

const TalentPool = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [findDuplicatesOpen, setFindDuplicatesOpen] = useState(false);
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
    isSearching,
    setIsSearching,
  } = useCandidateSearch();

  // Fetch real data from database (will be used alongside mock data)
  const { data: dbCandidates, isLoading } = useCandidates();
  const { data: stats } = useCandidateStats();

  // Simulate search loading
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) {
      setIsSearching(true);
    } else {
      const timer = setTimeout(() => setIsSearching(false), 100);
      return () => clearTimeout(timer);
    }
  }, [debouncedSearchQuery, searchQuery, setIsSearching]);

  // Filter and sort candidates - use real database candidates
  const filteredCandidates = useMemo(() => {
    // Convert database candidates to the expected format
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
      pipelineAssociations: [] as { id: string; name: string; stage: string }[],
      source: c.source || '',
      lastContact: 'Never',
      createdAt: new Date(c.createdAt),
    }));

    let results = [...candidates];

    // Apply text search
    if (debouncedSearchQuery) {
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
      default:
        break;
    }

    return results;
  }, [dbCandidates, debouncedSearchQuery, filters, sortOption]);

  // Generate search suggestions from real candidates
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
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
  }, [searchQuery, dbCandidates]);

  const totalCandidates = dbCandidates?.length || 0;
  const snapshotMetrics = [
    { label: 'Total Candidates', value: stats?.total || totalCandidates, icon: Users },
    { label: 'New This Week', value: stats?.newThisWeek || 0, icon: CalendarPlus },
    { label: 'In Active Pipelines', value: filteredCandidates.filter(c => c.pipelineAssociations.length > 0).length, icon: GitBranch },
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Sourced': return 'bg-muted/50 text-muted-foreground border-muted';
      case 'Contacted': return 'bg-deep-sea/20 text-sky-blue border-deep-sea';
      case 'Engaged': return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
      case 'Qualified': return 'bg-sunrise/20 text-sunrise border-sunrise';
      case 'Submitted': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'Hired': return 'bg-green-600/30 text-green-300 border-green-600';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

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
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
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
                isLoading={isSearching}
              />
              
              <SortDropdown value={sortOption} onChange={setSortOption} />
              
              <SavedSearchesDropdown
                savedSearches={savedSearches}
                onSelect={applySavedSearch}
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
              onSearch={() => {}}
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
                <Button size="sm" variant="outline" className="border-sky-blue text-sky-blue">
                  Add to Pipeline
                </Button>
                <Button size="sm" variant="outline" className="border-sky-blue text-sky-blue">
                  Add to Talent Pool
                </Button>
                <Button size="sm" variant="outline" className="border-sky-blue text-sky-blue">
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
            {isLoading || isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-sky-blue" />
                <span className="ml-2 text-muted-foreground">Searching...</span>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
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
                    <TableRow key={candidate.id} className="hover:bg-sky-blue/5">
                      <TableCell>
                        <Checkbox
                          checked={selectedCandidates.includes(candidate.id)}
                          onCheckedChange={() => toggleSelectCandidate(candidate.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="text-foreground">{candidate.firstName} {candidate.lastName}</div>
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
                      <TableCell>
                        <button
                          onClick={() => handleLocationClick(candidate.location || '')}
                          className="flex items-center text-muted-foreground hover:text-sky-blue transition-colors"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {candidate.location}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.map((skill) => (
                            <Badge 
                              key={skill} 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-sky-blue/20 hover:text-sky-blue transition-colors"
                              onClick={() => handleSkillClick(skill)}
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {candidate.pipelineAssociations.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Not in pipeline</span>
                          ) : (
                            candidate.pipelineAssociations.map((pipeline) => (
                              <Badge 
                                key={`${pipeline.id}-${pipeline.name}`}
                                className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStageColor(pipeline.stage)}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePipelineClick(pipeline.name);
                                }}
                              >
                                {pipeline.name.length > 15 ? `${pipeline.name.slice(0, 15)}...` : pipeline.name}: {pipeline.stage}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{candidate.lastContact}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-sky-blue hover:bg-sky-blue/10"
                          onClick={() => navigate(`/talent/${candidate.id}`)}
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
        options={mockFilterOptions}
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
    </div>
  );
};

export default TalentPool;
