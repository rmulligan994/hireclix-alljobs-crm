"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { getStageColorClass } from '@/utils/stageColors';
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
  Tag,
  FileText,
  StickyNote,
  Clock,
  Plus,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UploadResumeDialog } from '@/components/candidates/UploadResumeDialog';
import { CandidateTagEditor } from '@/components/candidates/CandidateTagEditor';
import { useCandidateWithAssociations } from '@/hooks/useCandidates';
import { useCandidateListContext } from '@/contexts/CandidateListContext';
import { useNotes, useCreateNote, useCommunications } from '@/hooks/useCommunications';
import { useResumes, useUploadResume, useSetPrimaryResume, useDeleteResume } from '@/hooks/useResumes';
import { resumeService } from '@/services';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { htmlToPlainTextForCommunicationLog } from '@/lib/email/html-plain-text-for-log';
import { cn } from '@/lib/utils';
import type { CandidateResume } from '@/types/Resume';

/** Campaign / welcome emails: we only store & show the subject line (header), not body text. */
function isSystemSentEmailComm(comm: {
  type: string;
  externalMessageId?: string | null;
  campaignRecipientId?: string | null;
}): boolean {
  return (
    comm.type === 'email' &&
    Boolean(comm.externalMessageId || comm.campaignRecipientId)
  );
}

