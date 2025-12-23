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
import { FolderKanban, Loader2, CheckCircle, Plus } from 'lucide-react';
import { useTalentPools, useAddCandidateToPool } from '@/hooks/useTalentPools';

interface AddToTalentPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  existingPoolIds?: string[];
}

export const AddToTalentPoolDialog = ({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  existingPoolIds = [],
}: AddToTalentPoolDialogProps) => {
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const { data: talentPools, isLoading } = useTalentPools();
  const addCandidateToPool = useAddCandidateToPool();

  const availablePools = (talentPools || []).filter(
    pool => !existingPoolIds.includes(pool.id)
  );

  const handleAdd = async () => {
    if (!selectedPoolId) return;

    try {
      await addCandidateToPool.mutateAsync({
        poolId: selectedPoolId,
        candidateId,
      });
      setSelectedPoolId(null);
      onOpenChange(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    setSelectedPoolId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FolderKanban className="w-5 h-5 text-sky-blue" />
            Add to Talent Pool
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a talent pool to add {candidateName} to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto py-2">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </>
          ) : availablePools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {talentPools?.length === 0
                ? 'No talent pools available. Create a talent pool first.'
                : 'This candidate is already in all available talent pools.'}
            </div>
          ) : (
            availablePools.map((pool) => (
              <div
                key={pool.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPoolId === pool.id
                    ? 'border-sky-blue bg-sky-blue/10'
                    : 'border-border hover:border-sky-blue/50'
                }`}
                onClick={() => setSelectedPoolId(pool.id)}
              >
                <div>
                  <p className="font-medium text-foreground">{pool.name}</p>
                  {pool.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {pool.description}
                    </p>
                  )}
                </div>
                {selectedPoolId === pool.id && (
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
            disabled={!selectedPoolId || addCandidateToPool.isPending}
            className="bg-gradient-primary hover:opacity-90"
          >
            {addCandidateToPool.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add to Pool
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
