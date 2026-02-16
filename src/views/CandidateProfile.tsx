"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { AddToPipelineDialog } from '@/components/candidates/AddToPipelineDialog';
import { AddToTalentPoolDialog } from '@/components/candidates/AddToTalentPoolDialog';
import { LogCommunicationDialog } from '@/components/candidates/LogCommunicationDialog';
import { QuickNoteDialog } from '@/components/pipelines/QuickNoteDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Tag,
  FileText,
  StickyNote,
  Clock,
  Plus,
  RefreshCw,
  X,
  Eye,
  Download,
  Upload,
  ExternalLink,
  PhoneCall,
  Send,
  Calendar,
  GitBranch,
  FolderKanban,
  ChevronRight,
  Archive,
  ChevronDown,
  AlertCircle,
  MoreHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UploadResumeDialog } from '@/components/candidates/UploadResumeDialog';
import { useCandidateWithAssociations } from '@/hooks/useCandidates';
import { useCandidateListContext } from '@/contexts/CandidateListContext';
import { useNotes, useCreateNote, useCommunications } from '@/hooks/useCommunications';
import { useResumes, useUploadResume, useSetPrimaryResume, useDeleteResume } from '@/hooks/useResumes';
import { resumeService } from '@/services';
import { format } from 'date-fns';
import { toast } from 'sonner';

