import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { AddCandidatesToPipelineDialog } from '@/components/pipelines/AddCandidatesToPipelineDialog';
import { QuickNoteDialog } from '@/components/pipelines/QuickNoteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  MoreHorizontal,
  MoveRight,
  User,
  Building,
  Calendar,
  UserPlus,
  Archive,
  Download,
  StickyNote,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  Plus,
  Clock,
  TrendingUp,
  BarChart3,
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
  const [addCandidatesOpen, setAddCandidatesOpen] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState<string[]>([]);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingCandidate, setDraggingCandidate] = useState<string | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteCandidate, setNoteCandidate] = useState<{ id: string; name: string } | null>(null);

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

  // Calculate pipeline stats
  const totalCandidates = candidates.length;
  const hiredCount = getCandidatesInStage(stages[stages.length - 1]?.id || '').length;
  const conversionRate = totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;
  const avgDaysInPipeline = 14; // Mock value

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData('candidateId', candidateId);
    setDraggingCandidate(candidateId);
    // Add drag image styling
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingCandidate(null);
    setDragOverStage(null);
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('candidateId');
    moveCandidate(candidateId, targetStageId);
    setDragOverStage(null);
  };

  const moveCandidate = (candidateId: string, targetStageId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage || !candidate || candidate.stageId === targetStageId) return;

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
      title: `${candidate.name} moved to ${targetStage.name}`,
      description: 'Stage updated successfully',
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

  const handleRemoveCandidate = (candidateId: string, candidateName: string) => {
    setCandidates(prev => prev.filter(c => c.id !== candidateId));
    toast({
      title: 'Candidate removed',
      description: `${candidateName} has been removed from this pipeline`,
    });
  };

  const handleAddCandidates = (newCandidates: { id: string; name: string; title: string; company: string }[]) => {
    const firstStageId = stages[0]?.id;
    if (!firstStageId) return;

    const candidatesToAdd: PipelineCandidate[] = newCandidates.map(c => ({
      id: c.id,
      name: c.name,
      title: c.title,
      company: c.company,
      stageId: firstStageId,
      movedAt: new Date().toISOString().split('T')[0],
      stageHistory: [],
    }));

    setCandidates(prev => [...prev, ...candidatesToAdd]);
  };

  const handleOpenNoteDialog = (candidate: { id: string; name: string }) => {
    setNoteCandidate(candidate);
    setNoteDialogOpen(true);
  };

  const toggleStageCollapse = (stageId: string) => {
    setCollapsedStages(prev => 
      prev.includes(stageId) 
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const handleAddCandidateToStage = (stageId: string) => {
    // For now, just open the add candidates dialog
    setAddCandidatesOpen(true);
  };

  const handleExport = () => {
    toast({
      title: 'Export started',
      description: 'Pipeline data is being exported to CSV',
    });
  };

  const handleArchivePipeline = () => {
    toast({
      title: 'Pipeline archived',
      description: 'This pipeline has been archived',
    });
    navigate('/pipelines');
  };

  const getStageColor = (index: number, total: number) => {
    const progress = index / (total - 1);
    if (progress === 0) return 'bg-muted/50 text-muted-foreground border-muted';
    if (progress < 0.3) return 'bg-deep-sea/20 text-sky-blue border-deep-sea';
    if (progress < 0.6) return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
    if (progress < 0.9) return 'bg-sunrise/20 text-sunrise border-sunrise';
    return 'bg-green-500/20 text-green-400 border-green-500';
  };

  const getStageBgColor = (index: number, total: number) => {
    const progress = index / (total - 1);
    if (progress === 0) return 'bg-muted/20';
    if (progress < 0.3) return 'bg-deep-sea/10';
    if (progress < 0.6) return 'bg-sky-blue/10';
    if (progress < 0.9) return 'bg-sunrise/10';
    return 'bg-green-500/10';
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
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
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
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setAddCandidatesOpen(true)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Candidates
                </Button>
                <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Pipeline
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-border">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem 
                      onClick={handleArchivePipeline} 
                      className="cursor-pointer text-destructive"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Pipeline
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="p-2 rounded-lg bg-sky-blue/10">
                  <Users className="w-4 h-4 text-sky-blue" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{totalCandidates}</p>
                  <p className="text-xs text-muted-foreground">Total Candidates</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="p-2 rounded-lg bg-sunrise/10">
                  <Clock className="w-4 h-4 text-sunrise" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{avgDaysInPipeline}d</p>
                  <p className="text-xs text-muted-foreground">Avg. Time in Pipeline</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="p-2 rounded-lg bg-deep-sea/10">
                  <BarChart3 className="w-4 h-4 text-deep-sea" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{hiredCount}</p>
                  <p className="text-xs text-muted-foreground">Hired</p>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedCandidates.length > 0 && (
              <div className="flex items-center gap-4 p-3 bg-sky-blue/10 border border-sky-blue/30 rounded-lg animate-fade-in">
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
                const isCollapsed = collapsedStages.includes(stage.id);
                const isDragOver = dragOverStage === stage.id;
                
                return (
                  <div
                    key={stage.id}
                    className={`flex-shrink-0 flex flex-col transition-all duration-200 ${
                      isCollapsed ? 'w-12' : 'w-72'
                    }`}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    {/* Stage Header */}
                    <div 
                      className={`flex items-center justify-between mb-3 px-2 py-2 rounded-lg ${getStageBgColor(index, stages.length)} ${
                        isDragOver ? 'ring-2 ring-sky-blue' : ''
                      }`}
                    >
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleStageCollapse(stage.id)}
                              className="w-full flex flex-col items-center gap-1 py-2"
                            >
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
                                {stage.name}
                              </span>
                              <Badge variant="secondary" className="text-xs px-1">
                                {stageCandidates.length}
                              </Badge>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{stage.name} - {stageCandidates.length} candidates</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleStageCollapse(stage.id)}>
                              <ChevronDown className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </button>
                            <Badge className={getStageColor(index, stages.length)}>
                              {stage.name}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {stageCandidates.length}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Candidates List */}
                    {!isCollapsed && (
                      <div className={`flex-1 space-y-2 overflow-y-auto pr-1 transition-all ${
                        isDragOver ? 'bg-sky-blue/5 rounded-lg p-2 -m-2' : ''
                      }`}>
                        {stageCandidates.map((candidate) => (
                          <Card
                            key={candidate.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, candidate.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => navigate(`/talent/${candidate.id}`)}
                            className={`bg-card border-border cursor-pointer hover:border-sky-blue/50 transition-all ${
                              selectedCandidates.includes(candidate.id) ? 'border-sky-blue bg-sky-blue/5' : ''
                            } ${draggingCandidate === candidate.id ? 'opacity-50 scale-95 shadow-lg' : ''}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedCandidates.includes(candidate.id)}
                                  onCheckedChange={() => handleSelectCandidate(candidate.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground text-sm truncate hover:text-sky-blue transition-colors">
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
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card border-border w-48">
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/talent/${candidate.id}`);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border" />
                                    <DropdownMenuItem className="cursor-pointer p-0">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger className="flex items-center w-full px-2 py-1.5">
                                          <MoveRight className="w-4 h-4 mr-2" />
                                          Move to Stage
                                          <ChevronRight className="w-4 h-4 ml-auto" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent side="right" className="bg-card border-border">
                                          {stages.filter(s => s.id !== stage.id).map((targetStage) => (
                                            <DropdownMenuItem
                                              key={targetStage.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                moveCandidate(candidate.id, targetStage.id);
                                              }}
                                              className="cursor-pointer"
                                            >
                                              {targetStage.name}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenNoteDialog({ id: candidate.id, name: candidate.name });
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <StickyNote className="w-4 h-4 mr-2" />
                                      Add Note
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border" />
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveCandidate(candidate.id, candidate.name);
                                      }}
                                      className="cursor-pointer text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Remove from Pipeline
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Add Candidate to Stage Button */}
                        <Button
                          variant="ghost"
                          onClick={() => handleAddCandidateToStage(stage.id)}
                          className="w-full h-10 border-2 border-dashed border-border hover:border-sky-blue hover:text-sky-blue text-muted-foreground"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Candidate
                        </Button>

                        {stageCandidates.length === 0 && (
                          <div className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                            isDragOver ? 'border-sky-blue bg-sky-blue/10' : 'border-border'
                          }`}>
                            <p className="text-xs text-muted-foreground">
                              {isDragOver ? 'Drop here' : 'Drag candidates here'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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

      <AddCandidatesToPipelineDialog
        open={addCandidatesOpen}
        onOpenChange={setAddCandidatesOpen}
        pipelineName={pipeline.title}
        existingCandidateIds={candidates.map(c => c.id)}
        onAddCandidates={handleAddCandidates}
      />

      {noteCandidate && (
        <QuickNoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          candidateName={noteCandidate.name}
          onSaveNote={(note) => {
            // In a real app, save the note to the candidate
            console.log('Note saved:', note);
          }}
        />
      )}
    </div>
  );
};

export default PipelineDetail;
