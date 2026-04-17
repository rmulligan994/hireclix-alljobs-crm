import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STARTER_TEMPLATES } from '@/data/email-starter-data';
import type { StarterTemplate } from '@/data/email-starter-data';
import { extractMergeVars } from '@/lib/email/email-utils';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface StarterLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: StarterTemplate) => void;
}

const categoryColor: Record<string, string> = {
  Sourcing: 'bg-blue-500/15 text-blue-700 border-blue-200',
  Scheduling: 'bg-green-500/15 text-green-700 border-green-200',
  Engagement: 'bg-purple-500/15 text-purple-700 border-purple-200',
  Referrals: 'bg-amber-500/15 text-amber-800 border-amber-200',
};

const FILTER_ORDER = ['All', 'Sourcing', 'Engagement', 'Scheduling', 'Referrals'] as const;

export function StarterLibraryDialog({ open, onOpenChange, onSelect }: StarterLibraryDialogProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const handleSelect = (t: StarterTemplate) => {
    onSelect(t);
    onOpenChange(false);
  };

  const filtered =
    activeCategory === 'All' ? STARTER_TEMPLATES : STARTER_TEMPLATES.filter(t => t.category === activeCategory);

  const count = (cat: string) => STARTER_TEMPLATES.filter(t => t.category === cat).length;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-[560px] max-h-[85vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'rounded-lg overflow-y-auto',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold leading-none">Starter Library</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground mt-2">
                Production-ready, cross-client email templates for recruiting workflows.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(t => {
              const vars = extractMergeVars(t.html, t.subject).slice(0, 8);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t)}
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
