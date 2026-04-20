"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function hasTagCaseInsensitive(tags: string[], label: string): boolean {
  const t = label.trim().toLowerCase();
  if (!t) return true;
  return tags.some((x) => x.toLowerCase() === t);
}

interface CandidateTagEditorProps {
  candidateId: string;
  tags: string[];
}

export function CandidateTagEditor({ candidateId, tags }: CandidateTagEditorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const updateCandidate = useUpdateCandidate();
  const { suggestions, isLoading } = useTagSuggestions(search, { limit: 25 });

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
      setOpen(false);
      setSearch("");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground mb-0">Current Tags</p>
        <Popover
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              className="bg-gradient-primary hover:opacity-90 shrink-0"
              size="sm"
              disabled={updateCandidate.isPending}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search or create a tag…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {!trimmed && <CommandEmpty>Type to search the tag catalog</CommandEmpty>}
                {trimmed && isLoading && (
                  <CommandEmpty>Searching…</CommandEmpty>
                )}
                {trimmed && !isLoading && filteredSuggestions.length === 0 && !showCreate && (
                  <CommandEmpty>No matching tags</CommandEmpty>
                )}
                <CommandGroup heading="Suggestions">
                  {showCreate && (
                    <CommandItem
                      value={`__create__${trimmed}`}
                      onSelect={() => void applyTag(trimmed)}
                    >
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
          </PopoverContent>
        </Popover>
      </div>

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
    </div>
  );
}
