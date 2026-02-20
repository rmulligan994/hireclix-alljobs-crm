import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settings, Loader2 } from 'lucide-react';
import { useUpdateTalentPool } from '@/hooks/useTalentPools';
import type { TalentPool } from '@/types/TalentPool';

interface EditTalentPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool: TalentPool | null;
}

export const EditTalentPoolDialog = ({
  open,
  onOpenChange,
  pool,
}: EditTalentPoolDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const updateTalentPool = useUpdateTalentPool();

  useEffect(() => {
    if (pool) {
      setName(pool.name);
      setDescription(pool.description || '');
    }
  }, [pool, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pool || !name.trim()) return;

    try {
      await updateTalentPool.mutateAsync({
        id: pool.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      onOpenChange(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    if (pool) {
      setName(pool.name);
      setDescription(pool.description || '');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Settings className="w-5 h-5 text-sky-blue" />
            Edit Talent Pool
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update the name and description of this talent pool.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-foreground">
              Pool Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="e.g., Senior Engineers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border focus:border-sky-blue"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-foreground">
              Description
            </Label>
            <Textarea
              id="edit-description"
              placeholder="Describe this talent pool..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-border focus:border-sky-blue resize-none"
              rows={3}
            />
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
              type="submit"
              disabled={!name.trim() || updateTalentPool.isPending}
              className="bg-gradient-primary hover:opacity-90"
            >
              {updateTalentPool.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
