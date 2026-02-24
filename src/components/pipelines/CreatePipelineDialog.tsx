"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GitBranch, Settings, CheckCircle, Loader2 } from 'lucide-react';
import { StageConfigEditor } from './StageConfigEditor';
import { defaultTemplates } from '@/data/pipelineStages';
import { useCreatePipeline } from '@/hooks/usePipelines';
import type { PipelineStage } from '@/types';

interface CreatePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPipelineCreated?: (pipeline: any) => void;
}

export function CreatePipelineDialog({ open, onOpenChange, onPipelineCreated }: CreatePipelineDialogProps) {
  const router = useRouter();
  const createPipeline = useCreatePipeline();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState<PipelineStage[]>(() => 
    defaultTemplates[0].stages.map((stage, index) => ({
      id: crypto.randomUUID(),
      name: stage.name,
      order: index,
      color: stage.color,
    }))
  );

  const isValid = title.trim().length > 0 && stages.length >= 2;

  const handleCreate = async () => {
    if (!isValid) return;

    try {
      const createdPipeline = await createPipeline.mutateAsync({
        name: title.trim(),
        description: description.trim() || undefined,
        stages: stages.sort((a, b) => a.order - b.order),
      });

      onPipelineCreated?.(createdPipeline);
      onOpenChange(false);
      resetForm();
      router.push(`/pipelines/${createdPipeline.id}`);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStages(defaultTemplates[0].stages.map((stage, index) => ({
      id: crypto.randomUUID(),
      name: stage.name,
      order: index,
      color: stage.color,
    })));
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sky-blue" />
            Create Pipeline
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Set up a new recruitment pipeline with custom stages
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">
                Pipeline Name <span className="text-sunrise">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior Frontend Developer - Q1 2024"
                className="border-border focus:border-sky-blue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-muted-foreground">
                Description <span className="text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this pipeline..."
                className="border-border focus:border-sky-blue min-h-[60px] resize-none"
              />
            </div>
          </div>

          {/* Stage Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings className="w-4 h-4 text-sky-blue" />
              Configure Stages
            </div>
            <StageConfigEditor stages={stages} onChange={setStages} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!isValid || createPipeline.isPending}
              className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
            >
              {createPipeline.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {createPipeline.isPending ? 'Creating...' : 'Create Pipeline'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
