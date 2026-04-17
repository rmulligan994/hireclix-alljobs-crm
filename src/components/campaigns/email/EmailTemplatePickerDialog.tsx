'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Search } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import type { EmailTemplate } from '@/services/emailTemplateService';

export interface EmailTemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user picks a template, or null for “start from scratch”. */
  onSelect: (template: EmailTemplate | null) => void;
}

export function EmailTemplatePickerDialog({ open, onOpenChange, onSelect }: EmailTemplatePickerDialogProps) {
  const [query, setQuery] = useState('');
  const { templates, isLoading } = useEmailTemplates();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.subject?.toLowerCase().includes(q) ?? false),
    );
  }, [templates, query]);

  const pick = (t: EmailTemplate | null) => {
    onSelect(t);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle>Your templates</DialogTitle>
          <DialogDescription>
            Designs you previously saved in Clarity. Picking one replaces this email’s subject and body (same as “Load from your
            templates” in the editor).
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or subject…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 min-h-[200px] max-h-[50vh] overflow-y-auto overscroll-contain px-4 pb-2 touch-pan-y">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 pr-1 pb-4">
              <button
                type="button"
                onClick={() => pick(null)}
                className="w-full text-left rounded-lg border border-dashed border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">Start from scratch</p>
                <p className="text-xs text-muted-foreground">Empty announcement fields and HTML</p>
              </button>
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  No templates match your search.
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pick(t)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    {t.subject ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">Subject: {t.subject}</p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize">{t.category.replace(/_/g, ' ')}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t shrink-0 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
