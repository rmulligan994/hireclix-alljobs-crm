"use client";

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useCreateCommunication } from '@/hooks/useCommunications';
import type { CommunicationType, CommunicationDirection } from '@/types/Communication';
import { format } from 'date-fns';

const COMMUNICATION_TYPES: { value: CommunicationType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Phone Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'message', label: 'Message' },
];

const DIRECTIONS: { value: CommunicationDirection; label: string }[] = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
];

interface LogCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  onSuccess?: () => void;
}

export function LogCommunicationDialog({
  open,
  onOpenChange,
  candidateId,
  onSuccess,
}: LogCommunicationDialogProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [type, setType] = useState<CommunicationType>('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [direction, setDirection] = useState<CommunicationDirection>('outbound');
  const [date, setDate] = useState(today);

  const createCommunication = useCreateCommunication();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createCommunication.mutate(
      {
        candidateId,
        type,
        subject: subject.trim() || undefined,
        content: content.trim(),
        direction,
        occurredAt: new Date(date),
      },
      {
        onSuccess: () => {
          setSubject('');
          setContent('');
          setDirection('outbound');
          setDate(format(new Date(), 'yyyy-MM-dd'));
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const handleClose = () => {
    setType('email');
    setSubject('');
    setContent('');
    setDirection('outbound');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) handleClose();
    else onOpenChange(true);
  };

  const isSubmitting = createCommunication.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-blue" />
            Log Communication
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Record an email, call, meeting, or message with this candidate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-muted-foreground">
              Type
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as CommunicationType)}>
              <SelectTrigger id="type" className="border-border focus:border-sky-blue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction" className="text-muted-foreground">
              Direction
            </Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as CommunicationDirection)}>
              <SelectTrigger id="direction" className="border-border focus:border-sky-blue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-muted-foreground">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-border focus:border-sky-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-muted-foreground">
              Subject <span className="text-xs">(Optional)</span>
            </Label>
            <Input
              id="subject"
              placeholder="e.g. Follow-up on interview"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-border focus:border-sky-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-muted-foreground">
              Content <span className="text-sunrise">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Details of the communication..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] border-border focus:border-sky-blue resize-none"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="bg-gradient-primary hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging...
                </>
              ) : (
                'Log Communication'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
