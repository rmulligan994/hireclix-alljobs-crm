import { useState } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface CandidateFilters {
  skills: string[];
  locations: string[];
  pipelines: string[];
  pipelineStages: string[];
  talentPools: string[];
  sources: string[];
  companies: string[];
  experienceLevels: string[];
  dateAdded: string | null;
  lastContact: string | null;
}

interface CandidateFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CandidateFilters;
  onChange: (filters: CandidateFilters) => void;
  options: {
    skills: FilterOption[];
    locations: FilterOption[];
    pipelines: FilterOption[];
    pipelineStages: FilterOption[];
    talentPools: FilterOption[];
    sources: FilterOption[];
    companies: FilterOption[];
  };
  selectedPipeline?: string;
}

const datePresets = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' },
];

const experienceLevels = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead/Principal' },
  { value: 'executive', label: 'Executive' },
];

const lastContactPresets = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'never', label: 'Never Contacted' },
  { value: 'custom', label: 'Custom Range' },
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection = ({ title, children, defaultOpen = true }: FilterSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b border-border pb-4">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-sky-blue">
        {title}
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface MultiSelectFilterProps {
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  placeholder?: string;
}

const MultiSelectFilter = ({ options, selected, onChange, searchable = true, placeholder = "Search..." }: MultiSelectFilterProps) => {
  const [search, setSearch] = useState('');
  
  const filteredOptions = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="h-8 pl-7 text-sm bg-background"
          />
        </div>
      )}
      <ScrollArea className="h-40">
        <div className="space-y-1">
          {filteredOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => toggleOption(option.value)}
              />
              <span className="text-sm text-foreground flex-1">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-xs text-muted-foreground">({option.count})</span>
              )}
            </label>
          ))}
          {filteredOptions.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No options found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export const CandidateFiltersPanel = ({
  isOpen,
  onClose,
  filters,
  onChange,
  options,
  selectedPipeline,
}: CandidateFiltersPanelProps) => {
  const updateFilter = <K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onChange({
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-card border-l border-border shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Filters</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground text-xs">
            Clear All
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Sections */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Skills */}
          <FilterSection title="Skills">
            <MultiSelectFilter
              options={options.skills}
              selected={filters.skills}
              onChange={v => updateFilter('skills', v)}
              placeholder="Search skills..."
            />
          </FilterSection>

          {/* Location */}
          <FilterSection title="Location">
            <MultiSelectFilter
              options={options.locations}
              selected={filters.locations}
              onChange={v => updateFilter('locations', v)}
              placeholder="Search locations..."
            />
          </FilterSection>

          {/* Pipeline */}
          <FilterSection title="Pipeline">
            <MultiSelectFilter
              options={[
                { value: 'none', label: 'Not in any pipeline' },
                ...options.pipelines
              ]}
              selected={filters.pipelines}
              onChange={v => updateFilter('pipelines', v)}
              placeholder="Search pipelines..."
            />
          </FilterSection>

          {/* Pipeline Stage - only shows when pipeline selected */}
          {filters.pipelines.length > 0 && filters.pipelines[0] !== 'none' && (
            <FilterSection title="Pipeline Stage">
              <MultiSelectFilter
                options={options.pipelineStages}
                selected={filters.pipelineStages}
                onChange={v => updateFilter('pipelineStages', v)}
                searchable={false}
              />
            </FilterSection>
          )}

          {/* Talent Pool */}
          <FilterSection title="Talent Pool">
            <MultiSelectFilter
              options={[
                { value: 'none', label: 'Not in any pool' },
                ...options.talentPools
              ]}
              selected={filters.talentPools}
              onChange={v => updateFilter('talentPools', v)}
              placeholder="Search pools..."
            />
          </FilterSection>

          {/* Source */}
          <FilterSection title="Source">
            <MultiSelectFilter
              options={options.sources}
              selected={filters.sources}
              onChange={v => updateFilter('sources', v)}
              searchable={false}
            />
          </FilterSection>

          {/* Company */}
          <FilterSection title="Company">
            <MultiSelectFilter
              options={options.companies}
              selected={filters.companies}
              onChange={v => updateFilter('companies', v)}
              placeholder="Search companies..."
            />
          </FilterSection>

          {/* Experience Level */}
          <FilterSection title="Experience Level">
            <div className="space-y-1">
              {experienceLevels.map(level => (
                <label
                  key={level.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.experienceLevels.includes(level.value)}
                    onCheckedChange={() => {
                      if (filters.experienceLevels.includes(level.value)) {
                        updateFilter('experienceLevels', filters.experienceLevels.filter(v => v !== level.value));
                      } else {
                        updateFilter('experienceLevels', [...filters.experienceLevels, level.value]);
                      }
                    }}
                  />
                  <span className="text-sm text-foreground">{level.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Date Added */}
          <FilterSection title="Date Added">
            <div className="space-y-1">
              {datePresets.map(preset => (
                <label
                  key={preset.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.dateAdded === preset.value}
                    onCheckedChange={() => {
                      updateFilter('dateAdded', filters.dateAdded === preset.value ? null : preset.value);
                    }}
                  />
                  <span className="text-sm text-foreground">{preset.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Last Contact */}
          <FilterSection title="Last Contact">
            <div className="space-y-1">
              {lastContactPresets.map(preset => (
                <label
                  key={preset.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.lastContact === preset.value}
                    onCheckedChange={() => {
                      updateFilter('lastContact', filters.lastContact === preset.value ? null : preset.value);
                    }}
                  />
                  <span className="text-sm text-foreground">{preset.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button onClick={onClose} className="w-full bg-sky-blue hover:bg-sky-blue/90 text-white">
          Apply Filters
        </Button>
      </div>
    </div>
  );
};
