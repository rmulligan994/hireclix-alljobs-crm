"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Brain, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useUpdateCandidate } from "@/hooks/useCandidates";
import { useTagSuggestions } from "@/hooks/useTagSuggestions";
import { tagCatalogService } from "@/services/tagCatalogService";
import { resumeService } from "@/services";
import { cn } from "@/lib/utils";

function hasTagCaseInsensitive(tags: string[], label: string): boolean {
  const t = label.trim().toLowerCase();
  if (!t) return true;
  return tags.some((x) => x.toLowerCase() === t);
}

const AI_SUGGEST_CAP = 25;
const EXCLUDE_TAGS_CAP = 80;

function uniqueLabelList(labels: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const t = raw.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/** Merge incoming AI tags with existing suggestions; dedupe case-insensitively; skip tags already on candidate. */
function mergeAiResumeTags(prev: string[], incoming: string[], candidateTags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t || hasTagCaseInsensitive(candidateTags, t)) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const t of prev) push(t);
  for (const t of incoming) push(t);
  return out.slice(0, AI_SUGGEST_CAP);
}

interface CandidateTagEditorProps {
  candidateId: string;
  tags: string[];
  /** When set, Add Tag opens a wide dialog with this content on the right (e.g. resume preview). */
  resumePreviewSlot?: ReactNode;
  /** Fires when the Add Tag dialog opens or closes (only when `resumePreviewSlot` is set). */
  onTagModalOpenChange?: (open: boolean) => void;
  /** Primary (or chosen) resume ID for “Suggest from resume (AI)” — PDF only on the server. */
  suggestTagsResumeId?: string | null;
}

