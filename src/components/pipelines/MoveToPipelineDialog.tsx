"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GitBranch } from 'lucide-react';
import { usePipelines } from '@/hooks/usePipelines';
import type { Pipeline } from '@/types/Pipeline';

export type MoveToNotFitChoice = 'leave' | 'move';

interface MoveToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPipelineId: string;
  currentPipelineName: string;
  candidateCount: number;
  onLeave: () => void;
  onMoveToPipeline: (targetPipelineId: string) => void;
}

export function MoveToPipelineDialog({
  open,
  onOpenChange,
  currentPipelineId,
  currentPipelineName,
  candidateCount,
  onLeave,
  onMoveToPipeline,
}: MoveToPipelineDialogProps) {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const { data: pipelines = [] } = usePipelines('active');

  const otherPipelines = pipelines.filter((p: Pipeline) => p.id !== currentPipelineId);

  const handleLeave = () => {
    onLeave();
    setSelectedPipelineId('');
    onOpenChange(false);
  };

  const handleMove = () => {
    if (selectedPipelineId) {
      onMoveToPipeline(selectedPipelineId);
      setSelectedPipelineId('');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedPipelineId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sky-blue" />
            Move to Not A Fit
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {candidateCount === 1
              ? 'This candidate will be marked as Not A Fit. Would you like to move them to another pipeline instead?'
              : `${candidateCount} candidates will be marked as Not A Fit. Would you like to move them to another pipeline instead?`}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleLeave}
            >
              Leave in {currentPipelineName}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Or move to another pipeline:</p>
            <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a pipeline..." />
              </SelectTrigger>
              <SelectContent>
                {otherPipelines.map((p: Pipeline) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedPipelineId}
          >
            Move to {selectedPipelineId ? otherPipelines.find((p: Pipeline) => p.id === selectedPipelineId)?.name : 'Pipeline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
