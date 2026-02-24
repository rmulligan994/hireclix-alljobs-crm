"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { AddCandidatesToPipelineDialog } from '@/components/pipelines/AddCandidatesToPipelineDialog';
import { MoveToPipelineDialog } from '@/components/pipelines/MoveToPipelineDialog';
import { QuickNoteDialog } from '@/components/pipelines/QuickNoteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
  GitBranch,
} from 'lucide-react';
import { usePipelineWithCandidates, usePipelines, useAddCandidateToPipeline, useRemoveCandidateFromPipeline, useUpdateCandidateStage } from '@/hooks/usePipelines';
import { useCandidates } from '@/hooks/useCandidates';
import { useToast } from '@/hooks/use-toast';
import { exportCandidatesToCsv } from '@/utils/exportCandidates';
import { useCreateNote } from '@/hooks/useCommunications';
import type { Pipeline, PipelineStage } from '@/types/Pipeline';

interface CandidateInStage {
  id: string;
  candidateId: string;
  name: string;
  title: string;
  company: string;
  stageId: string;
  movedAt: string;
}

const PipelineDetail = ({ id }: { id: string }) => {
  const router = useRouter();
  const { toast } = useToast();
  const createNote = useCreateNote();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [addCandidatesOpen, setAddCandidatesOpen] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState<string[]>([]);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingCandidate, setDraggingCandidate] = useState<string | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteCandidate, setNoteCandidate] = useState<{ id: string; name: string } | null>(null);
  const [candidatesInStages, setCandidatesInStages] = useState<CandidateInStage[]>([]);
  const [moveToPipelineOpen, setMoveToPipelineOpen] = useState(false);
  const [pendingNotFitMove, setPendingNotFitMove] = useState<{ candidateIds: string[]; targetStageId: string } | null>(null);

  const { data: pipeline, isLoading } = usePipelineWithCandidates(id || '');
  const { data: allPipelines = [] } = usePipelines('active');
  const { data: allCandidates } = useCandidates();
  const addCandidateToPipeline = useAddCandidateToPipeline();
  const removeCandidateFromPipeline = useRemoveCandidateFromPipeline();
  const updateCandidateStage = useUpdateCandidateStage();

  // Build candidates with full info when pipeline and candidates are loaded
  useEffect(() => {
    if (pipeline?.candidates && allCandidates) {
      const candidatesWithInfo = pipeline.candidates.map(pc => {
        const candidate = allCandidates.find(c => c.id === pc.candidateId);
        return {
          id: pc.candidateId,
          candidateId: pc.candidateId,
          name: candidate ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() : 'Unknown',
          title: candidate?.title || '',
          company: candidate?.company || '',
          stageId: pc.stage,
          movedAt: pc.addedAt.toISOString().split('T')[0],
        };
      });
      setCandidatesInStages(candidatesWithInfo);
    }
  }, [pipeline, allCandidates]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background font-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onCopilotToggle={() => setCopilotOpen(!copilotOpen)} copilotOpen={copilotOpen} />
          <main className="flex-1 p-6">
            <div className="mb-4">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-72" />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Pipeline not found</h2>
          <p className="text-muted-foreground mb-4">The pipeline you're looking for doesn't exist or you don't have access.</p>
          <Button onClick={() => router.push('/pipelines')} className="bg-gradient-primary">Back to Pipelines</Button>
        </div>
      </div>
    );
  }

  const stages = [...(pipeline.stages || [])].sort((a, b) => a.order - b.order);

  const getCandidatesInStage = (stageId: string) => {
    return candidatesInStages.filter(c => c.stageId === stageId);
  };

  const totalCandidates = candidatesInStages.length;
  const lastStage = stages[stages.length - 1];
  const hiredCount = lastStage ? getCandidatesInStage(lastStage.id).length : 0;
  const conversionRate = totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;
  const avgDaysInPipeline = 14;

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData('candidateId', candidateId);
    setDraggingCandidate(candidateId);
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

  const isNotFitStage = (stage: PipelineStage) => stage.name?.toLowerCase().includes('not a fit');

  const performMoveToStage = async (candidateIds: string[], targetStageId: string) => {
    try {
      for (const candidateId of candidateIds) {
        await updateCandidateStage.mutateAsync({
          pipelineId: id || '',
          candidateId,
          stage: targetStageId,
        });
      }
      setCandidatesInStages(prev => prev.map(c => {
        if (candidateIds.includes(c.id)) {
          return { ...c, stageId: targetStageId, movedAt: new Date().toISOString().split('T')[0] };
        }
        return c;
      }));
      if (candidateIds.length > 1) {
        toast({ title: 'Candidates moved', description: `Moved ${candidateIds.length} candidates to stage` });
      }
      setSelectedCandidates(prev => prev.filter(id => !candidateIds.includes(id)));
    } catch {
      toast({ title: 'Failed to move candidate(s)', variant: 'destructive' });
    }
  };

  const moveCandidate = async (candidateId: string, targetStageId: string) => {
    const candidate = candidatesInStages.find(c => c.id === candidateId);
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage || !candidate || candidate.stageId === targetStageId) return;

    if (isNotFitStage(targetStage)) {
      setPendingNotFitMove({ candidateIds: [candidateId], targetStageId });
      setMoveToPipelineOpen(true);
      return;
    }

    await performMoveToStage([candidateId], targetStageId);
  };

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleBulkMove = async (targetStageId: string) => {
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage || selectedCandidates.length === 0) return;

    if (isNotFitStage(targetStage)) {
      setPendingNotFitMove({ candidateIds: [...selectedCandidates], targetStageId });
      setMoveToPipelineOpen(true);
      return;
    }

    await performMoveToStage(selectedCandidates, targetStageId);
  };

  const handleNotFitLeave = () => {
    if (!pendingNotFitMove) return;
    performMoveToStage(pendingNotFitMove.candidateIds, pendingNotFitMove.targetStageId);
    setPendingNotFitMove(null);
    setMoveToPipelineOpen(false);
  };

  const handleNotFitMoveToPipeline = async (targetPipelineId: string) => {
    if (!pendingNotFitMove || !id) return;
    const targetPipeline = allPipelines.find((p: Pipeline) => p.id === targetPipelineId);
    if (!targetPipeline?.stages?.length) {
      toast({ title: 'Target pipeline not found', variant: 'destructive' });
      return;
    }
    const notFitStage = targetPipeline.stages.find(s => s.name?.toLowerCase().includes('not a fit'));
    const targetStageId = notFitStage?.id ?? targetPipeline.stages[0]?.id;
    if (!targetStageId) return;

    try {
      for (const candidateId of pendingNotFitMove.candidateIds) {
        await removeCandidateFromPipeline.mutateAsync({ pipelineId: id, candidateId });
        await addCandidateToPipeline.mutateAsync({
          pipelineId: targetPipelineId,
          candidateId,
          stage: targetStageId,
        });
      }
      setCandidatesInStages(prev => prev.filter(c => !pendingNotFitMove.candidateIds.includes(c.id)));
      setSelectedCandidates(prev => prev.filter(id => !pendingNotFitMove.candidateIds.includes(id)));
      toast({
        title: 'Candidates moved',
        description: `Moved ${pendingNotFitMove.candidateIds.length} candidate${pendingNotFitMove.candidateIds.length !== 1 ? 's' : ''} to ${targetPipeline.name}`,
      });
    } catch {
      toast({ title: 'Failed to move candidates', variant: 'destructive' });
    }
    setPendingNotFitMove(null);
    setMoveToPipelineOpen(false);
  };

  const handleRemoveCandidate = async (candidateId: string, candidateName: string) => {
    try {
      await removeCandidateFromPipeline.mutateAsync({
        pipelineId: id || '',
        candidateId,
      });
      setCandidatesInStages(prev => prev.filter(c => c.id !== candidateId));
    } catch {
      toast({ title: 'Failed to remove candidate', variant: 'destructive' });
    }
  };

  const handleAddCandidates = async (candidateIds: string[]) => {
    const firstStageId = stages[0]?.id;
    if (!firstStageId || !allCandidates) return;

    try {
      for (const candidateId of candidateIds) {
        await addCandidateToPipeline.mutateAsync({
          pipelineId: id || '',
          candidateId,
          stage: firstStageId,
        });
      }
      
      // Update local state with full candidate info
      const candidatesToAdd: CandidateInStage[] = candidateIds.map(candidateId => {
        const candidate = allCandidates.find(c => c.id === candidateId);
        return {
          id: candidateId,
          candidateId,
          name: candidate ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() : 'Unknown',
          title: candidate?.title || '',
          company: candidate?.company || '',
          stageId: firstStageId,
          movedAt: new Date().toISOString().split('T')[0],
        };
      });
      setCandidatesInStages(prev => [...prev, ...candidatesToAdd]);
      
      toast({
        title: 'Candidates added',
        description: `Added ${candidateIds.length} candidate${candidateIds.length !== 1 ? 's' : ''} to ${pipeline?.name}`,
      });
    } catch {
      toast({ title: 'Failed to add candidates', variant: 'destructive' });
    }
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

  const handleExport = () => {
    if (!pipeline?.candidates || !allCandidates) return;
    const toExport = pipeline.candidates
      .map(pc => allCandidates.find(c => c.id === pc.candidateId))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        company: c.company,
        title: c.title,
        location: c.location,
        source: c.source,
        tags: c.tags,
        linkedinUrl: c.linkedinUrl,
        createdAt: c.createdAt,
      }));
    exportCandidatesToCsv(toExport, undefined, `pipeline-${pipeline.name.replace(/\s+/g, '-')}-export.csv`);
  };

  const handleArchivePipeline = () => {
    toast({ title: 'Pipeline archived', description: 'This pipeline has been archived' });
    router.push('/pipelines');
  };

  const getStageColor = (stage: PipelineStage, index: number, total: number) => {
    const name = stage.name?.toLowerCase() || '';
    if (name.includes('not a fit')) return 'bg-red-500/20 text-red-500 border-red-500/50';
    const progress = total > 1 ? index / (total - 1) : 0;
    if (progress === 0) return 'bg-muted/50 text-muted-foreground border-muted';
    if (progress < 0.3) return 'bg-deep-sea/20 text-sky-blue border-deep-sea';
    if (progress < 0.6) return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
    if (progress < 0.9) return 'bg-sunrise/20 text-sunrise border-sunrise';
    return 'bg-green-500/20 text-green-400 border-green-500';
  };

  const getStageBgColor = (stage: PipelineStage, index: number, total: number) => {
    const name = stage.name?.toLowerCase() || '';
    if (name.includes('not a fit')) return 'bg-red-500/10';
    const progress = total > 1 ? index / (total - 1) : 0;
    if (progress === 0) return 'bg-muted/20';
    if (progress < 0.3) return 'bg-deep-sea/10';
    if (progress < 0.6) return 'bg-sky-blue/10';
    if (progress < 0.9) return 'bg-sunrise/10';
    return 'bg-green-500/10';
  };

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onCopilotToggle={() => setCopilotOpen(!copilotOpen)} copilotOpen={copilotOpen} />
        
        <main className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.back()}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  {pipeline.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {totalCandidates} candidates • {stages.length} stages
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
                    <DropdownMenuItem onClick={handleArchivePipeline} className="cursor-pointer text-destructive">
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
                <span className="text-sm text-foreground">{selectedCandidates.length} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-sky-blue hover:bg-sky-blue/90 text-white">
                      <MoveRight className="w-4 h-4 mr-2" />
                      Move to Stage
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border">
                    {stages.map((stage) => (
                      <DropdownMenuItem key={stage.id} onClick={() => handleBulkMove(stage.id)} className="cursor-pointer">
                        {stage.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" onClick={() => setSelectedCandidates([])} className="text-muted-foreground">
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
                    className={`flex-shrink-0 flex flex-col transition-all duration-200 ${isCollapsed ? 'w-12' : 'w-72'}`}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    {/* Stage Header */}
                    <div className={`flex items-center justify-between mb-3 px-2 py-2 rounded-lg ${getStageBgColor(stage, index, stages.length)} ${isDragOver ? 'ring-2 ring-sky-blue' : ''}`}>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => toggleStageCollapse(stage.id)} className="w-full flex flex-col items-center gap-1 py-2">
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
                                {stage.name}
                              </span>
                              <Badge variant="secondary" className="text-xs px-1">{stageCandidates.length}</Badge>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{stage.name} - {stageCandidates.length} candidates</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleStageCollapse(stage.id)} className="text-muted-foreground hover:text-foreground">
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <span className="font-medium text-foreground text-sm">{stage.name}</span>
                            <Badge className={`text-xs ${getStageColor(stage, index, stages.length)}`}>{stageCandidates.length}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setAddCandidatesOpen(true)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Candidates */}
                    {!isCollapsed && (
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {stageCandidates.map((candidate) => (
                          <Card
                            key={candidate.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, candidate.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-card border-border hover:border-sky-blue/50 cursor-grab active:cursor-grabbing transition-all ${
                              draggingCandidate === candidate.id ? 'opacity-50' : ''
                            } ${selectedCandidates.includes(candidate.id) ? 'ring-2 ring-sky-blue' : ''}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={selectedCandidates.includes(candidate.id)}
                                  onCheckedChange={() => handleSelectCandidate(candidate.id)}
                                  className="mt-1 border-muted-foreground data-[state=checked]:bg-sky-blue"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-foreground text-sm truncate">{candidate.name}</span>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-card border-border">
                                        <DropdownMenuItem onClick={() => router.push(`/candidates/${candidate.candidateId}`)} className="cursor-pointer">
                                          <Eye className="w-4 h-4 mr-2" />
                                          View Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenNoteDialog(candidate)} className="cursor-pointer">
                                          <StickyNote className="w-4 h-4 mr-2" />
                                          Add Note
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-border" />
                                        <DropdownMenuItem onClick={() => handleRemoveCandidate(candidate.id, candidate.name)} className="cursor-pointer text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Remove
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  {candidate.title && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <User className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground truncate">{candidate.title}</span>
                                    </div>
                                  )}
                                  {candidate.company && (
                                    <div className="flex items-center gap-1">
                                      <Building className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground truncate">{candidate.company}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{candidate.movedAt}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {stageCandidates.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Users className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-xs text-muted-foreground">No candidates</p>
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

      <AICopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />

      <AddCandidatesToPipelineDialog
        open={addCandidatesOpen}
        onOpenChange={setAddCandidatesOpen}
        pipelineName={pipeline.name}
        existingCandidateIds={candidatesInStages.map(c => c.candidateId)}
        onAddCandidates={handleAddCandidates}
      />

      {noteCandidate && (
        <QuickNoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          candidateName={noteCandidate.name}
          onSaveNote={(content) => {
            createNote.mutate({ candidateId: noteCandidate.id, content });
          }}
        />
      )}

      <MoveToPipelineDialog
        open={moveToPipelineOpen}
        onOpenChange={(open) => {
          setMoveToPipelineOpen(open);
          if (!open) setPendingNotFitMove(null);
        }}
        currentPipelineId={id || ''}
        currentPipelineName={pipeline?.name || ''}
        candidateCount={pendingNotFitMove?.candidateIds.length ?? 0}
        onLeave={handleNotFitLeave}
        onMoveToPipeline={handleNotFitMoveToPipeline}
      />
    </div>
  );
};

export default PipelineDetail;
