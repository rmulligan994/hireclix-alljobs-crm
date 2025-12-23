import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { defaultTemplates } from '@/data/pipelineStages';
import type { PipelineStage } from '@/types';

interface StageConfigEditorProps {
  stages: PipelineStage[];
  onChange: (stages: PipelineStage[]) => void;
}

export function StageConfigEditor({ stages, onChange }: StageConfigEditorProps) {
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const handleTemplateSelect = (template: typeof defaultTemplates[0]) => {
    const newStages = template.stages.map((stage, index) => ({
      id: crypto.randomUUID(),
      name: stage.name,
      order: index,
    }));
    onChange(newStages);
  };

  const handleAddStage = () => {
    const newStage: PipelineStage = {
      id: crypto.randomUUID(),
      name: 'New Stage',
      order: stages.length,
    };
    onChange([...stages, newStage]);
    setEditingStageId(newStage.id);
  };

  const handleRemoveStage = (stageId: string) => {
    if (stages.length <= 2) return; // Minimum 2 stages required
    const filtered = stages.filter(s => s.id !== stageId);
    const reordered = filtered.map((s, index) => ({ ...s, order: index }));
    onChange(reordered);
  };

  const handleMoveStage = (stageId: string, direction: 'up' | 'down') => {
    const index = stages.findIndex(s => s.id === stageId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    const reordered = newStages.map((s, i) => ({ ...s, order: i }));
    onChange(reordered);
  };

  const handleStageName = (stageId: string, name: string) => {
    onChange(stages.map(s => s.id === stageId ? { ...s, name } : s));
  };

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Start from a template</label>
        <div className="flex flex-wrap gap-2">
          {defaultTemplates.map((template) => (
            <Badge
              key={template.id}
              variant="outline"
              className="cursor-pointer hover:bg-sky-blue/10 hover:border-sky-blue hover:text-sky-blue px-3 py-1.5"
              onClick={() => handleTemplateSelect(template)}
            >
              {template.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Pipeline Stages</label>
          <span className="text-xs text-muted-foreground">Min 2 stages required</span>
        </div>
        
        <div className="space-y-2">
          {stages.sort((a, b) => a.order - b.order).map((stage, index) => (
            <Card key={stage.id} className="bg-background border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  
                  <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
                    {index + 1}
                  </Badge>

                  {editingStageId === stage.id ? (
                    <Input
                      value={stage.name}
                      onChange={(e) => handleStageName(stage.id, e.target.value)}
                      onBlur={() => setEditingStageId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingStageId(null)}
                      autoFocus
                      className="flex-1 h-8 border-sky-blue"
                    />
                  ) : (
                    <span 
                      className="flex-1 text-foreground cursor-pointer hover:text-sky-blue"
                      onClick={() => setEditingStageId(stage.id)}
                    >
                      {stage.name}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMoveStage(stage.id, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMoveStage(stage.id, 'down')}
                      disabled={index === stages.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveStage(stage.id)}
                      disabled={stages.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAddStage}
          className="w-full border-dashed border-border text-muted-foreground hover:border-sky-blue hover:text-sky-blue"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Stage
        </Button>
      </div>
    </div>
  );
}
