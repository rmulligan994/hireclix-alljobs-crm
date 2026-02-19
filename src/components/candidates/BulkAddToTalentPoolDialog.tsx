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
import { Users, Loader2 } from "lucide-react";
import { useTalentPools, useAddCandidatesToPool } from "@/hooks/useTalentPools";

interface BulkAddToTalentPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateIds: string[];
  onComplete?: () => void;
}

export function BulkAddToTalentPoolDialog({
  open,
  onOpenChange,
  candidateIds,
  onComplete,
}: BulkAddToTalentPoolDialogProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const { data: pools, isLoading } = useTalentPools();
  const addCandidates = useAddCandidatesToPool();

  const handleAdd = async () => {
    if (!selectedPoolId || candidateIds.length === 0) return;
    try {
      await addCandidates.mutateAsync({ poolId: selectedPoolId, candidateIds });
      setSelectedPoolId(null);
      onOpenChange(false);
      onComplete?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSelectedPoolId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-blue" />
            Add to Talent Pool
          </DialogTitle>
          <DialogDescription>
            Choose a talent pool to add {candidateIds.length} selected candidate{candidateIds.length !== 1 ? "s" : ""} to.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[280px]">
          <div className="space-y-2 pr-4">
            {isLoading ? (
              <div className="py-4 text-sm text-muted-foreground text-center">Loading pools…</div>
            ) : (pools?.length ?? 0) === 0 ? (
              <div className="py-4 text-sm text-muted-foreground text-center">No talent pools</div>
            ) : (
              pools?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPoolId(p.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPoolId === p.id
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
            disabled={!selectedPoolId || addCandidates.isPending}
            className="bg-sky-blue hover:bg-sky-blue/90"
          >
            {addCandidates.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            Add to Pool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
