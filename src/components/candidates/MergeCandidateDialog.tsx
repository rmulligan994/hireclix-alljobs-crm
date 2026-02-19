"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GitMerge, User, Mail, Phone, Building, Briefcase, MapPin, Tag, ArrowRight, Loader2 } from 'lucide-react';
import { useMergeCandidates, useUpdateCandidate } from '@/hooks/useCandidates';
import { communicationService } from '@/services/communicationService';
import type { Candidate } from '@/types';
import type { UpdateCandidateData } from '@/types/Candidate';

interface MergeCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCandidate: Candidate;
  /** When provided, performs full merge (reassign FKs, delete duplicate). When omitted, just updates existing with new data. */
  duplicateCandidate?: Candidate;
  newCandidateData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    location?: string;
    source?: string;
    tags?: string[];
    notes?: string;
  };
  onMergeComplete?: () => void;
}

type MergeField = 'firstName' | 'lastName' | 'email' | 'phone' | 'company' | 'title' | 'location' | 'source';

const fieldConfig: { key: MergeField; label: string; icon: React.ElementType }[] = [
  { key: 'firstName', label: 'First Name', icon: User },
  { key: 'lastName', label: 'Last Name', icon: User },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'company', label: 'Company', icon: Building },
  { key: 'title', label: 'Job Title', icon: Briefcase },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'source', label: 'Source', icon: User },
];

export function MergeCandidateDialog({
  open,
  onOpenChange,
  existingCandidate,
  duplicateCandidate,
  newCandidateData,
  onMergeComplete,
}: MergeCandidateDialogProps) {
  const router = useRouter();
  const mergeCandidates = useMergeCandidates();
  const updateCandidate = useUpdateCandidate();
  const isFullMerge = !!duplicateCandidate;

  const [selections, setSelections] = useState<Record<MergeField, 'existing' | 'new'>>(() => {
    const initial: Record<MergeField, 'existing' | 'new'> = {} as Record<MergeField, 'existing' | 'new'>;
    fieldConfig.forEach(({ key }) => {
      const existingValue = existingCandidate[key];
      const newValue = newCandidateData[key];
      initial[key] = existingValue ? 'existing' : (newValue ? 'new' : 'existing');
    });
    return initial;
  });

  const [mergeTags, setMergeTags] = useState(true);

  const handleMerge = async () => {
    const mergedData: UpdateCandidateData = {};

    fieldConfig.forEach(({ key }) => {
      const value = selections[key] === 'existing' ? existingCandidate[key] : newCandidateData[key];
      if (value !== undefined && value !== null) {
        (mergedData as Record<string, unknown>)[key] = value;
      }
    });

    if (mergeTags) {
      const existingTags = existingCandidate.tags || [];
      const newTags = newCandidateData.tags || [];
      mergedData.tags = [...new Set([...existingTags, ...newTags])];
    }

    try {
      if (isFullMerge && duplicateCandidate) {
        await mergeCandidates.mutateAsync({
          keepId: existingCandidate.id,
          removeId: duplicateCandidate.id,
          mergedData,
        });
      } else {
        await updateCandidate.mutateAsync({
          id: existingCandidate.id,
          data: mergedData,
        });
        const notesContent = newCandidateData.notes?.trim();
        if (notesContent) {
          await communicationService.createNote({
            candidateId: existingCandidate.id,
            content: notesContent,
          });
        }
      }
      onOpenChange(false);
      onMergeComplete?.();
      router.push(`/candidates/${existingCandidate.id}`);
    } catch {
      // Error is handled by the mutation (toast)
    }
  };

  const getDisplayValue = (field: MergeField, source: 'existing' | 'new') => {
    const value = source === 'existing' ? existingCandidate[field] : newCandidateData[field];
    return value || '(empty)';
  };

  const existingTags = existingCandidate.tags || [];
  const newTags = newCandidateData.tags || [];
  const combinedTags = [...new Set([...existingTags, ...newTags])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-sky-blue" />
            Merge Candidates
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select which values to keep for each field. The duplicate record will be removed.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Header Row */}
          <div className="grid grid-cols-[180px_1fr_40px_1fr] gap-4 items-center text-sm font-medium text-muted-foreground pb-2 border-b border-border">
            <div>Field</div>
            <div className="text-center">Keep (Existing)</div>
            <div></div>
            <div className="text-center">From Duplicate</div>
          </div>

          {/* Field Rows */}
          {fieldConfig.map(({ key, label, icon: Icon }) => {
            const existingValue = getDisplayValue(key, 'existing');
            const newValue = getDisplayValue(key, 'new');
            const isDifferent = existingValue !== newValue && newValue !== '(empty)' && existingValue !== '(empty)';

            return (
              <div
                key={key}
                className={`grid grid-cols-[180px_1fr_40px_1fr] gap-4 items-center py-2 ${isDifferent ? 'bg-sunrise/5 -mx-4 px-4 rounded-lg' : ''}`}
              >
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Icon className="w-4 h-4 text-sky-blue" />
                  {label}
                </div>

                <label
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selections[key] === 'existing'
                      ? 'border-sky-blue bg-sky-blue/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => setSelections((prev) => ({ ...prev, [key]: 'existing' }))}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroup value={selections[key]} className="pointer-events-none">
                      <RadioGroupItem value="existing" id={`${key}-existing`} />
                    </RadioGroup>
                    <span
                      className={`text-sm ${existingValue === '(empty)' ? 'text-muted-foreground italic' : 'text-foreground'}`}
                    >
                      {existingValue}
                    </span>
                  </div>
                </label>

                <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto" />

                <label
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selections[key] === 'new'
                      ? 'border-sky-blue bg-sky-blue/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => setSelections((prev) => ({ ...prev, [key]: 'new' }))}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroup value={selections[key]} className="pointer-events-none">
                      <RadioGroupItem value="new" id={`${key}-new`} />
                    </RadioGroup>
                    <span
                      className={`text-sm ${newValue === '(empty)' ? 'text-muted-foreground italic' : 'text-foreground'}`}
                    >
                      {newValue}
                    </span>
                  </div>
                </label>
              </div>
            );
          })}

          {/* Tags Section */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Tag className="w-4 h-4 text-sky-blue" />
              Tags & Skills
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Existing Tags</p>
                <div className="flex flex-wrap gap-1">
                  {existingTags.length > 0 ? (
                    existingTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">(none)</span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Duplicate Tags</p>
                <div className="flex flex-wrap gap-1">
                  {newTags.length > 0 ? (
                    newTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">(none)</span>
                  )}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mergeTags}
                onChange={(e) => setMergeTags(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">
                Combine all tags ({combinedTags.length} unique)
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 mt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-border text-muted-foreground hover:text-foreground"
            disabled={mergeCandidates.isPending || updateCandidate.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            className="flex-1 bg-gradient-primary hover:opacity-90"
            disabled={mergeCandidates.isPending || updateCandidate.isPending}
          >
            {(mergeCandidates.isPending || updateCandidate.isPending) ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4 mr-2" />
            )}
            Merge Candidates
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
