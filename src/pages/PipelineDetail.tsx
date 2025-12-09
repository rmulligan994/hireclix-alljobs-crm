import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  MoreHorizontal,
  MoveRight,
  User,
  Building,
  Calendar,
} from 'lucide-react';
import { mockPipelinesWithStages, PipelineCandidate, PipelineStage } from '@/data/pipelineStages';
import { useToast } from '@/hooks/use-toast';

const PipelineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  // Find the pipeline
  const pipeline = mockPipelinesWithStages.find(p => p.id === id);
  
  const [candidates, setCandidates] = useState<PipelineCandidate[]>(
    pipeline?.candidates || []
  );

  if (!pipeline) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Pipeline not found</h2>
          <Button onClick={() => navigate('/pipelines')}>Back to Pipelines</Button>
        </div>
      </div>
    );
  }

  const stages = pipeline.stages.sort((a, b) => a.order - b.order);

  const getCandidatesInStage = (stageId: string) => {
    return candidates.filter(c => c.stageId === stageId);
  };

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData('candidateId', candidateId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('candidateId');
    moveCandidate(candidateId, targetStageId);
  };

  const moveCandidate = (candidateId: string, targetStageId: string) => {
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        const currentStage = stages.find(s => s.id === c.stageId);
        return {
          ...c,
          stageId: targetStageId,
          movedAt: new Date().toISOString().split('T')[0],
          stageHistory: [
            ...c.stageHistory,
            { 
              stageId: c.stageId, 
              stageName: currentStage?.name || '', 
              movedAt: c.movedAt 
            }
          ],
        };
      }
      return c;
    }));

    toast({
      title: 'Candidate moved',
      description: `Moved to ${targetStage.name}`,
    });
  };

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleBulkMove = (targetStageId: string) => {
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage || selectedCandidates.length === 0) return;

    setCandidates(prev => prev.map(c => {
      if (selectedCandidates.includes(c.id)) {
        const currentStage = stages.find(s => s.id === c.stageId);
        return {
          ...c,
          stageId: targetStageId,
          movedAt: new Date().toISOString().split('T')[0],
          stageHistory: [
            ...c.stageHistory,
            { 
              stageId: c.stageId, 
              stageName: currentStage?.name || '', 
              movedAt: c.movedAt 
            }
          ],
        };
      }
      return c;
    }));

    toast({
      title: 'Candidates moved',
      description: `Moved ${selectedCandidates.length} candidates to ${targetStage.name}`,
    });

    setSelectedCandidates([]);
  };

  const getStageColor = (index: number, total: number) => {
    const progress = index / (total - 1);
    if (progress === 0) return 'bg-muted/50 text-muted-foreground border-muted';
    if (progress < 0.3) return 'bg-deep-sea/20 text-sky-blue border-deep-sea';
    if (progress < 0.6) return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
    if (progress < 0.9) return 'bg-sunrise/20 text-sunrise border-sunrise';
    return 'bg-green-500/20 text-green-400 border-green-500';
  };

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar 
          onCopilotToggle={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
        />
        
        <main className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/pipelines')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  {pipeline.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {candidates.length} candidates • {stages.length} stages
                </p>
              </div>
              <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4 mr-2" />
                Edit Pipeline
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedCandidates.length > 0 && (
              <div className="flex items-center gap-4 p-3 bg-sky-blue/10 border border-sky-blue/30 rounded-lg">
                <span className="text-sm text-foreground">
                  {selectedCandidates.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-sky-blue hover:bg-sky-blue/90 text-white">
                      <MoveRight className="w-4 h-4 mr-2" />
                      Move to Stage
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border">
                    {stages.map((stage) => (
                      <DropdownMenuItem
                        key={stage.id}
                        onClick={() => handleBulkMove(stage.id)}
                        className="cursor-pointer"
                      >
                        {stage.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedCandidates([])}
                  className="text-muted-foreground"
                >
                  Clear selection
                </Button>
              </div>
            )}
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 h-full min-w-max pb-4">
              {stages.map((stage, index) => {
                const stageCandidates = getCandidatesInStage(stage.id);
                return (
                  <div
                    key={stage.id}
                    className="w-72 flex-shrink-0 flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStageColor(index, stages.length)}`}>
                          {stage.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {stageCandidates.length}
                        </span>
                      </div>
                    </div>

                    {/* Candidates List */}
                    <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                      {stageCandidates.map((candidate) => (
                        <Card
                          key={candidate.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, candidate.id)}
                          className={`bg-card border-border cursor-grab active:cursor-grabbing hover:border-sky-blue/50 transition-colors ${
                            selectedCandidates.includes(candidate.id) ? 'border-sky-blue bg-sky-blue/5' : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedCandidates.includes(candidate.id)}
                                onCheckedChange={() => handleSelectCandidate(candidate.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground text-sm truncate">
                                  {candidate.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {candidate.title}
                                </p>
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {candidate.company}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {candidate.movedAt}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card border-border">
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/talent/${candidate.id}`)}
                                    className="cursor-pointer"
                                  >
                                    View Profile
                                  </DropdownMenuItem>
                                  {stages.filter(s => s.id !== stage.id).map((targetStage) => (
                                    <DropdownMenuItem
                                      key={targetStage.id}
                                      onClick={() => moveCandidate(candidate.id, targetStage.id)}
                                      className="cursor-pointer"
                                    >
                                      Move to {targetStage.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {stageCandidates.length === 0 && (
                        <div className="h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">Drop candidates here</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};

export default PipelineDetail;
