import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CandidateFilters } from './CandidateFiltersPanel';

interface ActiveFiltersBarProps {
  filters: CandidateFilters;
  searchQuery: string;
  totalResults: number;
  totalCandidates: number;
  onRemoveFilter: (type: keyof CandidateFilters, value: string) => void;
  onClearAll: () => void;
  onClearSearch: () => void;
}

const dateLabels: Record<string, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  last_3_months: 'Last 3 Months',
  never: 'Never Contacted',
  custom: 'Custom Range',
};

const experienceLabels: Record<string, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  lead: 'Lead/Principal',
  executive: 'Executive',
};

export const ActiveFiltersBar = ({
  filters,
  searchQuery,
  totalResults,
  totalCandidates,
  onRemoveFilter,
  onClearAll,
  onClearSearch,
}: ActiveFiltersBarProps) => {
  const hasFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== null
  );
  const hasSearch = searchQuery.length > 0;
  
  if (!hasFilters && !hasSearch) return null;

  const renderFilterBadges = () => {
    const badges: JSX.Element[] = [];

    // Search query
    if (searchQuery) {
      badges.push(
        <Badge
          key="search"
          variant="secondary"
          className="bg-sky-blue/10 text-sky-blue border-sky-blue gap-1 cursor-pointer hover:bg-sky-blue/20"
          onClick={onClearSearch}
        >
          Search: "{searchQuery}"
          <X className="w-3 h-3" />
        </Badge>
      );
    }

    // Skills
    filters.skills.forEach(skill => {
      badges.push(
        <Badge
          key={`skill-${skill}`}
          variant="secondary"
          className="bg-sunrise/10 text-sunrise border-sunrise gap-1 cursor-pointer hover:bg-sunrise/20"
          onClick={() => onRemoveFilter('skills', skill)}
        >
          {skill}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Locations
    filters.locations.forEach(loc => {
      badges.push(
        <Badge
          key={`loc-${loc}`}
          variant="secondary"
          className="bg-sunrise/10 text-sunrise border-sunrise gap-1 cursor-pointer hover:bg-sunrise/20"
          onClick={() => onRemoveFilter('locations', loc)}
        >
          {loc}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Pipelines
    filters.pipelines.forEach(p => {
      badges.push(
        <Badge
          key={`pipe-${p}`}
          variant="secondary"
          className="bg-deep-sea/30 text-sky-blue border-deep-sea gap-1 cursor-pointer hover:bg-deep-sea/40"
          onClick={() => onRemoveFilter('pipelines', p)}
        >
          Pipeline: {p === 'none' ? 'Not in any' : p}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Pipeline Stages
    filters.pipelineStages.forEach(s => {
      badges.push(
        <Badge
          key={`stage-${s}`}
          variant="secondary"
          className="bg-deep-sea/30 text-sky-blue border-deep-sea gap-1 cursor-pointer hover:bg-deep-sea/40"
          onClick={() => onRemoveFilter('pipelineStages', s)}
        >
          Stage: {s}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Talent Pools
    filters.talentPools.forEach(p => {
      badges.push(
        <Badge
          key={`pool-${p}`}
          variant="secondary"
          className="bg-muted text-foreground border-border gap-1 cursor-pointer hover:bg-muted/80"
          onClick={() => onRemoveFilter('talentPools', p)}
        >
          Pool: {p === 'none' ? 'Not in any' : p}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Sources
    filters.sources.forEach(s => {
      badges.push(
        <Badge
          key={`source-${s}`}
          variant="secondary"
          className="bg-muted text-foreground border-border gap-1 cursor-pointer hover:bg-muted/80"
          onClick={() => onRemoveFilter('sources', s)}
        >
          Source: {s}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Companies
    filters.companies.forEach(c => {
      badges.push(
        <Badge
          key={`company-${c}`}
          variant="secondary"
          className="bg-muted text-foreground border-border gap-1 cursor-pointer hover:bg-muted/80"
          onClick={() => onRemoveFilter('companies', c)}
        >
          Company: {c}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Experience Levels
    filters.experienceLevels.forEach(e => {
      badges.push(
        <Badge
          key={`exp-${e}`}
          variant="secondary"
          className="bg-muted text-foreground border-border gap-1 cursor-pointer hover:bg-muted/80"
          onClick={() => onRemoveFilter('experienceLevels', e)}
        >
          {experienceLabels[e] || e}
          <X className="w-3 h-3" />
        </Badge>
      );
    });

    // Date Added
    if (filters.dateAdded) {
      badges.push(
        <Badge
          key="dateAdded"
          variant="secondary"
          className="bg-muted text-foreground border-border gap-1 cursor-pointer hover:bg-muted/80"
          onClick={() => onRemoveFilter('dateAdded', filters.dateAdded!)}
        >
          Added: {dateLabels[filters.dateAdded] || filters.dateAdded}
          <X className="w-3 h-3" />
        </Badge>
      );
    }

    // Last Contact
    if (filters.lastContact) {
      badges.push(
        <Badge
          key="lastContact"
          variant="secondary"
          className="bg-muted text-foreground border-border gap-1 cursor-pointer hover:bg-muted/80"
          onClick={() => onRemoveFilter('lastContact', filters.lastContact!)}
        >
          Contact: {dateLabels[filters.lastContact] || filters.lastContact}
          <X className="w-3 h-3" />
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <span className="text-sm text-muted-foreground">
        Showing {totalResults.toLocaleString()} of {totalCandidates.toLocaleString()} candidates
      </span>
      <div className="h-4 w-px bg-border mx-1" />
      {renderFilterBadges()}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground text-xs ml-1"
      >
        Clear all
      </Button>
    </div>
  );
};
