import { useState, useRef, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, X, Clock, Users, Building2, Tag, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  type: 'recent' | 'candidate' | 'company' | 'skill';
  value: string;
  subtext?: string;
}

interface CandidateSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onAdvancedSearchToggle: () => void;
  isAdvancedOpen: boolean;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  isLoading?: boolean;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
}

export const CandidateSearchBar = ({
  value,
  onChange,
  onAdvancedSearchToggle,
  isAdvancedOpen,
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  onSuggestionSelect,
}: CandidateSearchBarProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync from parent when parent sets value (saved search, clear, etc.) - not when we're typing
  useEffect(() => {
    if (value !== inputValue && (value === '' || !inputValue.startsWith(value) || value.length > inputValue.length)) {
      setInputValue(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps -- inputValue intentionally excluded to avoid overwriting while typing

  // Debounce parent updates so parent doesn't re-render on every keystroke (fixes input lag)
  const debouncedInputValue = useDebounce(inputValue, 300);
  useEffect(() => {
    if (debouncedInputValue !== value) {
      onChange(debouncedInputValue);
    }
  }, [debouncedInputValue]); // eslint-disable-line react-hooks/exhaustive-deps -- onChange stable, value intentionally excluded

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  }, []);

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.value);
    onChange(suggestion.value);
    setShowSuggestions(false);
    onSuggestionSelect?.(suggestion);
  };

  const groupedSuggestions = {
    recent: suggestions.filter(s => s.type === 'recent'),
    candidates: suggestions.filter(s => s.type === 'candidate'),
    companies: suggestions.filter(s => s.type === 'company'),
    skills: suggestions.filter(s => s.type === 'skill'),
  };

  const getIconForType = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent': return Clock;
      case 'candidate': return Users;
      case 'company': return Building2;
      case 'skill': return Tag;
    }
  };

  const showDropdown = showSuggestions && (inputValue.length > 0 || recentSearches.length > 0);

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className={cn(
        "relative flex items-center transition-all duration-200",
        isFocused && "ring-2 ring-sky-blue/30 rounded-lg"
      )}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder='Search candidates... Use "phrases", AND, OR, NOT, (grouping)'
          className="pl-10 pr-24 border-border focus:border-sky-blue bg-background h-11"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdvancedSearchToggle}
            className={cn(
              "text-xs h-7 px-2",
              isAdvancedOpen ? "text-sky-blue" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Advanced
            <ChevronRight className={cn(
              "w-3 h-3 ml-1 transition-transform",
              isAdvancedOpen && "rotate-90"
            )} />
          </Button>
        </div>
        
        {isLoading && (
          <div className="absolute right-24 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-sky-blue/30 border-t-sky-blue rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* Recent Searches */}
          {inputValue.length === 0 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground uppercase tracking-wide">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {recentSearches.slice(0, 5).map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputValue(search);
                    onChange(search);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-md text-sm text-foreground flex items-center gap-2"
                >
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Search Suggestions */}
          {inputValue.length > 0 && (
            <>
              {groupedSuggestions.candidates.length > 0 && (
                <div className="p-2 border-b border-border">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground uppercase tracking-wide">
                    <Users className="w-3 h-3" />
                    Candidates
                  </div>
                  {groupedSuggestions.candidates.slice(0, 5).map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-md"
                    >
                      <div className="text-sm text-foreground">{s.value}</div>
                      {s.subtext && <div className="text-xs text-muted-foreground">{s.subtext}</div>}
                    </button>
                  ))}
                </div>
              )}

              {groupedSuggestions.companies.length > 0 && (
                <div className="p-2 border-b border-border">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground uppercase tracking-wide">
                    <Building2 className="w-3 h-3" />
                    Companies
                  </div>
                  {groupedSuggestions.companies.slice(0, 5).map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-md text-sm text-foreground"
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              )}

              {groupedSuggestions.skills.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground uppercase tracking-wide">
                    <Tag className="w-3 h-3" />
                    Skills
                  </div>
                  {groupedSuggestions.skills.slice(0, 5).map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-md text-sm text-foreground"
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              )}

              {suggestions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No suggestions found
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
