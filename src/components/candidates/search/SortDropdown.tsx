import { ArrowUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type SortOption = 
  | 'name_asc' 
  | 'name_desc' 
  | 'recently_added' 
  | 'oldest_first' 
  | 'last_contacted_recent' 
  | 'last_contacted_oldest'
  | 'last_updated';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'oldest_first', label: 'Oldest First' },
  { value: 'last_contacted_recent', label: 'Last Contacted (Recent)' },
  { value: 'last_contacted_oldest', label: 'Last Contacted (Oldest)' },
  { value: 'last_updated', label: 'Last Updated' },
];

export const SortDropdown = ({ value, onChange }: SortDropdownProps) => {
  const currentLabel = sortOptions.find(o => o.value === value)?.label || 'Sort';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-border text-foreground">
          <ArrowUpDown className="w-4 h-4 mr-2" />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
        {sortOptions.map(option => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              value === option.value && "text-sky-blue"
            )}
          >
            {option.label}
            {value === option.value && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
