import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Loader2, CheckCircle } from 'lucide-react';
import { usePipelines, useAddCandidateToPipeline } from '@/hooks/usePipelines';

interface AddToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
}

export const AddToPipelineDialog = ({
  open,
  onOpenChange,
  candidateId,
  candidateName,
}: AddToPipelineDialogProps) => {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const { data: pipelines, isLoading } = usePipelines('active');
  const addCandidateToPipeline = useAddCandidateToPipeline();

  const handleAdd = async () => {
    if (!selectedPipelineId) return;

    const pipeline = pipelines?.find(p => p.id === selectedPipelineId);
    const firstStage = pipeline?.stages?.[0]?.id;

    if (!firstStage) return;

    try {
      await addCandidateToPipeline.mutateAsync({
        pipelineId: selectedPipelineId,
        candidateId,
        stage: firstStage,
      });
      setSelectedPipelineId(null);
      onOpenChange(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    setSelectedPipelineId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <GitBranch className="w-5 h-5 text-sky-blue" />
            Add to Pipeline
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a pipeline to add {candidateName} to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto py-2">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </>
          ) : pipelines?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active pipelines available. Create a pipeline first.
            </div>
          ) : (
            pipelines?.map((pipeline) => (
              <div
                key={pipeline.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPipelineId === pipeline.id
                    ? 'border-sky-blue bg-sky-blue/10'
                    : 'border-border hover:border-sky-blue/50'
                }`}
                onClick={() => setSelectedPipelineId(pipeline.id)}
              >
                <div>
                  <p className="font-medium text-foreground">{pipeline.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pipeline.stages?.length || 0} stages
                  </p>
                </div>
                {selectedPipelineId === pipeline.id && (
                  <CheckCircle className="w-5 h-5 text-sky-blue" />
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-border text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedPipelineId || addCandidateToPipeline.isPending}
            className="bg-gradient-primary hover:opacity-90"
          >
            {addCandidateToPipeline.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <GitBranch className="w-4 h-4 mr-2" />
                Add to Pipeline
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
