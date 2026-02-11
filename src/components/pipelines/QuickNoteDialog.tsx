import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';

interface QuickNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onSaveNote: (note: string) => void;
}

export function QuickNoteDialog({
  open,
  onOpenChange,
  candidateName,
  onSaveNote,
}: QuickNoteDialogProps) {
  const [note, setNote] = useState('');

  const handleSave = () => {
    if (!note.trim()) return;

    onSaveNote(note.trim());
    setNote('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-foreground flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-sky-blue" />
            Add Note for {candidateName}
          </DialogTitle>
        </DialogHeader>

        <Textarea
          placeholder="Enter your note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[120px] border-border focus:border-sky-blue resize-none"
          autoFocus
        />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!note.trim()}
            className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
          >
            Save Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