const CandidateProfile = ({ id }: { id: string }) => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [archivedPipelinesOpen, setArchivedPipelinesOpen] = useState(false);
  const [addToPipelineOpen, setAddToPipelineOpen] = useState(false);
  const [addToPoolOpen, setAddToPoolOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [logCommOpen, setLogCommOpen] = useState(false);
  const [uploadResumeOpen, setUploadResumeOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resumeToDelete, setResumeToDelete] = useState<{ id: string; fileName: string } | null>(null);

  // Fetch real candidate data
  const { data: candidate, isLoading, error } = useCandidateWithAssociations(id || '');

  // Notes
  const { data: notes = [], isLoading: notesLoading } = useNotes(id || '');
  const createNote = useCreateNote();

  // Communications
  const { data: communications = [], isLoading: communicationsLoading } = useCommunications(id || '');

  // Resumes
  const { data: resumes = [], isLoading: resumesLoading } = useResumes(id || '');
  const uploadResume = useUploadResume(id || '');
  const setPrimaryResume = useSetPrimaryResume(id || '');
  const deleteResume = useDeleteResume(id || '');
  const primaryResume = resumes.find((r) => r.isPrimary) ?? resumes[0];

  // Candidate list navigation
  const { getNextCandidateId, getPreviousCandidateId, getCurrentIndex, getTotalCount } = useCandidateListContext();
  const currentIndex = id ? getCurrentIndex(id) : -1;
  const totalCount = getTotalCount();
  const nextCandidateId = id ? getNextCandidateId(id) : null;
  const previousCandidateId = id ? getPreviousCandidateId(id) : null;
  const hasListContext = currentIndex !== -1 && totalCount > 0;

  // Placeholder data for features not yet connected to DB
  const aiSummary = candidate ? [
    `${candidate.title || 'Professional'} ${candidate.company ? `at ${candidate.company}` : ''}`,
    candidate.location ? `Located in ${candidate.location}` : 'Location not specified',
    candidate.tags?.length ? `Skills: ${candidate.tags.slice(0, 3).join(', ')}` : 'No skills listed yet',
  ] : [];

  const handleViewResume = async (resumeId: string) => {
    try {
      const blob = await resumeService.getFileBlob(resumeId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to open resume');
    }
  };

  const handleDownloadResume = async (resumeId: string, fileName: string) => {
    try {
      const blob = await resumeService.getFileBlob(resumeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to download resume');
    }
  };

  const handlePreviewResume = async (resumeId: string) => {
    try {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      const blob = await resumeService.getFileBlob(resumeId);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load preview');
    }
  };

  const handleClosePreview = () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const getCommIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'call': return <PhoneCall className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'message': return <Send className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getCommBadgeStyle = (type: string) => {
    switch (type) {
      case 'email': return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
      case 'call': return 'bg-sunrise/20 text-sunrise border-sunrise';
      case 'meeting': return 'bg-deep-sea/50 text-sky-blue border-deep-sea';
      case 'message': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCommLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Email';
      case 'call': return 'Phone Call';
      case 'meeting': return 'Meeting';
      case 'message': return 'Message';
      default: return type;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Sourced': return 'bg-muted/50 text-muted-foreground';
      case 'Contacted': return 'bg-deep-sea/20 text-sky-blue';
      case 'Engaged': return 'bg-sky-blue/20 text-sky-blue';
      case 'Qualified': return 'bg-sunrise/20 text-sunrise';
      case 'Submitted': return 'bg-green-500/20 text-green-400';
      case 'Hired': return 'bg-green-600/30 text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const getFullName = (firstName?: string | null, lastName?: string | null) => {
    return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Candidate';
  };

  const handleNavigateNext = () => {
    if (nextCandidateId) {
      router.push(`/candidates/${nextCandidateId}`);
    }
  };

  const handleNavigatePrevious = () => {
    if (previousCandidateId) {
      router.push(`/candidates/${previousCandidateId}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background font-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onCopilotToggle={() => setCopilotOpen(!copilotOpen)} copilotOpen={copilotOpen} />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-start gap-4 mb-6">
              <Skeleton className="h-9 w-20" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !candidate) {
    return (
      <div className="flex h-screen bg-background font-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onCopilotToggle={() => setCopilotOpen(!copilotOpen)} copilotOpen={copilotOpen} />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-start gap-4 mb-6">
              <Button variant="outline" size="sm" onClick={() => router.back()} className="border-border text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Candidate Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  {error ? `Error: ${error.message}` : 'The candidate you are looking for does not exist or you do not have access.'}
                </p>
                <Button onClick={() => router.push('/talent')} className="bg-gradient-primary">
                  View All Candidates
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

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

        <main className="flex-1 p-6 overflow-y-auto">
          {/* Back Button & Page Title & Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-start gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  Candidate Profile
                </h1>
                <p className="text-sm text-muted-foreground">
                  View and manage candidate information
                  {hasListContext && ` • ${currentIndex + 1} of ${totalCount}`}
                </p>
              </div>
            </div>
            {hasListContext && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNavigatePrevious}
                  disabled={!previousCandidateId}
                  className="border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNavigateNext}
                  disabled={!nextCandidateId}
                  className="border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* Candidate Header Card */}
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                      {getInitials(candidate.firstName, candidate.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-sky-blue mb-2">
                      {getFullName(candidate.firstName, candidate.lastName)}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {candidate.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {candidate.email}
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {candidate.phone}
                        </div>
                      )}
                      {candidate.source && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Source: {candidate.source}
                        </div>
                      )}
                    </div>
                    {(candidate.title || candidate.company) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {candidate.title}{candidate.title && candidate.company ? ' at ' : ''}{candidate.company}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Added: {format(candidate.createdAt, 'M/d/yyyy')}</p>
                  <p>Updated: {format(candidate.updatedAt, 'M/d/yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI-Generated Summary - Full Width */}
          <Card className="mb-6 bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sky-blue">
                  <Sparkles className="w-5 h-5" />
                  AI-Generated Summary
                </CardTitle>
                <span className="text-xs text-muted-foreground">AI Powered</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {aiSummary.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-foreground">
                    <span className="w-2 h-2 rounded-full bg-sky-blue mt-2 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pipelines & Talent Pools - Full Width */}
          <Card className="mb-6 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sky-blue">
                  <GitBranch className="w-5 h-5" />
                  Pipelines & Talent Pools
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-border text-muted-foreground hover:text-foreground"
                    onClick={() => setAddToPipelineOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Pipeline
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-border text-muted-foreground hover:text-foreground"
                    onClick={() => setAddToPoolOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Talent Pool
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Pipelines */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Active Pipelines
                </h4>
                {candidate.pipelines && candidate.pipelines.length > 0 ? (
                  <div className="space-y-2">
                    {candidate.pipelines.map((pipeline) => (
                      <div 
                        key={pipeline.pipelineId}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-sky-blue/50 cursor-pointer transition-colors group"
                        onClick={() => router.push(`/pipelines/${pipeline.pipelineId}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium group-hover:text-sky-blue transition-colors">
                              {pipeline.pipelineName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Added: {format(pipeline.addedAt, 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStageColor(pipeline.stage)}>
                            {pipeline.stage}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-blue" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not in any pipelines yet</p>
                )}
              </div>

              {/* Talent Pools */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Talent Pools
                </h4>
                {candidate.talentPools && candidate.talentPools.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {candidate.talentPools.map((pool) => (
                      <Badge 
                        key={pool.poolId}
                        variant="outline"
                        className="border-sky-blue text-sky-blue hover:bg-sky-blue/10 cursor-pointer px-3 py-1"
                        onClick={() => router.push(`/talent-pools/${pool.poolId}`)}
                      >
                        {pool.poolName}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not in any talent pools yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags & Skills - Full Width */}
          <Card className="mb-6 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sky-blue">
                  <Tag className="w-5 h-5" />
                  Tags & Skills
                </CardTitle>
                <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Tag
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Tags</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.tags && candidate.tags.length > 0 ? (
                    candidate.tags.map((tag) => (
                      <Badge key={tag} className="bg-sky-blue/20 text-sky-blue border-sky-blue px-3 py-1">
                        {tag}
                        <button className="ml-2 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No tags assigned</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Versions + Recruiter Notes - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Resume Versions */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sky-blue">
                    <FileText className="w-5 h-5" />
                    Resume Versions
                    <Badge variant="secondary" className="ml-1">{resumes.length}</Badge>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                    onClick={() => setUploadResumeOpen(true)}
                    disabled={!id}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {resumesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : resumes.length === 0 ? (
                  <div className="p-6 border border-dashed border-border rounded-lg text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No resumes uploaded yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setUploadResumeOpen(true)}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Upload Resume
                    </Button>
                  </div>
                ) : (
                  <>
                    {resumes.map((resume) => (
                      <div
                        key={resume.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-sky-blue/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-foreground font-medium block truncate">{resume.fileName}</span>
                            <span className="text-xs text-muted-foreground">
                              v{resume.version} · {format(resume.uploadedAt, 'MMM d, yyyy')}
                              {resume.fileSize && ` · ${(resume.fileSize / 1024).toFixed(1)} KB`}
                            </span>
                          </div>
                          {resume.isPrimary && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">Primary</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handlePreviewResume(resume.id)}
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleViewResume(resume.id)}
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDownloadResume(resume.id, resume.fileName)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!resume.isPrimary && (
                                <DropdownMenuItem onClick={() => setPrimaryResume.mutate(resume.id)}>
                                  <Star className="w-4 h-4 mr-2" />
                                  Set as primary
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setResumeToDelete({ id: resume.id, fileName: resume.fileName })}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-muted-foreground hover:text-foreground"
                        onClick={() => setUploadResumeOpen(true)}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Upload New Version
                      </Button>
                      {primaryResume && (
                        <Button
                          className="bg-gradient-primary hover:opacity-90"
                          size="sm"
                          onClick={() => handleViewResume(primaryResume.id)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open Primary in New Tab
                        </Button>
                      )}
                    </div>

                    {previewUrl && (
                      <div className="mt-4 border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                          <span className="text-sm font-medium">Preview</span>
                          <Button variant="ghost" size="sm" onClick={handleClosePreview}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <iframe
                          src={previewUrl}
                          className="w-full h-96"
                          title="Resume preview"
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recruiter Notes */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sky-blue">
                    <StickyNote className="w-5 h-5" />
                    Recruiter Notes
                    {notes.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{notes.length}</Badge>
                    )}
                  </CardTitle>
                  <Button
                    className="bg-gradient-primary hover:opacity-90"
                    size="sm"
                    onClick={() => setAddNoteOpen(true)}
                    disabled={!id}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-3/4" />
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4">No notes yet. Add a note to track your thoughts about this candidate.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto pr-1">
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div key={note.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <StickyNote className="w-3 h-3" />
                            {format(note.createdAt, 'MMM d, yyyy')}
                          </div>
                          <div className="max-h-20 overflow-y-auto overflow-x-hidden">
                            <p className="text-foreground text-sm whitespace-pre-wrap">{note.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Communication History - Full Width */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sky-blue">
                  <Clock className="w-5 h-5" />
                  Communication History
                  {communications.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{communications.length}</Badge>
                  )}
                </CardTitle>
                <Button
                  className="bg-gradient-primary hover:opacity-90"
                  size="sm"
                  onClick={() => setLogCommOpen(true)}
                  disabled={!id}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Log Communication
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {communicationsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-3/4" />
                </div>
              ) : communications.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4">
                  No communications yet. Log an email, call, meeting, or message to track your interactions.
                </p>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm, idx) => (
                    <div key={comm.id} className="relative pl-8 pb-4 border-b border-border last:border-0 last:pb-0">
                      {idx < communications.length - 1 && (
                        <div className="absolute left-3 top-6 w-0.5 h-[calc(100%-8px)] bg-border" />
                      )}
                      <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        {getCommIcon(comm.type)}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getCommBadgeStyle(comm.type)}>{getCommLabel(comm.type)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(comm.occurredAt, 'MMM d, yyyy')}
                        </span>
                        {comm.direction && (
                          <span className="text-xs text-muted-foreground">
                            • {comm.direction}
                          </span>
                        )}
                      </div>
                      {comm.subject && (
                        <p className="text-foreground text-sm font-medium">{comm.subject}</p>
                      )}
                      {comm.content && (
                        <p className="text-foreground text-sm mt-1 whitespace-pre-wrap">{comm.content}</p>
                      )}
                      {!comm.subject && !comm.content && (
                        <p className="text-sm text-muted-foreground italic">No details</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <AICopilot
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

      <AddToPipelineDialog
        open={addToPipelineOpen}
        onOpenChange={setAddToPipelineOpen}
        candidateId={id || ''}
        candidateName={getFullName(candidate.firstName, candidate.lastName)}
      />

      <AddToTalentPoolDialog
        open={addToPoolOpen}
        onOpenChange={setAddToPoolOpen}
        candidateId={id || ''}
        candidateName={getFullName(candidate.firstName, candidate.lastName)}
        existingPoolIds={candidate.talentPools?.map(p => p.poolId) || []}
      />

      <QuickNoteDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        candidateName={getFullName(candidate.firstName, candidate.lastName)}
        onSaveNote={(content) => {
          if (id) {
            createNote.mutate({ candidateId: id, content });
          }
        }}
      />

      <LogCommunicationDialog
        open={logCommOpen}
        onOpenChange={setLogCommOpen}
        candidateId={id || ''}
      />

      <UploadResumeDialog
        open={uploadResumeOpen}
        onOpenChange={setUploadResumeOpen}
        onUpload={async (file) => {
          await uploadResume.mutateAsync(file);
        }}
        isUploading={uploadResume.isPending}
      />

      <AlertDialog open={!!resumeToDelete} onOpenChange={(open) => !open && setResumeToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete resume?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {resumeToDelete && (
                <>This will permanently delete &quot;{resumeToDelete.fileName}&quot;. This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resumeToDelete) {
                  deleteResume.mutate(resumeToDelete.id);
                  setResumeToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CandidateProfile;
