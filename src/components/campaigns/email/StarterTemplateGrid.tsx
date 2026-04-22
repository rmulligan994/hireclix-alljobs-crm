import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { STARTER_TEMPLATES } from '@/data/email-starter-data';
import type { StarterTemplate } from '@/data/email-starter-data';
import { extractMergeVars } from '@/lib/email/email-utils';
import { cn } from '@/lib/utils';

const categoryColor: Record<string, string> = {
  Sourcing: 'bg-blue-500/15 text-blue-700 border-blue-200',
  Scheduling: 'bg-green-500/15 text-green-700 border-green-200',
  Engagement: 'bg-purple-500/15 text-purple-700 border-purple-200',
  Referrals: 'bg-amber-500/15 text-amber-800 border-amber-200',
};

const FILTER_ORDER = ['All', 'Sourcing', 'Engagement', 'Scheduling', 'Referrals'] as const;

export interface StarterTemplateGridProps {
  onSelect: (template: StarterTemplate) => void;
  className?: string;
  /** When false, hides the Sourcing/Engagement chip row (e.g. parent uses primary Starter / custom / category tabs). */
  showSourcingChips?: boolean;
  /** Optional: filter by name, description, or subject. */
  searchQuery?: string;
}

export function StarterTemplateGrid({
  onSelect,
  className,
  showSourcingChips = true,
  searchQuery = '',
}: StarterTemplateGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const searchLower = searchQuery.trim().toLowerCase();

  const fromCategory = useMemo(() => {
    return activeCategory === 'All' ? STARTER_TEMPLATES : STARTER_TEMPLATES.filter(t => t.category === activeCategory);
  }, [activeCategory]);

  const filtered = useMemo(() => {
    if (!searchLower) return fromCategory;
    return fromCategory.filter(
      t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.subject.toLowerCase().includes(searchLower),
    );
  }, [fromCategory, searchLower]);

  const count = (cat: string) => STARTER_TEMPLATES.filter(t => t.category === cat).length;

  return (
    <div className={cn('space-y-3', className)}>
      {showSourcingChips && (
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {FILTER_ORDER.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
              )}
            >
              {cat}
              {cat !== 'All' && <span className="ml-1 opacity-70">({count(cat)})</span>}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(t => {
          const vars = extractMergeVars(t.html, t.subject).slice(0, 8);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className="group text-left border rounded-lg overflow-hidden cursor-pointer hover:border-primary/60 hover:shadow-md transition-all bg-card"
            >
              <div className="h-36 overflow-hidden bg-white relative border-b">
                <iframe
                  srcDoc={t.html}
                  className="w-full h-full border-0 pointer-events-none"
                  title={t.name}
                  sandbox=""
                  style={{ transform: 'scale(0.42)', transformOrigin: 'top left', width: '238%', height: '238%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{t.name}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', categoryColor[t.category] || '')}>
                    {t.category}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                <p className="text-xs text-muted-foreground/80 truncate italic">Subject: {t.subject}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {vars.map(v => (
                    <span
                      key={v}
                      className="text-[10px] px-1.5 py-0 rounded bg-muted text-muted-foreground font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No built-in templates match this search.</p>
      )}
    </div>
  );
}
