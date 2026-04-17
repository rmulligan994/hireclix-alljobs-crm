import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type {
  EmailMappingSlot,
  EmailRegionAssignments,
  PrepareRegionMappingResult,
  RegionCandidate,
} from '@/lib/email/email-region-detection';
import { applyEmailRegionAssignments } from '@/lib/email/email-region-detection';

type NonBodySlot = Exclude<EmailMappingSlot, 'body'>;
const NON_BODY_SLOTS: NonBodySlot[] = ['eyebrow', 'headline', 'subheadline', 'cta', 'signoff'];

const SLOT_LABELS: Record<EmailMappingSlot, string> = {
  eyebrow: 'Eyebrow / label',
  headline: 'Headline',
  subheadline: 'Subheadline',
  body: 'Body',
  cta: 'CTA (link + label)',
  signoff: 'Sign-off',
};

export interface RegionMappingReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prepare: PrepareRegionMappingResult | null;
  onConfirm: (finalHtml: string) => void;
}

export function RegionMappingReviewDialog({ open, onOpenChange, prepare, onConfirm }: RegionMappingReviewDialogProps) {
  const [slotMap, setSlotMap] = useState<Partial<Record<NonBodySlot, string>>>({});
  const [bodyCandIds, setBodyCandIds] = useState<string[]>([]);
  const [locked, setLocked] = useState<Set<string>>(() => new Set());

  const candidates = useMemo(() => prepare?.candidates ?? [], [prepare]);

  useEffect(() => {
    if (open && prepare) {
      const d = prepare.defaultSlots;
      const rest: Partial<Record<NonBodySlot, string>> = {};
      for (const s of NON_BODY_SLOTS) {
        const v = d[s];
        if (v) rest[s] = v;
      }
      setSlotMap(rest);
      const b = d.body;
      setBodyCandIds(b == null ? [] : Array.isArray(b) ? [...b] : [b]);
      setLocked(new Set(prepare.defaultLocked));
    }
  }, [open, prepare]);

  const sortBodyIds = (ids: string[]) => {
    const order = new Map(candidates.map((c, i) => [c.id, i]));
    return [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  };

  const toggleLock = (id: string) => {
    setLocked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setSlotMap(s => {
          const out = { ...s };
          for (const slot of NON_BODY_SLOTS) {
            if (out[slot] === id) delete out[slot];
          }
          return out;
        });
        setBodyCandIds(ids => ids.filter(x => x !== id));
      }
      return next;
    });
  };

  const setNonBodySlot = (slot: NonBodySlot, candId: string) => {
    if (!candId) {
      setSlotMap(s => {
        const out = { ...s };
        delete out[slot];
        return out;
      });
      return;
    }
    setBodyCandIds(ids => ids.filter(x => x !== candId));
    setLocked(l => {
      const n = new Set(l);
      n.delete(candId);
      return n;
    });
    setSlotMap(s => {
      const out = { ...s };
      for (const k of NON_BODY_SLOTS) {
        if (out[k] === candId && k !== slot) delete out[k];
      }
      out[slot] = candId;
      return out;
    });
  };

  const toggleBody = (id: string) => {
    if (locked.has(id)) return;
    if (NON_BODY_SLOTS.some(s => slotMap[s] === id)) return;
    setBodyCandIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      return sortBodyIds(next);
    });
  };

  const ctaCandId = slotMap.cta;
  const ctaInvalid = useMemo(() => {
    if (!ctaCandId) return false;
    const c = candidates.find(x => x.id === ctaCandId);
    return Boolean(c && c.tagName !== 'a');
  }, [ctaCandId, candidates]);

  const candForNonBodySlot = (slot: NonBodySlot) => {
    const id = slotMap[slot];
    return candidates.find(c => c.id === id);
  };

  const firstBodyCand = useMemo(() => {
    if (bodyCandIds.length === 0) return undefined;
    return candidates.find(c => c.id === bodyCandIds[0]);
  }, [bodyCandIds, candidates]);

  const confidenceBadge = (c: RegionCandidate | undefined) => {
    if (!c) return null;
    const variant = c.confidence === 'high' ? 'default' : c.confidence === 'medium' ? 'secondary' : 'outline';
    return (
      <Badge variant={variant} className="text-[10px] font-normal">
        {c.confidence} confidence
      </Badge>
    );
  };

  const buildAssignments = (): EmailRegionAssignments => ({
    ...slotMap,
    body: bodyCandIds.length > 0 ? bodyCandIds : undefined,
  });

  const handleConfirm = () => {
    if (!prepare || ctaInvalid) return;
    const finalHtml = applyEmailRegionAssignments(prepare.taggedHtml, buildAssignments(), [...locked]);
    onConfirm(finalHtml);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Region mapping review</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Connect each form field to a block in your HTML. Locked blocks stay as-is in the template and are not edited from the form. Skipped
          fields leave that part of the design unchanged.
        </p>
        <div className="space-y-4 py-2">
          {NON_BODY_SLOTS.map(slot => (
            <div key={slot} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-foreground">{SLOT_LABELS[slot]}</Label>
                {confidenceBadge(candForNonBodySlot(slot))}
              </div>
              <select
                className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                value={slotMap[slot] ?? ''}
                onChange={e => setNonBodySlot(slot, e.target.value)}
              >
                <option value="">— Skip —</option>
                {candidates.map(c => {
                  const usedElsewhere = NON_BODY_SLOTS.some(s => s !== slot && slotMap[s] === c.id);
                  const inBody = bodyCandIds.includes(c.id);
                  const isLocked = locked.has(c.id);
                  const disabled = isLocked || inBody || (usedElsewhere && slotMap[slot] !== c.id);
                  return (
                    <option key={c.id} value={c.id} disabled={disabled}>
                      [{c.tagName}] {c.textPreview}
                    </option>
                  );
                })}
              </select>
              {slot === 'cta' && ctaInvalid && (
                <p className="text-xs text-amber-600">Choose an anchor (&lt;a&gt;) for the CTA so the button URL field can map to href.</p>
              )}
            </div>
          ))}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-foreground">{SLOT_LABELS.body}</Label>
              {confidenceBadge(firstBodyCand)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Select one or more blocks to merge into the <strong className="text-foreground">Body</strong> field (lists, intro copy, bullets,
              follow-up lines). Blocks stay in order. Prefer pieces from the same column or section—merging across distant table cells can shift
              the layout.
            </p>
            {bodyCandIds.length >= 2 && (
              <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded px-2 py-1">
                {bodyCandIds.length} blocks will be wrapped into one editable body region.
              </p>
            )}
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2 bg-muted/15">
              {candidates.map(c => {
                const inBody = bodyCandIds.includes(c.id);
                const usedOther = NON_BODY_SLOTS.some(s => slotMap[s] === c.id);
                const isLocked = locked.has(c.id);
                const disabled = isLocked || usedOther;
                return (
                  <label
                    key={c.id}
                    className={`flex items-start gap-2 text-xs cursor-pointer select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <input type="checkbox" className="mt-0.5" checked={inBody} disabled={disabled} onChange={() => toggleBody(c.id)} />
                    <span className="font-mono text-[10px] shrink-0 text-muted-foreground">{c.tagName}</span>
                    <span className="text-foreground/90">{c.textPreview}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground tracking-wide">LOCK STATIC BLOCKS</p>
            <p className="text-[11px] text-muted-foreground">
              Use for legal footers, unsubscribe lines, or any text that should not follow the form.
            </p>
            <div className="max-h-44 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
              {candidates.map(c => (
                <label key={c.id} className="flex items-start gap-2 text-xs cursor-pointer select-none">
                  <input type="checkbox" className="mt-0.5" checked={locked.has(c.id)} onChange={() => toggleLock(c.id)} />
                  <span className="font-mono text-[10px] shrink-0 text-muted-foreground">{c.tagName}</span>
                  <span className="text-foreground/90">{c.textPreview}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!prepare || ctaInvalid}>
            Confirm mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
