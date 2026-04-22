import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { StarterTemplateGrid } from '@/components/campaigns/email/StarterTemplateGrid';
import type { StarterTemplate } from '@/data/email-starter-data';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface StarterLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: StarterTemplate) => void;
}

export function StarterLibraryDialog({ open, onOpenChange, onSelect }: StarterLibraryDialogProps) {
  const handleSelect = (t: StarterTemplate) => {
    onSelect(t);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-[560px] max-h-[85vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'rounded-lg overflow-y-auto',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold leading-none">Starter Library</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground mt-2">
                Production-ready, cross-client email templates for recruiting workflows.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <StarterTemplateGrid onSelect={handleSelect} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
