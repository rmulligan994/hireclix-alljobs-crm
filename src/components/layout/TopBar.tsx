'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, MessageSquare, HelpCircle, Brain, Loader2, Users, GitBranch, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import {
  searchGlobalSuggestions,
  SUGGESTION_MIN_CHARS,
  type GlobalSearchResults,
} from '@/services/globalSearchService';

interface TopBarProps {
  onCopilotToggle?: () => void;
  copilotOpen?: boolean;
}

export const TopBar = ({ onCopilotToggle, copilotOpen }: TopBarProps) => {
  const router = useRouter();
  const [globalQuery, setGlobalQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(globalQuery.trim()), 280);
    return () => clearTimeout(t);
  }, [globalQuery]);

  useEffect(() => {
    if (debouncedQuery.length < SUGGESTION_MIN_CHARS) {
      setResults(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setResults(null);
    searchGlobalSuggestions(debouncedQuery)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPanelOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const runGlobalSearch = useCallback(() => {
    const q = globalQuery.trim();
    if (!q) return;
    setPanelOpen(false);
    router.push(`/talent?q=${encodeURIComponent(q)}`);
  }, [globalQuery, router]);

  const goCandidate = (id: string) => {
    setGlobalQuery('');
    setPanelOpen(false);
    router.push(`/talent/${id}`);
  };

  const goPipeline = (id: string) => {
    setGlobalQuery('');
    setPanelOpen(false);
    router.push(`/pipelines/${id}`);
  };

  const goCampaign = (id: string) => {
    setGlobalQuery('');
    setPanelOpen(false);
    router.push(`/campaigns?open=${encodeURIComponent(id)}`);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setPanelOpen(true);
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setPanelOpen(false), 180);
  };

  const showSuggestions =
    panelOpen &&
    globalQuery.trim().length >= SUGGESTION_MIN_CHARS &&
    (loading || results !== null);

  const hasAnyHit =
    results &&
    (results.candidates.length > 0 ||
      results.pipelines.length > 0 ||
      results.campaigns.length > 0);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div ref={wrapRef} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-[1]" />
            <Input
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runGlobalSearch();
                }
              }}
              placeholder="Search campaigns, pipelines, candidates…"
              title="Type at least two characters. Campaigns and pipelines use fuzzy name matching; candidates use full-text search. Enter opens Candidates with your query."
              className="pl-10 bg-background border-border font-body"
              aria-label="Global search"
              aria-expanded={showSuggestions}
              aria-controls="global-search-suggestions"
              autoComplete="off"
            />

            {showSuggestions && (
              <div
                id="global-search-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-lg max-h-[min(70vh,420px)] overflow-y-auto"
              >
                {loading && (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    Searching…
                  </div>
                )}

                {!loading && results && !hasAnyHit && (
                  <div className="px-3 py-3 text-sm text-muted-foreground">No matches for that query.</div>
                )}

                {!loading && results && hasAnyHit && (
                  <div className="py-2">
                    {results.campaigns.length > 0 && (
                      <div className="mb-1">
                        <div className="px-3 pb-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          Campaigns
                        </div>
                        {results.campaigns.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            role="option"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goCampaign(c.id)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {results.pipelines.length > 0 && (
                      <div className="mb-1">
                        <div className="px-3 pb-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5" />
                          Pipelines
                        </div>
                        {results.pipelines.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            role="option"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goPipeline(p.id)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {results.candidates.length > 0 && (
                      <div>
                        <div className="px-3 pb-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Candidates
                        </div>
                        {results.candidates.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            role="option"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goCandidate(c.id)}
                          >
                            <div className="font-medium truncate">{c.label}</div>
                            {c.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">{c.subtitle}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* AI Copilot Button - Prominent */}
          <Button 
            onClick={onCopilotToggle}
            className={`
              flex items-center gap-2 px-4 py-2 font-medium transition-all duration-200
              ${copilotOpen 
                ? 'bg-sunrise text-neutral-charcoal hover:bg-sunrise/90' 
                : 'bg-gradient-to-r from-sunrise to-sky-blue text-white hover:opacity-90'
              }
            `}
          >
            <Brain className="w-5 h-5" />
            <span className="hidden sm:inline">AI Copilot</span>
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground relative">
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-sunrise rounded-full"></span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
