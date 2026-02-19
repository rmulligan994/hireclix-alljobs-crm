"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Loader2 } from "lucide-react";
import { usePipelines, useAddCandidatesToPipeline } from "@/hooks/usePipelines";

interface BulkAddToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateIds: string[];
  onComplete?: () => void;
}

export function BulkAddToPipelineDialog({
  open,
  onOpenChange,
  candidateIds,
  onComplete,
}: BulkAddToPipelineDialogProps) {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const { data: pipelines, isLoading } = usePipelines("active");
  const addCandidates = useAddCandidatesToPipeline();

  const handleAdd = async () => {
    if (!selectedPipelineId || candidateIds.length === 0) return;
    try {
      await addCandidates.mutateAsync({ pipelineId: selectedPipelineId, candidateIds });
      setSelectedPipelineId(null);
      onOpenChange(false);
      onComplete?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSelectedPipelineId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sky-blue" />
            Add to Pipeline
          </DialogTitle>
          <DialogDescription>
            Choose a pipeline to add {candidateIds.length} selected candidate{candidateIds.length !== 1 ? "s" : ""} to.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[280px]">
          <div className="space-y-2 pr-4">
            {isLoading ? (
              <div className="py-4 text-sm text-muted-foreground text-center">Loading pipelines…</div>
            ) : (pipelines?.length ?? 0) === 0 ? (
              <div className="py-4 text-sm text-muted-foreground text-center">No active pipelines</div>
            ) : (
              pipelines?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPipelineId === p.id
                      ? "border-sky-blue bg-sky-blue/10"
                      : "border-border hover:border-sky-blue/50"
                  }`}
                >
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-border">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedPipelineId || addCandidates.isPending}
            className="bg-sky-blue hover:bg-sky-blue/90"
          >
            {addCandidates.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <GitBranch className="w-4 h-4 mr-2" />
            )}
            Add to Pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