export function CandidateTagEditor({
  candidateId,
  tags,
  resumePreviewSlot,
  onTagModalOpenChange,
  suggestTagsResumeId,
}: CandidateTagEditorProps) {
  const useDualPane = Boolean(resumePreviewSlot);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [aiResumeTags, setAiResumeTags] = useState<string[]>([]);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const aiResumeTagsRef = useRef<string[]>([]);
  const suggestRequestSeq = useRef(0);
  const updateCandidate = useUpdateCandidate();
  const { suggestions, isLoading } = useTagSuggestions(search, { limit: 25 });

  useEffect(() => {
    aiResumeTagsRef.current = aiResumeTags;
  }, [aiResumeTags]);

  useEffect(() => {
    setAiResumeTags([]);
    aiResumeTagsRef.current = [];
  }, [suggestTagsResumeId, candidateId]);

  const trimmed = search.trim();
  const filteredSuggestions = suggestions.filter((s) => !hasTagCaseInsensitive(tags, s));
  const showCreate =
    trimmed.length > 0 &&
    !hasTagCaseInsensitive(tags, trimmed) &&
    !filteredSuggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  const applyTag = async (label: string) => {
    const t = label.trim();
    if (!t || hasTagCaseInsensitive(tags, t)) return;
    try {
      await tagCatalogService.ensureTagName(t);
      await updateCandidate.mutateAsync({
        id: candidateId,
        data: { tags: [...tags, t] },
        silent: true,
      });
      setAiResumeTags((prev) => prev.filter((x) => x.toLowerCase() !== t.toLowerCase()));
      if (useDualPane) {
        setSearch("");
      } else {
        setPopoverOpen(false);
        setSearch("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeTag = async (tag: string) => {
    try {
      await updateCandidate.mutateAsync({
        id: candidateId,
        data: { tags: tags.filter((x) => x !== tag) },
        silent: true,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const tagSearchCommand = (
    <Command shouldFilter={false} className="rounded-md border border-border">
      <CommandInput
        placeholder="Search or create a tag…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[220px]">
        {!trimmed && <CommandEmpty>Type to search the tag catalog</CommandEmpty>}
        {trimmed && isLoading && <CommandEmpty>Searching…</CommandEmpty>}
        {trimmed && !isLoading && filteredSuggestions.length === 0 && !showCreate && (
          <CommandEmpty>No matching tags</CommandEmpty>
        )}
        <CommandGroup heading="Suggestions">
          {suggestTagsResumeId ? (
            <div className="px-1 pb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
                disabled={aiSuggestLoading || updateCandidate.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void (async () => {
                    const seq = ++suggestRequestSeq.current;
                    setAiSuggestLoading(true);
                    try {
                      const excludeTags = uniqueLabelList([...tags, ...aiResumeTagsRef.current], EXCLUDE_TAGS_CAP);
                      const next = await resumeService.suggestTagsFromResume(suggestTagsResumeId, {
                        excludeTags,
                      });
                      if (seq !== suggestRequestSeq.current) return;

                      const filtered = next.filter((tag) => !hasTagCaseInsensitive(tags, tag));
                      const prev = aiResumeTagsRef.current;
                      const merged = mergeAiResumeTags(prev, filtered, tags);
                      const prevLower = new Set(prev.map((t) => t.toLowerCase()));
                      const newlyAdded = filtered.filter((t) => !prevLower.has(t.toLowerCase())).length;

                      setAiResumeTags(merged);
                      aiResumeTagsRef.current = merged;

                      if (next.length === 0) {
                        toast.message("No tags returned — try again or add tags manually.");
                      } else if (filtered.length === 0) {
                        toast.message("Suggested tags are already on this candidate.");
                      } else if (newlyAdded === 0) {
                        toast.message(
                          "No new tags this run — they’re already in your AI suggestion list. Click again for a fresh model pass or add tags below.",
                        );
                      } else {
                        toast.success(
                          `${newlyAdded} new suggestion(s) from resume (${merged.length} total in list — click to add).`,
                        );
                      }
                    } catch (err) {
                      if (seq === suggestRequestSeq.current) {
                        toast.error(err instanceof Error ? err.message : "Could not suggest tags");
                      }
                    } finally {
                      if (seq === suggestRequestSeq.current) setAiSuggestLoading(false);
                    }
                  })();
                }}
              >
                <Brain className="h-3.5 w-3.5 shrink-0 text-sky-blue" aria-hidden />
                {aiSuggestLoading ? "Reading resume…" : "Suggest from resume (AI)"}
              </Button>
            </div>
          ) : null}
          {aiResumeTags
            .filter((name) => !hasTagCaseInsensitive(tags, name))
            .map((name) => (
              <CommandItem
                key={`ai-${name}`}
                value={`__ai__${name}`}
                onSelect={() => void applyTag(name)}
              >
                <span className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 shrink-0 text-sky-blue" aria-hidden />
                  {name}
                </span>
              </CommandItem>
            ))}
          {showCreate && (
            <CommandItem value={`__create__${trimmed}`} onSelect={() => void applyTag(trimmed)}>
              Create &quot;{trimmed}&quot;
            </CommandItem>
          )}
          {!isLoading &&
            filteredSuggestions.map((name) => (
              <CommandItem key={name} value={name} onSelect={() => void applyTag(name)}>
                {name}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const tagBadges = (
    <div className="flex flex-wrap gap-2">
      {tags && tags.length > 0 ? (
        tags.map((tag) => (
          <Badge
            key={tag}
            className="bg-sky-blue/20 text-sky-blue border-sky-blue px-3 py-1 gap-1 pr-1"
          >
            <span>{tag}</span>
            <button
              type="button"
              className="ml-1 rounded-sm p-0.5 hover:bg-sky-blue hover:text-white focus:outline-none focus:ring-1 focus:ring-sky-blue"
              aria-label={`Remove tag ${tag}`}
              disabled={updateCandidate.isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void removeTag(tag);
              }}
            >
              <span className="sr-only">Remove</span>
              <X className="w-3 h-3" aria-hidden />
            </button>
          </Badge>
        ))
      ) : (
        <p className="text-sm text-muted-foreground italic">No tags assigned</p>
      )}
    </div>
  );

  const addTagButton = (
    <Button
      type="button"
      className="bg-gradient-primary hover:opacity-90 shrink-0"
      size="sm"
      disabled={updateCandidate.isPending}
      onClick={() => {
        if (useDualPane) {
          setDialogOpen(true);
        }
      }}
    >
      <Plus className="w-4 h-4 mr-1" />
      Add Tag
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground mb-0">Current Tags</p>
        {useDualPane ? (
          addTagButton
        ) : (
          <Popover
            open={popoverOpen}
            onOpenChange={(v) => {
              setPopoverOpen(v);
              if (!v) setSearch("");
            }}
          >
            <PopoverTrigger asChild>{addTagButton}</PopoverTrigger>
            <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="end">
              {tagSearchCommand}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {tagBadges}

      {useDualPane && resumePreviewSlot && (
        <Dialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            onTagModalOpenChange?.(v);
            if (!v) setSearch("");
          }}
        >
          <DialogContent
            className={cn(
              "flex max-h-[90vh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg",
              "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            )}
          >
            <DialogHeader className="border-b border-border px-6 py-4 text-left">
              <DialogTitle>Tags &amp; resume</DialogTitle>
              <DialogDescription>
                Add or remove tags while viewing the candidate resume.
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Current tags</p>
                  {tagBadges}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Add a tag</p>
                  {tagSearchCommand}
                </div>
              </div>
              <div className="flex min-h-[50vh] flex-col p-6 lg:min-h-0 lg:flex-1">
                {resumePreviewSlot}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
