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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FolderPlus, Loader2 } from 'lucide-react';
import { useCreateTalentPool } from '@/hooks/useTalentPools';

interface CreateTalentPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTalentPoolDialog = ({
  open,
  onOpenChange,
}: CreateTalentPoolDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createTalentPool = useCreateTalentPool();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createTalentPool.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FolderPlus className="w-5 h-5 text-sky-blue" />
            Create Talent Pool
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new talent pool to organize and segment candidates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Pool Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Senior Engineers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border focus:border-sky-blue"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
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
              disabled={!name.trim() || createTalentPool.isPending}
              className="bg-gradient-primary hover:opacity-90"
            >
              {createTalentPool.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Pool
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
