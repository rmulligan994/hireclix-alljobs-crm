"use client";

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface CampaignSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const CampaignSearchBar = ({
  value,
  onChange,
  placeholder = 'Search campaigns by name, type...',
  debounceMs = 300,
}: CampaignSearchBarProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    (val: string) => {
      const timer = setTimeout(() => onChange(val), debounceMs);
      return () => clearTimeout(timer);
    },
    [onChange, debounceMs]
  );

  useEffect(() => {
    if (localValue === value) return;
    const cleanup = debouncedOnChange(localValue);
    return cleanup;
  }, [localValue, debounceMs]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
