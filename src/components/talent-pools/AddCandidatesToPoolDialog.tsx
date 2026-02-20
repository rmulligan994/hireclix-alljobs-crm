import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, User, Building, MapPin, Filter } from 'lucide-react';
import { useCandidates } from '@/hooks/useCandidates';
import { useDebounce } from '@/hooks/useDebounce';
import { parseBooleanSearch, type SearchableCandidate } from '@/utils/booleanSearchParser';
import {
  CandidateFiltersPanel,
  type CandidateFilters,
  type FilterOption,
} from '@/components/candidates/search';

interface AddCandidatesToPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolName: string;
  existingCandidateIds: string[];
  onAddCandidates: (candidateIds: string[]) => void;
}

export const AddCandidatesToPoolDialog = ({
  open,
  onOpenChange,
  poolName,
  existingCandidateIds,
  onAddCandidates,
}: AddCandidatesToPoolDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CandidateFilters>({
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
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { data: candidates, isLoading } = useCandidates();

  const availableCandidates = (candidates || []).filter(
    (c) => !existingCandidateIds.includes(c.id)
  );

  const toSearchable = (c: (typeof availableCandidates)[0]): SearchableCandidate => ({
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    email: c.email || '',
    phone: c.phone || '',
    company: c.company || '',
    title: c.title || '',
    location: c.location || '',
    skills: c.tags || [],
  });

  const filterOptions = useMemo(() => {
    const skillCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    const companyCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    availableCandidates.forEach((c) => {
      (c.tags || []).forEach((s) => skillCounts.set(s, (skillCounts.get(s) || 0) + 1));
      if (c.location) locationCounts.set(c.location, (locationCounts.get(c.location) || 0) + 1);
      if (c.company) companyCounts.set(c.company, (companyCounts.get(c.company) || 0) + 1);
      if (c.source) sourceCounts.set(c.source, (sourceCounts.get(c.source) || 0) + 1);
    });
    return {
      skills: Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: skillCounts.get(value) } as FilterOption)),
      locations: Array.from(locationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: locationCounts.get(value) } as FilterOption)),
      pipelines: [] as FilterOption[],
      pipelineStages: [] as FilterOption[],
      talentPools: [] as FilterOption[],
      sources: Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: sourceCounts.get(value) } as FilterOption)),
      companies: Array.from(companyCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value, count: companyCounts.get(value) } as FilterOption)),
    };
  }, [availableCandidates]);

  const filteredCandidates = useMemo(() => {
    let results = [...availableCandidates];

    if (debouncedSearchQuery.trim()) {
      const matcher = parseBooleanSearch(debouncedSearchQuery.trim());
      if (matcher) {
        results = results.filter((c) => matcher(toSearchable(c)));
      } else {
        const q = debouncedSearchQuery.toLowerCase();
        results = results.filter(
          (c) =>
            `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(q) ||
            (c.title || '').toLowerCase().includes(q) ||
            (c.company || '').toLowerCase().includes(q) ||
            (c.location || '').toLowerCase().includes(q) ||
            (c.tags || []).some((s) => s.toLowerCase().includes(q))
        );
      }
    }

    if (filters.skills.length > 0) {
      results = results.filter((c) =>
        filters.skills.some((skill) => (c.tags || []).includes(skill))
      );
    }
    if (filters.locations.length > 0) {
      results = results.filter((c) =>
        filters.locations.includes(c.location || '')
      );
    }
    if (filters.companies.length > 0) {
      results = results.filter((c) =>
        filters.companies.includes(c.company || '')
      );
    }
    if (filters.sources.length > 0) {
      results = results.filter((c) =>
        filters.sources.includes(c.source || '')
      );
    }

    return results;
  }, [availableCandidates, debouncedSearchQuery, filters]);

  const handleToggleCandidate = (candidateId: string) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleAddSelected = () => {
    onAddCandidates(selectedCandidates);
    setSelectedCandidates([]);
    setSearchQuery('');
    setFilters({
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
    });
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedCandidates([]);
    setSearchQuery('');
    setFilters({
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
    });
    onOpenChange(false);
  };

  const activeFilterCount =
    filters.skills.length +
    filters.locations.length +
    filters.companies.length +
    filters.sources.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-5 h-5 text-sky-blue" />
            Add Candidates to {poolName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Search and select candidates to add to this talent pool.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder='Search... Use "phrases", AND, OR, NOT, (grouping)'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-border focus:border-sky-blue"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`shrink-0 ${activeFilterCount > 0 ? 'border-sky-blue text-sky-blue' : 'border-border text-muted-foreground'}`}
            onClick={() => setIsFiltersOpen(true)}
            title="Filters"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 text-xs bg-sky-blue/20 text-sky-blue px-1.5 py-0.5 rounded">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <CandidateFiltersPanel
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          filters={filters}
          onChange={setFilters}
          options={filterOptions}
        />

        {selectedCandidates.length > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-sky-blue/10 rounded-lg">
            <span className="text-sm text-foreground">
              {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCandidates([])}
              className="text-muted-foreground text-xs"
            >
              Clear
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {availableCandidates.length === 0
                ? 'All candidates are already in this pool'
                : 'No candidates found matching your search'}
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCandidates.includes(candidate.id)
                    ? 'border-sky-blue bg-sky-blue/10'
                    : 'border-border hover:border-sky-blue/50'
                }`}
                onClick={() => handleToggleCandidate(candidate.id)}
              >
                <Checkbox
                  checked={selectedCandidates.includes(candidate.id)}
                  onCheckedChange={() => handleToggleCandidate(candidate.id)}
                  className="border-muted-foreground data-[state=checked]:bg-sky-blue data-[state=checked]:border-sky-blue"
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {`${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {candidate.title && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {candidate.title}
                      </span>
                    )}
                    {candidate.company && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {candidate.company}
                      </span>
                    )}
                    {candidate.location && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {candidate.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(candidate.tags || []).slice(0, 2).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} className="border-border">
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedCandidates.length === 0}
            className="bg-gradient-primary hover:opacity-90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add {selectedCandidates.length > 0 ? selectedCandidates.length : ''} Candidate{selectedCandidates.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