function ResumePreviewPanel({
  resumes,
  resumesLoading,
  primaryResume,
  previewUrl,
  previewingResumeId,
  onPreviewResume,
  onClosePreview,
  onViewResume,
  onDownloadResume,
  onUploadClick,
  iframeMinHeightClassName = 'min-h-[min(65vh,720px)]',
}: {
  resumes: CandidateResume[];
  resumesLoading: boolean;
  primaryResume: CandidateResume | undefined;
  previewUrl: string | null;
  previewingResumeId: string | null;
  onPreviewResume: (id: string) => void | Promise<void>;
  onClosePreview: () => void;
  onViewResume: (id: string) => void | Promise<void>;
  onDownloadResume: (id: string, fileName: string) => void | Promise<void>;
  onUploadClick: () => void;
  iframeMinHeightClassName?: string;
}) {
  const meta = resumes.find((r) => r.id === previewingResumeId) ?? primaryResume;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sky-blue">
          <FileText className="h-5 w-5 shrink-0" />
          <h2 className="text-lg font-semibold leading-none tracking-tight">Resume preview</h2>
          {previewUrl &&
            previewingResumeId &&
            resumes.find((r) => r.id === previewingResumeId)?.isPrimary && (
              <Badge variant="secondary" className="text-xs font-normal">
                Primary
              </Badge>
            )}
        </div>
        {resumes.length > 1 && (
          <Select
            value={previewingResumeId ?? primaryResume?.id ?? resumes[0]?.id ?? ''}
            onValueChange={(v) => void onPreviewResume(v)}
          >
            <SelectTrigger className="w-full border-border bg-background sm:w-[220px]">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              {resumes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  v{r.version} · {r.fileName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {meta && previewUrl ? (
        <div className="flex shrink-0 flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border"
            onClick={() => void onViewResume(meta.id)}
          >
            <ExternalLink className="mr-1 h-4 w-4" />
            Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border"
            onClick={() => void onDownloadResume(meta.id, meta.fileName)}
          >
            <Download className="mr-1 h-4 w-4" />
            Download
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={onClosePreview}>
            <X className="mr-1 h-4 w-4" />
            Hide
          </Button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        {resumesLoading ? (
          <Skeleton className={cn('h-[min(70vh,800px)] w-full min-h-[280px] rounded-lg')} />
        ) : resumes.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No resume to preview</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onUploadClick}>
              <Upload className="mr-1 h-4 w-4" />
              Upload resume
            </Button>
          </div>
        ) : !previewUrl ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
            <Eye className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-3 text-sm text-muted-foreground">Preview hidden</p>
            {primaryResume && (
              <Button
                size="sm"
                className="bg-sky-blue hover:bg-sky-blue/90"
                onClick={() => void onPreviewResume(primaryResume.id)}
              >
                Show primary resume
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border',
              iframeMinHeightClassName,
            )}
          >
            <iframe
              src={previewUrl}
              className={cn('h-full w-full flex-1 bg-muted/20', iframeMinHeightClassName)}
              title="Resume preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}

const CandidateProfile = ({ id }: { id: string }) => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [archivedPipelinesOpen, setArchivedPipelinesOpen] = useState(false);
  const [addToPipelineOpen, setAddToPipelineOpen] = useState(false);
  const [addToPoolOpen, setAddToPoolOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [logCommOpen, setLogCommOpen] = useState(false);
  const [uploadResumeOpen, setUploadResumeOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewingResumeId, setPreviewingResumeId] = useState<string | null>(null);
  const [resumeOnlyPreviewOpen, setResumeOnlyPreviewOpen] = useState(false);
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

  const handleClosePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewingResumeId(null);
  }, []);

  const handlePreviewResume = useCallback(async (resumeId: string) => {
    try {
      const url = await resumeService.getResumeUrl(resumeId);
      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return url;
      });
      setPreviewingResumeId(resumeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load preview');
    }
  }, []);

  useEffect(() => {
    setPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewingResumeId(null);
    setResumeOnlyPreviewOpen(false);
  }, [id]);

  // Candidate list navigation
  const { getNextCandidateId, getPreviousCandidateId, getCurrentIndex, getTotalCount } = useCandidateListContext();
  const currentIndex = id ? getCurrentIndex(id) : -1;
  const totalCount = getTotalCount();
  const nextCandidateId = id ? getNextCandidateId(id) : null;
  const previousCandidateId = id ? getPreviousCandidateId(id) : null;
  const hasListContext = currentIndex !== -1 && totalCount > 0;

  const handleViewResume = async (resumeId: string) => {
    try {
      const url = await resumeService.getResumeUrl(resumeId);
      window.open(url, '_blank');
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
      try {
        const url = await resumeService.getResumeUrl(resumeId);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
      } catch {
        toast.error(e instanceof Error ? e.message : 'Failed to download resume');
      }
    }
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

  const getStageColor = (stage: string) => getStageColorClass(stage);

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
          <TopBar />
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
          <TopBar />
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
        <TopBar />

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

          {/* Tags & Skills + Resume Versions (equal height on large screens) */}
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2 lg:items-stretch">
            <Card className="flex h-full flex-col bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sky-blue">
                  <Tag className="w-5 h-5" />
                  Tags & Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <CandidateTagEditor
                  candidateId={candidate.id}
                  tags={candidate.tags ?? []}
                  suggestTagsResumeId={primaryResume?.id ?? null}
                  resumePreviewSlot={
                    <ResumePreviewPanel
                      resumes={resumes}
                      resumesLoading={resumesLoading}
                      primaryResume={primaryResume}
                      previewUrl={previewUrl}
                      previewingResumeId={previewingResumeId}
                      onPreviewResume={handlePreviewResume}
                      onClosePreview={handleClosePreview}
                      onViewResume={handleViewResume}
                      onDownloadResume={handleDownloadResume}
                      onUploadClick={() => setUploadResumeOpen(true)}
                    />
                  }
                  onTagModalOpenChange={(open) => {
                    if (open && primaryResume) void handlePreviewResume(primaryResume.id);
                    if (!open) handleClosePreview();
                  }}
                />
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col bg-card border-border">
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
              <CardContent className="flex min-h-0 flex-1 flex-col space-y-3">
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
                            onClick={() => {
                              setResumeOnlyPreviewOpen(true);
                              void handlePreviewResume(resume.id);
                            }}
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog
            open={resumeOnlyPreviewOpen}
            onOpenChange={(o) => {
              setResumeOnlyPreviewOpen(o);
              if (!o) handleClosePreview();
            }}
          >
            <DialogContent
              className={cn(
                'flex max-h-[90vh] w-[95vw] max-w-4xl flex-col gap-4 overflow-y-auto p-6',
                'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
              )}
            >
              <DialogHeader className="sr-only">
                <DialogTitle>Resume preview</DialogTitle>
              </DialogHeader>
              <ResumePreviewPanel
                resumes={resumes}
                resumesLoading={resumesLoading}
                primaryResume={primaryResume}
                previewUrl={previewUrl}
                previewingResumeId={previewingResumeId}
                onPreviewResume={handlePreviewResume}
                onClosePreview={handleClosePreview}
                onViewResume={handleViewResume}
                onDownloadResume={handleDownloadResume}
                onUploadClick={() => {
                  setResumeOnlyPreviewOpen(false);
                  handleClosePreview();
                  setUploadResumeOpen(true);
                }}
                iframeMinHeightClassName="min-h-[min(70vh,800px)]"
              />
            </DialogContent>
          </Dialog>

          {/* Recruiter Notes — full width */}
          <Card className="bg-card border-border mb-6">
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

          {/* Communication History — full width */}
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
                        <p className="text-foreground text-sm font-medium break-words">
                          {comm.type === 'email'
                            ? htmlToPlainTextForCommunicationLog(comm.subject, 500)
                            : comm.subject}
                        </p>
                      )}
                      {comm.content && !(comm.type === 'email' && isSystemSentEmailComm(comm)) && (
                        <p
                          className={
                            comm.type === 'email'
                              ? 'text-foreground text-sm mt-1 whitespace-normal break-words'
                              : 'text-foreground text-sm mt-1 whitespace-pre-wrap break-words'
                          }
                        >
                          {comm.type === 'email'
                            ? htmlToPlainTextForCommunicationLog(comm.content, 2000)
                            : comm.content}
                        </p>
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
