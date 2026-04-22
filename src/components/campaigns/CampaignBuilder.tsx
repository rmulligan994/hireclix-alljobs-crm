import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SequenceBuilder, type SequenceMetadata } from './SequenceBuilder';
import { TemplateLibrary } from './TemplateLibrary';
import { HtmlCampaignEmailEditor } from './email/HtmlCampaignEmailEditor';
import { ArrowLeft, Save, Send, Calendar as CalendarIcon, Users, Loader2, Search, AlertTriangle, Mail, Folder } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useCreateCampaign, useUpdateCampaign, useRecipientCount, useFilteredCandidates, useAddCampaignRecipients } from '@/hooks/useCampaigns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTalentPools } from '@/hooks/useTalentPools';
import { usePipelines } from '@/hooks/usePipelines';
import { useCampaignFolders } from '@/hooks/useCampaignFolders';
import { useJobsForCampaign } from '@/hooks/useJobs';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { isOverRecipientLimit, getRecipientLimitForRole } from '@/config/roleLimits';
import { EmailTemplate, emailTemplateService } from '@/services/emailTemplateService';
import type { StarterTemplate } from '@/data/email-starter-data';
import { AudienceFilter, CampaignEmail, Campaign, LeadStatus } from '@/types/Campaign';
import { Json } from '@/integrations/supabase/types';
import type { AnnouncementForm, ComposeKind } from '@/types/email-types';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { isScheduleInPast, localYmdTimeToDate } from '@/lib/campaignScheduleTime';
import { formatHhmmAs12h } from '@/lib/time12h';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LeadUsageIndicator } from '@/components/candidates/LeadUsageIndicator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { campaignService } from '@/services/campaignService';
import {
  findUnknownMergeTagsInCampaignSteps,
  formatUnknownMergeTagsMessage,
} from '@/lib/email/merge-tags-validation';
import { buildCampaignLaunchDescription } from '@/lib/campaignSendToast';
import { newEmailDraftSessionId } from '@/lib/email/email-ai-chat-storage-key';
import { ensureCampaignNameWithPeriod } from '@/lib/campaignNamePeriod';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCampaignStats } from '@/hooks/useCampaignStats';

function campaignStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
    case 'scheduled':
      return 'bg-sunrise/20 text-sunrise border-sunrise';
    case 'paused':
      return 'bg-muted text-muted-foreground border-border';
    case 'completed':
      return 'bg-green-500/20 text-green-600 border-green-500';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/** Shown in read-only View: recipient rows that could not be delivered. */
function ReadOnlyDeliveryIssues({ campaignId }: { campaignId: string }) {
  const { stats, isLoading } = useCampaignStats(campaignId);
  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading send results…
      </div>
    );
  }
  const n = stats.failed + stats.rejected;
  if (n <= 0) return null;
  return (
    <Alert className="border-destructive/40 bg-destructive/5">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <AlertTitle>Not delivered</AlertTitle>
      <AlertDescription className="text-foreground/90">
        <span className="font-medium text-destructive">{n}</span> message{n !== 1 ? 's' : ''} could not
        be sent — invalid or missing address, or provider error ({stats.failed} failed, {stats.rejected}{' '}
        rejected before send).
      </AlertDescription>
    </Alert>
  );
}

interface CampaignBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCampaign?: Campaign | null;
  isLoadingCampaign?: boolean;
  /** When true, show a read-only summary (e.g. opened from View on the campaigns list). */
  readOnly?: boolean;
  /** Called after a successful launch or schedule; parent can show a success screen (toast is skipped when set). */
  onSendSuccess?: (payload: {
    campaignId: string;
    campaignName: string;
    kind: 'launch' | 'schedule';
    description?: string;
  }) => void;
}

export const CampaignBuilder = ({
  open,
  onOpenChange,
  editingCampaign,
  isLoadingCampaign,
  readOnly = false,
  onSendSuccess,
}: CampaignBuilderProps) => {
  const [currentStep, setCurrentStep] = useState<'details' | 'template' | 'editor' | 'sequence' | 'audience' | 'review'>('details');
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateComposeKind, setTemplateComposeKind] = useState<ComposeKind>('announcement_form');
  const [templateFormPayload, setTemplateFormPayload] = useState<unknown | null>(null);
  const [templateEditorSubject, setTemplateEditorSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [emailSteps, setEmailSteps] = useState<Partial<CampaignEmail>[]>([]);
  /** Bumps when template is re-selected so Sequence remounts with fresh props. */
  const [sequenceBuilderNonce, setSequenceBuilderNonce] = useState(0);
  /** Highest step index (0–4) the user has reached; enables step pill navigation. */
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  /** Editor vs AI tab when the full-screen email editor opens. */
  const [editorInitialWorkspaceTab, setEditorInitialWorkspaceTab] = useState<'editor' | 'ai'>('editor');
  /** Scopes AI chat for new campaigns (no `campaignId` yet) so each composition starts with a fresh conversation. */
  const [emailDraftChatSessionId, setEmailDraftChatSessionId] = useState(() => newEmailDraftSessionId());

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [validationActionPending, setValidationActionPending] = useState(false);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [currentStep]);

  // Initialize from editing campaign
  useEffect(() => {
    if (editingCampaign) {
      setCampaignName(editingCampaign.name ?? '');
      setCampaignType(editingCampaign.type ?? '');
      setCampaignId(editingCampaign.id);
      setSelectedFolderId(editingCampaign.folder_id ?? null);
      setSelectedJobId(editingCampaign.job_id ?? null);
      setCurrentStep('details');
      if (editingCampaign.audience_filter) {
        const filter = editingCampaign.audience_filter as AudienceFilter;
        setAudienceFilter(filter);
        setSelectedTalentPools(filter.talentPoolIds || []);
        setSelectedPipelines(filter.pipelineIds || []);
        setSelectedTags(filter.tags || []);
        setSelectedLeadStatus(filter.leadStatus || []);
      }
      // Build sequence metadata from campaign for display
      const rec = editingCampaign.schedule_recurrence;
      if (rec || editingCampaign.scheduled_at) {
        // Use local calendar day — `toISOString().slice(0,10)` is UTC and can be wrong for evening sends.
        const firstDate = editingCampaign.scheduled_at
          ? format(new Date(editingCampaign.scheduled_at), 'yyyy-MM-dd')
          : undefined;
        const scheduleTime = rec?.time ?? '09:00';
        setSequenceMetadata({
          sendImmediately: !editingCampaign.scheduled_at,
          scheduleRecurrence: rec ?? null,
          firstSendDate: firstDate,
          scheduleTime,
        });
      } else {
        setSequenceMetadata(null);
      }
    }
  }, [editingCampaign]);

  useEffect(() => {
    if (editingCampaign) {
      setFurthestStepIndex(4);
    }
  }, [editingCampaign]);

  // Load campaign emails when editing (template, sequence content)
  useEffect(() => {
    if (!editingCampaign?.id) return;
    let cancelled = false;
    campaignService.getEmails(editingCampaign.id).then((emails) => {
      if (cancelled) return;
      if (emails.length > 0) {
        const steps = emails.map((e) => ({
          id: e.id,
          step_order: e.step_order,
          delay_days: e.delay_days,
          delay_hours: e.delay_hours,
          subject: e.subject,
          bee_json: e.bee_json,
          html_content: e.html_content,
          compose_kind: e.compose_kind,
          form_payload: e.form_payload,
        }));
        setEmailSteps(steps);
        const first = emails[0];
        setTemplateComposeKind((first?.compose_kind === 'raw_html' ? 'raw_html' : 'announcement_form') as ComposeKind);
        setTemplateFormPayload(first?.form_payload ?? null);
        setTemplateEditorSubject(first?.subject ?? '');
        setTemplateHtml(first?.html_content ?? null);
      } else {
        setEmailSteps([]);
        setTemplateComposeKind('announcement_form');
        setTemplateFormPayload(null);
        setTemplateEditorSubject('');
        setTemplateHtml(null);
      }
    });
    return () => { cancelled = true; };
  }, [editingCampaign?.id]);

  // Audience state
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const [selectedTalentPools, setSelectedTalentPools] = useState<string[]>([]);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<LeadStatus[]>([]);
  
  // Sequence metadata (from Sequence step - when to send, recurrence for display)
  const [sequenceMetadata, setSequenceMetadata] = useState<SequenceMetadata | null>(null);

  // Folder state (for organization)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Job state (for job_alert campaigns)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationData, setValidationData] = useState<{ valid: number; noEmail: number; unsubscribed: number } | null>(null);
  const [pendingAction, setPendingAction] = useState<'launch' | 'schedule' | null>(null);
  const [isQueueingSchedule, setIsQueueingSchedule] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateTemplate } = useEmailTemplates();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const addRecipients = useAddCampaignRecipients();
  const { data: talentPools } = useTalentPools();
  const { data: pipelines } = usePipelines();
  const { data: folders } = useCampaignFolders();
  const { data: currentUser } = useCurrentUser();
  const userRole = useCurrentUserRole();
  const isAdmin = userRole === 'admin';
  /** Admins (Team): when true, org sharing is required; campaign UI uses greyed, fixed org + Organization tab options. */
  const requireOrgShared = currentUser?.profile?.requireOrgSharedCampaigns === true;
  /** Save org flags on updates for admins and for users with required org sharing (recruiters). */
  const shouldPersistOrgCampaignFlags = isAdmin || requireOrgShared;
  const [shareWithOrganization, setShareWithOrganization] = useState(false);
  /** When admin has not set “force” on your profile, controls Organization tab listing for this org-shared campaign. */
  const [showInOrgTab, setShowInOrgTab] = useState(true);

  const orgListFields = useMemo(() => {
    if (requireOrgShared) {
      return { is_organization_campaign: true, show_in_org_tab: true };
    }
    if (!isAdmin) {
      return { is_organization_campaign: false, show_in_org_tab: true };
    }
    if (!shareWithOrganization) {
      return { is_organization_campaign: false, show_in_org_tab: true };
    }
    return {
      is_organization_campaign: true,
      show_in_org_tab: showInOrgTab,
    };
  }, [isAdmin, requireOrgShared, shareWithOrganization, showInOrgTab]);

  useEffect(() => {
    if (requireOrgShared) {
      setShareWithOrganization(true);
    }
  }, [requireOrgShared]);

  useEffect(() => {
    if (!open) return;
    if (editingCampaign) {
      setShareWithOrganization(
        requireOrgShared ? true : !!editingCampaign.is_organization_campaign
      );
      setShowInOrgTab(editingCampaign.show_in_org_tab !== false);
    } else {
      if (requireOrgShared) {
        setShareWithOrganization(true);
      } else {
        setShareWithOrganization(false);
      }
      setShowInOrgTab(true);
    }
  }, [open, editingCampaign, requireOrgShared]);

  const { settings: orgSettings } = useOrganizationSettings();
  const { data: campaignJobs } = useJobsForCampaign(jobSearch);
  const { data: filteredCandidates, isLoading: isLoadingCandidates } = useFilteredCandidates(audienceFilter);
  const { data: recipientCount } = useRecipientCount(audienceFilter);

  const getSendBlocker = useCallback(
    (kind: 'launch' | 'schedule'): string | null => {
      if (!orgSettings?.base_url?.trim()) {
        return 'Set Base URL in Settings → Organization so unsubscribe links work.';
      }
      if (!campaignName.trim()) {
        return 'Enter a campaign name.';
      }
      if (!campaignType) {
        return 'Select a campaign type.';
      }
      if (emailSteps.length === 0) {
        return 'Add at least one email in your sequence.';
      }
      for (let i = 0; i < emailSteps.length; i++) {
        const step = emailSteps[i];
        if (!(step.subject ?? '').trim()) {
          return `Step ${i + 1}: add an email subject.`;
        }
        if (!(step.html_content ?? '').trim()) {
          return `Step ${i + 1}: add email body content.`;
        }
      }
      const unknownMerge = findUnknownMergeTagsInCampaignSteps(emailSteps);
      if (unknownMerge.length > 0) {
        return formatUnknownMergeTagsMessage(unknownMerge);
      }
      if (!filteredCandidates || filteredCandidates.length === 0) {
        return 'Select at least one recipient in the Audience step.';
      }
      if (recipientCount !== undefined && recipientCount > 0 && isOverRecipientLimit(userRole, recipientCount)) {
        return 'Recipient count exceeds your role limit. Narrow your audience or ask an Admin to send.';
      }
      if (kind === 'schedule' && !sequenceMetadata?.firstSendDate) {
        return 'Choose a scheduled date in the Sequence step.';
      }
      return null;
    },
    [
      orgSettings?.base_url,
      campaignName,
      campaignType,
      emailSteps,
      filteredCandidates,
      recipientCount,
      userRole,
      sequenceMetadata?.firstSendDate,
    ],
  );

  /** Persists sequence to DB and refreshes local ids from the server (insert/update/delete). */
  const persistCampaignEmails = async (cid: string) => {
    const synced = await campaignService.syncCampaignEmails(cid, emailSteps);
    setEmailSteps(
      synced.map((e) => ({
        id: e.id,
        step_order: e.step_order,
        delay_days: e.delay_days,
        delay_hours: e.delay_hours,
        subject: e.subject,
        bee_json: e.bee_json,
        html_content: e.html_content,
        compose_kind: e.compose_kind,
        form_payload: e.form_payload,
      })),
    );
  };

  // Update audience filter when selections change
  useEffect(() => {
    setAudienceFilter({
      talentPoolIds: selectedTalentPools.length > 0 ? selectedTalentPools : undefined,
      pipelineIds: selectedPipelines.length > 0 ? selectedPipelines : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      leadStatus: selectedLeadStatus.length > 0 ? selectedLeadStatus : undefined,
    });
  }, [selectedTalentPools, selectedPipelines, selectedTags, selectedLeadStatus]);

  const handleTemplateSelect = (template: EmailTemplate | null, options?: { initialAiTab?: boolean }) => {
    setEditorInitialWorkspaceTab(options?.initialAiTab ? 'ai' : 'editor');
    setSelectedTemplate(template);
    const ck = template?.compose_kind === 'raw_html' ? 'raw_html' : 'announcement_form';
    setTemplateComposeKind(ck);
    setTemplateFormPayload(template?.form_payload ?? null);
    setTemplateEditorSubject(template?.subject ?? '');
    setTemplateHtml(template?.html_content ?? null);
    setEmailSteps([]);
    setSequenceBuilderNonce((n) => n + 1);
    // New template body invalidates sequence/audience/review until the user goes through editor → sequence again.
    setFurthestStepIndex(1);
    setEmailDraftChatSessionId(newEmailDraftSessionId());
    setCurrentStep('editor');
  };

  const handleStarterTemplateSelect = (starter: StarterTemplate) => {
    setEditorInitialWorkspaceTab('editor');
    setSelectedTemplate(null);
    setTemplateComposeKind('raw_html');
    setTemplateFormPayload(null);
    setTemplateEditorSubject(starter.subject);
    setTemplateHtml(starter.html);
    setEmailSteps([]);
    setSequenceBuilderNonce((n) => n + 1);
    setFurthestStepIndex(1);
    setEmailDraftChatSessionId(newEmailDraftSessionId());
    setCurrentStep('editor');
  };

  const applyEditorPayloadToTemplateState = (payload: {
    html: string;
    subject: string;
    compose_kind: ComposeKind;
    form_payload: AnnouncementForm | null;
  }) => {
    setTemplateHtml(payload.html);
    setTemplateComposeKind(payload.compose_kind);
    setTemplateFormPayload(payload.form_payload);
    setTemplateEditorSubject(payload.subject);
  };

  const handleEditorContinue = (payload: {
    html: string;
    subject: string;
    compose_kind: ComposeKind;
    form_payload: AnnouncementForm | null;
  }) => {
    applyEditorPayloadToTemplateState(payload);
    setFurthestStepIndex((f) => Math.max(2, f));
    setCurrentStep('sequence');
  };

  const handleSaveTemplate = async (payload: {
    html: string;
    subject: string;
    compose_kind: ComposeKind;
    form_payload: AnnouncementForm | null;
  }) => {
    applyEditorPayloadToTemplateState(payload);

    try {
      if (selectedTemplate) {
        const updated = await emailTemplateService.update(selectedTemplate.id, {
          bee_json: null,
          html_content: payload.html,
          subject: payload.subject,
          compose_kind: payload.compose_kind,
          form_payload: payload.form_payload as Json | null,
        });
        setSelectedTemplate(updated);
      } else {
        const created = await emailTemplateService.create({
          name: campaignName || 'Untitled Template',
          category: campaignType || 'custom',
          subject: payload.subject,
          bee_json: null,
          html_content: payload.html,
          compose_kind: payload.compose_kind,
          form_payload: payload.form_payload as Json | null,
        });
        setSelectedTemplate(created);
      }
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: 'Template saved',
        description: 'Your library template was updated. Continue when you are ready.',
      });
    } catch (err) {
      toast({
        title: 'Failed to save template',
        description: (err as Error)?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAsTemplate = async (
    payload: {
      html: string;
      subject: string;
      compose_kind: ComposeKind;
      form_payload: AnnouncementForm | null;
    },
    name: string,
  ) => {
    applyEditorPayloadToTemplateState(payload);

    try {
      const created = await emailTemplateService.create({
        name: name.trim() || campaignName || 'Untitled Template',
        category: campaignType || 'custom',
        subject: payload.subject,
        bee_json: null,
        html_content: payload.html,
        compose_kind: payload.compose_kind,
        form_payload: payload.form_payload as Json | null,
      });
      setSelectedTemplate(created);
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: 'Template created',
        description: `"${created.name}" was added to your template library.`,
      });
    } catch (err) {
      toast({
        title: 'Failed to save template',
        description: (err as Error)?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditorCancel = () => {
    setEditorInitialWorkspaceTab('editor');
    setCurrentStep('template');
  };

  const handleRenameTemplateFromEditor = (templateId: string, newName: string) => {
    updateTemplate(
      { id: templateId, input: { name: newName } },
      {
        onSuccess: (updated) => {
          setSelectedTemplate(updated);
        },
      },
    );
  };

  const handleSequenceContinue = (steps: Partial<CampaignEmail>[], opts?: { firstSendDate?: string; metadata?: SequenceMetadata }) => {
    setEmailSteps(steps);
    setSequenceMetadata(opts?.metadata ?? null);
    setFurthestStepIndex((f) => Math.max(3, f));
    setCurrentStep('audience');
  };

  const handleSendTest = async () => {
    if (emailSteps.length === 0) {
      toast({ title: 'Add at least one email to the sequence', variant: 'destructive' });
      return;
    }
    const unknownMerge = findUnknownMergeTagsInCampaignSteps(emailSteps);
    if (unknownMerge.length > 0) {
      toast({
        title: 'Invalid merge tags',
        description: formatUnknownMergeTagsMessage(unknownMerge),
        variant: 'destructive',
      });
      return;
    }
    setSendingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast({ title: 'Could not get your email', variant: 'destructive' });
        return;
      }
      let testCampaignId = campaignId;
      if (!testCampaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: ensureCampaignNameWithPeriod(campaignName || 'Test'),
          type: campaignType,
          audience_filter: audienceFilter,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
          is_organization_campaign: orgListFields.is_organization_campaign,
          show_in_org_tab: orgListFields.show_in_org_tab,
        });
        setCampaignId(campaign.id);
        testCampaignId = campaign.id;
        await persistCampaignEmails(campaign.id);
      } else {
        await persistCampaignEmails(testCampaignId);
      }
      const { data, error } = await supabase.functions.invoke('send-campaign-test-email', {
        body: { campaignId: testCampaignId, recipientEmail: user.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Test email sent', description: `Check ${user.email}` });
    } catch (err) {
      toast({ title: 'Failed to send test', description: (err as Error)?.message, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const runWithValidation = (action: 'launch' | 'schedule') => {
    const blocker = getSendBlocker(action);
    if (blocker) {
      toast({
        title: 'Cannot send yet',
        description: blocker,
        variant: 'destructive',
      });
      return;
    }
    const candidateIds = filteredCandidates!.map((c) => c.id);
    campaignService.getRecipientValidation(campaignId || '', candidateIds).then((v) => {
      if (v.noEmail > 0 || v.unsubscribed > 0) {
        setValidationData(v);
        setPendingAction(action);
        setShowValidationDialog(true);
      } else {
        if (action === 'launch') void handleLaunchCampaign();
        else void handleScheduleCampaign();
      }
    });
  };

  const handleSaveAsDraft = async () => {
    try {
      if (!campaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: ensureCampaignNameWithPeriod(campaignName),
          type: campaignType,
          audience_filter: audienceFilter,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
          is_organization_campaign: orgListFields.is_organization_campaign,
          show_in_org_tab: orgListFields.show_in_org_tab,
        });
        setCampaignId(campaign.id);
        
        await persistCampaignEmails(campaign.id);

        // Add recipients
        if (filteredCandidates && filteredCandidates.length > 0) {
          await addRecipients.mutateAsync({
            campaignId: campaign.id,
            candidateIds: filteredCandidates.map(c => c.id),
          });
        }
      } else {
        await updateCampaign.mutateAsync({
          id: campaignId,
          input: {
            name: campaignName,
            type: campaignType,
            status: 'draft',
            audience_filter: audienceFilter,
            job_id: campaignType === 'job_alert' ? selectedJobId : null,
            folder_id: selectedFolderId,
            ...(shouldPersistOrgCampaignFlags
              ? {
                  is_organization_campaign: orgListFields.is_organization_campaign,
                  show_in_org_tab: orgListFields.show_in_org_tab,
                }
              : {}),
          },
        });
        await persistCampaignEmails(campaignId);
        if (filteredCandidates && filteredCandidates.length > 0) {
          await addRecipients.mutateAsync({
            campaignId,
            candidateIds: filteredCandidates.map((c) => c.id),
          });
        }
      }
      
      toast({
        title: 'Campaign saved',
        description: 'Your campaign has been saved as a draft.',
      });
      handleClose();
    } catch (err) {
      toast({
        title: 'Save failed',
        description: 'Failed to save campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleCampaign = async (): Promise<boolean> => {
    const scheduleBlocker = getSendBlocker('schedule');
    if (scheduleBlocker) {
      toast({
        title: 'Cannot schedule yet',
        description: scheduleBlocker,
        variant: 'destructive',
      });
      return false;
    }

    const firstDate = sequenceMetadata!.firstSendDate!;
    const scheduleTime = sequenceMetadata?.scheduleTime ?? '09:00';

    if (isScheduleInPast(firstDate, scheduleTime)) {
      toast({
        title: 'Choose a future time',
        description:
          'The date and time you picked are already in the past. Pick a later slot (times use your local timezone).',
        variant: 'destructive',
      });
      return false;
    }

    let scheduledAt: Date;
    try {
      scheduledAt = localYmdTimeToDate(firstDate, scheduleTime);
    } catch {
      toast({ title: 'Invalid schedule', description: 'Check the first send date and time.', variant: 'destructive' });
      return false;
    }
    const scheduledAtIso = scheduledAt.toISOString();

    try {
      let finalCampaignId = campaignId;

      if (!campaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: ensureCampaignNameWithPeriod(campaignName),
          type: campaignType,
          audience_filter: audienceFilter,
          scheduled_at: scheduledAtIso,
          schedule_recurrence: sequenceMetadata?.scheduleRecurrence ?? null,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
          is_organization_campaign: orgListFields.is_organization_campaign,
          show_in_org_tab: orgListFields.show_in_org_tab,
        });
        setCampaignId(campaign.id);
        finalCampaignId = campaign.id;

        await persistCampaignEmails(campaign.id);

        await updateCampaign.mutateAsync({
          id: campaign.id,
          input: { status: 'scheduled' },
        });

        if (filteredCandidates && filteredCandidates.length > 0) {
          await addRecipients.mutateAsync({
            campaignId: campaign.id,
            candidateIds: filteredCandidates.map((c) => c.id),
          });
        }
      } else {
        await updateCampaign.mutateAsync({
          id: campaignId,
          input: {
            name: campaignName,
            type: campaignType,
            status: 'scheduled',
            scheduled_at: scheduledAtIso,
            schedule_recurrence: sequenceMetadata?.scheduleRecurrence ?? null,
            audience_filter: audienceFilter,
            job_id: campaignType === 'job_alert' ? selectedJobId : null,
            folder_id: selectedFolderId,
            ...(shouldPersistOrgCampaignFlags
              ? {
                  is_organization_campaign: orgListFields.is_organization_campaign,
                  show_in_org_tab: orgListFields.show_in_org_tab,
                }
              : {}),
          },
        });
        await persistCampaignEmails(campaignId);
        if (filteredCandidates && filteredCandidates.length > 0) {
          await addRecipients.mutateAsync({
            campaignId,
            candidateIds: filteredCandidates.map((c) => c.id),
          });
        }
      }

      const cid = finalCampaignId!;
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });

      setIsQueueingSchedule(true);
      try {
        const { data, error } = await supabase.functions.invoke('send-campaign-email', {
          body: { campaignId: cid, scheduledAt: scheduledAtIso },
        });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
        if (error) {
          toast({
            title: 'Scheduling failed',
            description:
              `${error.message} Your campaign is saved as scheduled, but the send queue was not created. Use “Send” on the campaign list to queue again, or contact support if this persists.`,
            variant: 'destructive',
          });
          return false;
        }
        if ((data as { error?: string } | null | undefined)?.error) {
          const msg = String((data as { error: string }).error);
          toast({
            title: 'Scheduling failed',
            description: `${msg} Your campaign is saved as scheduled, but the send queue may be incomplete. Try “Send” on the campaign list, or check Upcoming Sends.`,
            variant: 'destructive',
          });
          return false;
        }
        const scheduleDescription = `Your campaign is scheduled for ${format(scheduledAt, 'PPP')} at ${formatHhmmAs12h(scheduleTime)}. Check Upcoming Sends to confirm.`;
        onSendSuccess?.({
          campaignId: cid,
          campaignName: campaignName.trim(),
          kind: 'schedule',
          description: scheduleDescription,
        });
        if (!onSendSuccess) {
          toast({
            title: 'Campaign scheduled',
            description: scheduleDescription,
          });
        }
        handleClose();
        const skippedNoEmail = typeof (data as { skippedNoEmail?: number })?.skippedNoEmail === 'number'
          ? (data as { skippedNoEmail: number }).skippedNoEmail
          : 0;
        if (skippedNoEmail > 0) {
          toast({
            title: 'Schedule ready',
            description: `${(data as { sent?: number })?.sent ?? 0} queued; ${skippedNoEmail} skipped (no email on file).`,
          });
        }
        return true;
      } finally {
        setIsQueueingSchedule(false);
      }
    } catch (err) {
      toast({
        title: 'Schedule failed',
        description: (err as Error)?.message || 'Failed to schedule campaign. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleLaunchCampaign = async (): Promise<boolean> => {
    const launchBlocker = getSendBlocker('launch');
    if (launchBlocker) {
      toast({
        title: 'Cannot launch yet',
        description: launchBlocker,
        variant: 'destructive',
      });
      return false;
    }

    try {
      let finalCampaignId = campaignId;

      if (!campaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: ensureCampaignNameWithPeriod(campaignName),
          type: campaignType,
          audience_filter: audienceFilter,
          schedule_recurrence: sequenceMetadata?.scheduleRecurrence ?? null,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
          is_organization_campaign: orgListFields.is_organization_campaign,
          show_in_org_tab: orgListFields.show_in_org_tab,
        });
        setCampaignId(campaign.id);
        finalCampaignId = campaign.id;

        await persistCampaignEmails(campaign.id);

        await updateCampaign.mutateAsync({
          id: campaign.id,
          input: {
            status: 'active',
            job_id: campaignType === 'job_alert' ? selectedJobId : null,
            folder_id: selectedFolderId,
            ...(shouldPersistOrgCampaignFlags
              ? {
                  is_organization_campaign: orgListFields.is_organization_campaign,
                  show_in_org_tab: orgListFields.show_in_org_tab,
                }
              : {}),
          },
        });

        if (filteredCandidates && filteredCandidates.length > 0) {
          await addRecipients.mutateAsync({
            campaignId: campaign.id,
            candidateIds: filteredCandidates.map(c => c.id),
          });
        }
      } else {
        await updateCampaign.mutateAsync({
          id: campaignId,
          input: {
            name: campaignName,
            type: campaignType,
            status: 'active',
            audience_filter: audienceFilter,
            job_id: campaignType === 'job_alert' ? selectedJobId : null,
            folder_id: selectedFolderId,
            ...(shouldPersistOrgCampaignFlags
              ? {
                  is_organization_campaign: orgListFields.is_organization_campaign,
                  show_in_org_tab: orgListFields.show_in_org_tab,
                }
              : {}),
            ...(sequenceMetadata?.scheduleRecurrence !== undefined && {
              schedule_recurrence: sequenceMetadata.scheduleRecurrence,
            }),
          },
        });
        await persistCampaignEmails(campaignId);
        if (filteredCandidates && filteredCandidates.length > 0) {
          await addRecipients.mutateAsync({
            campaignId,
            candidateIds: filteredCandidates.map((c) => c.id),
          });
        }
      }

      const cid = finalCampaignId!;
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });

      // Don’t await send-campaign-email: it sends to each recipient sequentially and blocks the UI for large lists.
      const launchDescription =
        'Your campaign is active. Messages are sending now; large audiences may take a minute to finish.';
      onSendSuccess?.({
        campaignId: cid,
        campaignName: campaignName.trim(),
        kind: 'launch',
        description: launchDescription,
      });
      if (!onSendSuccess) {
        toast({
          title: 'Campaign launched!',
          description: launchDescription,
        });
      }
      handleClose();

      void supabase.functions
        .invoke('send-campaign-email', { body: { campaignId: cid, forceImmediateSend: true } })
        .then(({ data, error }) => {
          queryClient.invalidateQueries({ queryKey: ['campaigns'] });
          queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
          if (error) {
            toast({
              title: 'Sending may be incomplete',
              description: error.message,
              variant: 'destructive',
            });
            return;
          }
          if (data?.error) {
            toast({
              title: 'Sending may be incomplete',
              description: String(data.error),
              variant: 'destructive',
            });
            return;
          }
          const errs = Array.isArray(data?.errors) ? (data.errors as string[]) : [];
          const skippedNoEmail = typeof data?.skippedNoEmail === 'number' ? data.skippedNoEmail : 0;
          if (errs.length > 0 || skippedNoEmail > 0) {
            toast({
              title: 'Some recipients were skipped or failed',
              description: buildCampaignLaunchDescription(errs, skippedNoEmail),
            });
          }
        });
      return true;
    } catch (err) {
      toast({
        title: 'Launch failed',
        description: (err as Error)?.message || 'Failed to launch campaign. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const resetBuilderState = () => {
    setCurrentStep('details');
    setCampaignName('');
    setCampaignType('');
    setSelectedTemplate(null);
    setTemplateComposeKind('announcement_form');
    setTemplateFormPayload(null);
    setTemplateEditorSubject('');
    setTemplateHtml(null);
    setCampaignId(null);
    setEmailSteps([]);
    setAudienceFilter({});
    setSelectedTalentPools([]);
    setSelectedPipelines([]);
    setSelectedTags([]);
    setSelectedLeadStatus([]);
    setSequenceMetadata(null);
    setSelectedFolderId(null);
    setSelectedJobId(null);
    setJobSearch('');
    setSequenceBuilderNonce(0);
    setFurthestStepIndex(0);
    setEditorInitialWorkspaceTab('editor');
    setValidationActionPending(false);
    setEmailDraftChatSessionId(newEmailDraftSessionId());
    setShareWithOrganization(false);
  };

  /** Programmatic close (Save draft, Launch, Schedule, etc.) */
  const handleClose = () => {
    onOpenChange(false);
    resetBuilderState();
  };

  /** Radix dialog: ignore `open=true` so we don't wipe state when the dialog opens. */
  const handleDialogOpenChange = (isOpen: boolean) => {
    if (isOpen) return;
    onOpenChange(false);
    resetBuilderState();
  };

  const toggleTalentPool = (poolId: string) => {
    setSelectedTalentPools(prev => 
      prev.includes(poolId) ? prev.filter(id => id !== poolId) : [...prev, poolId]
    );
  };

  const togglePipeline = (pipelineId: string) => {
    setSelectedPipelines(prev =>
      prev.includes(pipelineId) ? prev.filter(id => id !== pipelineId) : [...prev, pipelineId]
    );
  };

  const toggleLeadStatus = (status: LeadStatus) => {
    setSelectedLeadStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const launchSendBlocker = getSendBlocker('launch');
  const scheduleSendBlocker = getSendBlocker('schedule');

  const { data: firstSentByCampaignEmailId } = useQuery({
    queryKey: ['campaign-step-first-sent', editingCampaign?.id],
    queryFn: () => campaignService.getFirstSentAtByCampaignEmailId(editingCampaign!.id),
    enabled: readOnly && !!editingCampaign?.id,
  });

  if (readOnly) {
    const sortedSteps = [...emailSteps].sort(
      (a, b) => (a.step_order ?? 0) - (b.step_order ?? 0),
    );
    const c = editingCampaign;
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading pr-8">{c?.name ?? 'Campaign'}</DialogTitle>
            {c ? (
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={campaignStatusBadgeClass(c.status)}>
                  {c.status}
                </Badge>
                <Badge variant="secondary">{c.type}</Badge>
              </DialogDescription>
            ) : (
              <DialogDescription>Loading campaign…</DialogDescription>
            )}
          </DialogHeader>
          {isLoadingCampaign ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !c ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Unable to load this campaign.</p>
          ) : (
            <div className="space-y-4 text-sm">
              {c.goal ? (
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Goal</div>
                  <p className="text-foreground mt-0.5">{c.goal}</p>
                </div>
              ) : null}
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Created</div>
                <p className="text-foreground mt-0.5">{format(new Date(c.created_at), 'PPP')}</p>
              </div>
              {c.scheduled_at ? (
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Scheduled</div>
                  <p className="text-foreground mt-0.5">{format(new Date(c.scheduled_at), 'PPP p')}</p>
                </div>
              ) : null}
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Schedule</div>
                <p className="text-foreground mt-0.5">
                  {sequenceMetadata?.sendImmediately
                    ? 'Send immediately when launched'
                    : sequenceMetadata?.firstSendDate && sequenceMetadata?.scheduleTime
                      ? `${format(parse(sequenceMetadata.firstSendDate, 'yyyy-MM-dd', new Date()), 'PPP')} at ${formatHhmmAs12h(sequenceMetadata.scheduleTime)}`
                      : '—'}
                </p>
              </div>
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Recipients (estimate)</div>
                <p className="text-foreground mt-0.5">{recipientCount ?? 0} candidates match current filters</p>
              </div>
              <ReadOnlyDeliveryIssues campaignId={c.id} />
              <div>
                <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">Emails</div>
                <ul className="space-y-2 border border-border rounded-md divide-y divide-border">
                  {sortedSteps.length === 0 ? (
                    <li className="px-3 py-2 text-muted-foreground">No emails in sequence</li>
                  ) : (
                    sortedSteps.map((step, i) => {
                      const stepId = step.id;
                      const firstSent =
                        stepId && firstSentByCampaignEmailId
                          ? firstSentByCampaignEmailId[stepId]
                          : undefined;
                      return (
                        <li key={stepId ?? i} className="px-3 py-2">
                          <div className="font-medium text-foreground">
                            {i + 1}. {step.subject || '(No subject)'}
                          </div>
                          {firstSent ? (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              First sent {format(new Date(firstSent), 'PPp')}
                            </div>
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (currentStep === 'editor') {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0">
          <DialogTitle className="sr-only">Edit campaign email</DialogTitle>
          <HtmlCampaignEmailEditor
            editorSeed={emailDraftChatSessionId}
            initialSubject={templateEditorSubject}
            initialHtmlContent={templateHtml}
            initialComposeKind={templateComposeKind}
            initialFormPayload={templateFormPayload ?? undefined}
            initialWorkspaceTab={editorInitialWorkspaceTab}
            onContinue={handleEditorContinue}
            onSaveTemplate={handleSaveTemplate}
            onSaveAsTemplate={handleSaveAsTemplate}
            defaultSaveAsTemplateName={campaignName || selectedTemplate?.name || 'New template'}
            onCancel={handleEditorCancel}
            campaignJobId={selectedJobId}
            campaignId={campaignId}
            draftChatSessionId={emailDraftChatSessionId}
            loadedTemplate={
              selectedTemplate ? { id: selectedTemplate.id, name: selectedTemplate.name } : null
            }
            onRenameTemplate={handleRenameTemplateFromEditor}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-heading">
                {currentStep === 'details' && 'Create New Campaign'}
                {currentStep === 'template' && 'Choose Email Template'}
                {currentStep === 'sequence' && 'Build Email Sequence'}
                {currentStep === 'audience' && 'Select Audience'}
                {currentStep === 'review' && 'Review & Launch'}
              </DialogTitle>
              <DialogDescription>
                {currentStep === 'details' && 'Set up your campaign name, type, and options'}
                {currentStep === 'template' && 'Select an existing template or create from scratch'}
                {currentStep === 'sequence' && 'Create your email sequence and timing'}
                {currentStep === 'audience' && 'Define who will receive this campaign'}
                {currentStep === 'review' && 'Review your campaign before launching'}
              </DialogDescription>
            </div>
            {currentStep !== 'details' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const stepOrder = ['details', 'template', 'sequence', 'audience', 'review'];
                  const currentIndex = stepOrder.indexOf(currentStep);
                  const prevStep = stepOrder[Math.max(0, currentIndex - 1)];
                  setCurrentStep(prevStep as typeof currentStep);
                  // Save progress when going back so user doesn't lose work
                  try {
                    if (!campaignId && campaignName && emailSteps.length > 0) {
                      const campaign = await createCampaign.mutateAsync({
                        name: ensureCampaignNameWithPeriod(campaignName),
                        type: campaignType || 'email',
                        audience_filter: audienceFilter,
                        ...(sequenceMetadata?.scheduleRecurrence !== undefined && { schedule_recurrence: sequenceMetadata.scheduleRecurrence }),
                        job_id: campaignType === 'job_alert' ? selectedJobId : null,
                        folder_id: selectedFolderId,
                        is_organization_campaign: orgListFields.is_organization_campaign,
                        show_in_org_tab: orgListFields.show_in_org_tab,
                      });
                      setCampaignId(campaign.id);
                      await persistCampaignEmails(campaign.id);
                      if (filteredCandidates && filteredCandidates.length > 0) {
                        await addRecipients.mutateAsync({
                          campaignId: campaign.id,
                          candidateIds: filteredCandidates.map(c => c.id),
                        });
                      }
                      await updateCampaign.mutateAsync({ id: campaign.id, input: { status: 'draft' } });
                    } else if (campaignId) {
                      await updateCampaign.mutateAsync({
                        id: campaignId,
                        input: {
                          name: campaignName,
                          type: campaignType,
                          audience_filter: audienceFilter,
                          ...(sequenceMetadata?.scheduleRecurrence !== undefined && { schedule_recurrence: sequenceMetadata.scheduleRecurrence }),
                          job_id: campaignType === 'job_alert' ? selectedJobId : null,
                          folder_id: selectedFolderId,
                          ...(shouldPersistOrgCampaignFlags
                            ? {
                                is_organization_campaign: orgListFields.is_organization_campaign,
                                show_in_org_tab: orgListFields.show_in_org_tab,
                              }
                            : {}),
                        },
                      });
                      await persistCampaignEmails(campaignId);
                      if (filteredCandidates && filteredCandidates.length > 0) {
                        await addRecipients.mutateAsync({
                          campaignId,
                          candidateIds: filteredCandidates.map((c) => c.id),
                        });
                      }
                    }
                  } catch {
                    // Don't block navigation; save is best-effort
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 mt-4">
            {(['details', 'template', 'sequence', 'audience', 'review'] as const).map((stepKey, index) => {
              const labels = ['Details', 'Template', 'Sequence', 'Audience', 'Review'];
              const isCurrent = currentStep === stepKey;
              const isPast = ['details', 'template', 'sequence', 'audience', 'review'].indexOf(currentStep) > index;
              const canNavigate = index <= furthestStepIndex;
              return (
                <button
                  key={stepKey}
                  type="button"
                  onClick={() => {
                    if (canNavigate) setCurrentStep(stepKey);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 flex-1 min-w-0 py-2 px-2 rounded-md text-sm font-medium transition-colors',
                    isCurrent && 'bg-sky-blue text-white shadow-sm ring-1 ring-sky-blue',
                    isPast && !isCurrent && 'bg-sky-blue/15 text-sky-blue',
                    !isCurrent && !isPast && 'text-muted-foreground bg-muted/50',
                    canNavigate && 'hover:bg-sky-blue/20 hover:text-sky-blue cursor-pointer',
                    !canNavigate && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isCurrent ? 'bg-white/25 text-white' : 'bg-current/20',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="hidden sm:inline truncate">{labels[index]}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div ref={mainScrollRef} className="flex-1 overflow-y-auto mt-6">
          {isLoadingCampaign ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <>
          {currentStep === 'details' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Q1 Frontend Developer Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-type">Campaign Type</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger id="campaign-type">
                    <SelectValue placeholder="Select campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurture">Nurture Campaign</SelectItem>
                    <SelectItem value="event">Event Invitation</SelectItem>
                    <SelectItem value="job_alert">Job Alert</SelectItem>
                    <SelectItem value="reengagement">Re-engagement</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Folder (optional)</Label>
                <Select value={selectedFolderId ?? 'none'} onValueChange={(v) => setSelectedFolderId(v === 'none' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <Folder className="w-4 h-4" />
                          {f.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Organize campaigns into folders for easier finding.</p>
              </div>

              {(isAdmin || requireOrgShared) && (
                <div className="space-y-3">
                  {requireOrgShared ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">Organization (required for your account)</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your admin has turned on org-wide campaign sharing in Settings → Team. For every campaign: teammates
                        can access it, and it also appears under the Organization tab.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <Checkbox
                        id="share-org"
                        checked={shareWithOrganization}
                        onCheckedChange={(v) => setShareWithOrganization(!!v)}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="share-org" className="font-medium cursor-pointer">
                          Share with organization
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          When enabled, teammates can access this campaign. Use the option below to choose whether it also
                          shows under the Organization tab. You can change both anytime, including after the campaign is
                          live.
                        </p>
                      </div>
                    </div>
                  )}
                  {orgListFields.is_organization_campaign && !requireOrgShared && (
                    <div className="flex items-start gap-3 rounded-lg border border-border p-3 ml-0 sm:ml-1">
                      <Checkbox
                        id="show-in-org-tab"
                        checked={showInOrgTab}
                        onCheckedChange={(v) => setShowInOrgTab(!!v)}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="show-in-org-tab" className="font-medium cursor-pointer">
                          Also list under Organization
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Optional for your account: when on, this campaign appears under the Organization tab as well
                          as My Campaigns. When off, it stays only under My Campaigns (teammates can still use it if
                          shared). You can change this anytime, including after launch.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {campaignType === 'job_alert' && (
                <div className="space-y-2">
                  <Label>Select Job (optional)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    {campaignJobs?.length ? (
                      <div className="space-y-1">
                        {campaignJobs.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm ${
                              selectedJobId === job.id ? 'bg-sky-blue/20 border border-sky-blue' : 'hover:bg-muted'
                            }`}
                          >
                            <span className="font-medium">{job.title}</span>
                            {(job.department || job.location) && (
                              <span className="text-xs text-muted-foreground">
                                {[job.department, job.location].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No jobs found. Sync jobs from your career site.</p>
                    )}
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    {selectedJobId
                      ? 'Job selected for merge tags ({{jobTitle}}, etc.)'
                      : 'Optional: Select a job to add job-specific merge tags in your email'}
                  </p>
                </div>
              )}

              <Button 
                className="w-full bg-gradient-primary hover:opacity-90"
                onClick={() => {
                  if (!campaignName.trim() || !campaignType) return;
                  setFurthestStepIndex((f) => Math.max(1, f));
                  setCurrentStep('template');
                }}
                disabled={!campaignName.trim() || !campaignType}
              >
                Continue to Templates
              </Button>
            </div>
          )}

          {currentStep === 'template' && (
            <TemplateLibrary
              onSelectTemplate={handleTemplateSelect}
              onSelectStarterTemplate={handleStarterTemplateSelect}
            />
          )}

          {currentStep === 'sequence' && (
            <SequenceBuilder 
              key={sequenceBuilderNonce}
              template={selectedTemplate} 
              onContinue={handleSequenceContinue}
              templateComposeKind={templateComposeKind}
              templateFormPayload={templateFormPayload}
              templateEditorSubject={templateEditorSubject}
              templateHtml={templateHtml}
              campaignJobId={selectedJobId}
              campaignId={campaignId}
              emailDraftChatSessionId={emailDraftChatSessionId}
              initialSteps={emailSteps.length > 0 ? emailSteps : undefined}
            />
          )}

          {currentStep === 'audience' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                  <CardDescription>Define who should receive this campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Talent Pools Selection */}
                  <div className="space-y-3">
                    <Label>Filter by Talent Pools</Label>
                    <ScrollArea className="h-32 border rounded-md p-3">
                      {talentPools && talentPools.length > 0 ? (
                        <div className="space-y-2">
                          {talentPools.map((pool) => (
                            <div key={pool.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`pool-${pool.id}`}
                                checked={selectedTalentPools.includes(pool.id)}
                                onCheckedChange={() => toggleTalentPool(pool.id)}
                              />
                              <label htmlFor={`pool-${pool.id}`} className="text-sm cursor-pointer">
                                {pool.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No talent pools available</p>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Pipelines Selection */}
                  <div className="space-y-3">
                    <Label>Filter by Pipelines</Label>
                    <ScrollArea className="h-32 border rounded-md p-3">
                      {pipelines && pipelines.length > 0 ? (
                        <div className="space-y-2">
                          {pipelines.map((pipeline) => (
                            <div key={pipeline.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`pipeline-${pipeline.id}`}
                                checked={selectedPipelines.includes(pipeline.id)}
                                onCheckedChange={() => togglePipeline(pipeline.id)}
                              />
                              <label htmlFor={`pipeline-${pipeline.id}`} className="text-sm cursor-pointer">
                                {pipeline.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No pipelines available</p>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Stoplight filter */}
                  <div className="space-y-3">
                    <Label>Filter by lead status</Label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          id="lead-red"
                          checked={selectedLeadStatus.includes("red")}
                          onCheckedChange={() => toggleLeadStatus("red")}
                          className="border-muted-foreground data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                        />
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          Recently contacted (2 weeks)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          id="lead-yellow"
                          checked={selectedLeadStatus.includes("yellow")}
                          onCheckedChange={() => toggleLeadStatus("yellow")}
                          className="border-muted-foreground data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          Contacted 2 weeks–2 months ago
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          id="lead-green"
                          checked={selectedLeadStatus.includes("green")}
                          onCheckedChange={() => toggleLeadStatus("green")}
                          className="border-muted-foreground data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          No contact in 2+ months
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave all unchecked to include all leads. Select one or more to filter.
                    </p>
                  </div>

                  {/* Recipient Count */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-sky-blue" />
                      <div>
                        <div className="font-semibold text-foreground">Estimated Recipients</div>
                        <div className="text-sm text-muted-foreground">
                          Based on current filters
                          {(recipientCount ?? 0) === 0 && !isLoadingCandidates && (
                            <span className="block mt-1 text-amber-600 dark:text-amber-500">
                              Select at least one talent pool or pipeline to define your audience.
                            </span>
                          )}
                          {userRole === 'recruiter' && (recipientCount ?? 0) > 0 && (
                            <span className="block mt-0.5 text-muted-foreground">
                              Recruiter limit: {getRecipientLimitForRole(userRole)?.toLocaleString()} recipients
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-sky-blue">
                      {isLoadingCandidates ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        recipientCount || 0
                      )}
                    </div>
                  </div>

                  {/* Role limit warning */}
                  {recipientCount !== undefined && recipientCount > 0 && isOverRecipientLimit(userRole, recipientCount) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Recipient limit exceeded</AlertTitle>
                      <AlertDescription>
                        Recruiters can send to a maximum of {getRecipientLimitForRole(userRole)?.toLocaleString()} recipients. 
                        You have {recipientCount.toLocaleString()} selected. Narrow your audience or ask an Admin to send this campaign.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Preview Recipients */}
                  {filteredCandidates && filteredCandidates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Preview Recipients</Label>
                      <ScrollArea className="h-32 border rounded-md p-3">
                        <div className="space-y-1">
                          {filteredCandidates.slice(0, 10).map((candidate) => (
                            <div key={candidate.id} className="flex items-center gap-2 text-sm">
                              <LeadUsageIndicator
                                lastActivityAt={candidate.last_activity_at ? new Date(candidate.last_activity_at) : null}
                              />
                              <span>
                                {candidate.first_name} {candidate.last_name} - {candidate.email}
                              </span>
                            </div>
                          ))}
                          {filteredCandidates.length > 10 && (
                            <div className="text-sm text-muted-foreground">
                              And {filteredCandidates.length - 10} more...
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <Button 
                    className="w-full bg-gradient-primary hover:opacity-90" 
                    onClick={() => {
                      setFurthestStepIndex((f) => Math.max(4, f));
                      setCurrentStep('review');
                    }}
                    disabled={
                      !filteredCandidates ||
                      filteredCandidates.length === 0 ||
                      (recipientCount !== undefined && isOverRecipientLimit(userRole, recipientCount))
                    }
                  >
                    Continue to Review
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              {(sequenceMetadata?.sendImmediately === false ? scheduleSendBlocker : launchSendBlocker) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Complete these before sending</AlertTitle>
                  <AlertDescription>
                    {sequenceMetadata?.sendImmediately === false ? scheduleSendBlocker : launchSendBlocker}
                  </AlertDescription>
                </Alert>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Summary</CardTitle>
                  <CardDescription>Review your campaign before launching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Test email — prominent, before actions */}
                  <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">Preview before launching</div>
                        <div className="text-sm text-muted-foreground">
                          Send a test to yourself to see how your email looks.
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendTest}
                        disabled={sendingTest || emailSteps.length === 0}
                      >
                        {sendingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                        {sendingTest ? 'Sending...' : 'Send test'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Campaign Name</div>
                      <div className="font-semibold text-foreground">{campaignName || 'Untitled Campaign'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Type</div>
                      <Badge variant="secondary">{campaignType}</Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Recipients</div>
                      <div className="font-semibold text-foreground">{recipientCount || 0} candidates</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Emails in Sequence</div>
                      <div className="font-semibold text-foreground">{emailSteps.length} emails</div>
                    </div>
                  </div>

                  {/* What happens next — reflects Sequence choices */}
                  <div className="rounded-lg border border-border p-4 bg-muted/20">
                    <div className="text-sm font-medium text-foreground mb-1">What happens next</div>
                    {sequenceMetadata?.sendImmediately ? (
                      <p className="text-sm text-muted-foreground">
                        Emails will be sent immediately to your recipients when you launch.
                      </p>
                    ) : sequenceMetadata?.firstSendDate && sequenceMetadata?.scheduleTime ? (
                      <p className="text-sm text-muted-foreground">
                        Emails will be queued for {format(parse(sequenceMetadata.firstSendDate, 'yyyy-MM-dd', new Date()), 'PPP')} at {formatHhmmAs12h(sequenceMetadata.scheduleTime)}. They will be sent on the next hourly run. View and manage in the <strong>Upcoming Sends</strong> tab.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Go back to the Sequence step to choose when the first email sends (immediately or scheduled).
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-3 mt-6">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleSaveAsDraft}
                        disabled={createCampaign.isPending || updateCampaign.isPending}
                      >
                        {createCampaign.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save as Draft
                      </Button>
                      
                      {!sequenceMetadata?.sendImmediately ? (
                        <Button 
                          className="flex-1 bg-gradient-primary hover:opacity-90"
                          onClick={() => runWithValidation('schedule')}
                          disabled={
                            createCampaign.isPending ||
                            updateCampaign.isPending ||
                            isQueueingSchedule ||
                            !!scheduleSendBlocker
                          }
                        >
                          {createCampaign.isPending || isQueueingSchedule ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CalendarIcon className="w-4 h-4 mr-2" />
                          )}
                          {isQueueingSchedule ? 'Queuing…' : 'Schedule Campaign'}
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1 bg-gradient-primary hover:opacity-90"
                          onClick={() => runWithValidation('launch')}
                          disabled={
                            createCampaign.isPending || updateCampaign.isPending || !!launchSendBlocker
                          }
                        >
                          {createCampaign.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Launch Campaign
                        </Button>
                      )}
                  </div>
                  <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Some recipients will be excluded</AlertDialogTitle>
                        <AlertDialogDescription>
                          {validationData && (
                            <>
                              <span className="font-medium text-foreground">{validationData.valid} recipients</span> will receive your email.
                              {validationData.noEmail > 0 && (
                                <span className="block mt-2">{validationData.noEmail} candidates have no email address and will be excluded.</span>
                              )}
                              {validationData.unsubscribed > 0 && (
                                <span className="block mt-1">{validationData.unsubscribed} have unsubscribed and will be excluded.</span>
                              )}
                              <span className="block mt-2">Continue with the remaining recipients?</span>
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={validationActionPending}
                          onClick={(e) => {
                            e.preventDefault();
                            if (validationActionPending || !pendingAction) return;
                            setValidationActionPending(true);
                            void (async () => {
                              try {
                                const action = pendingAction;
                                let ok = false;
                                if (action === 'launch') ok = await handleLaunchCampaign();
                                else if (action === 'schedule') ok = await handleScheduleCampaign();
                                if (ok) {
                                  setShowValidationDialog(false);
                                  setPendingAction(null);
                                }
                              } finally {
                                setValidationActionPending(false);
                              }
                            })();
                          }}
                        >
                          {validationActionPending ? (
                            <span className="inline-flex items-center">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Working…
                            </span>
                          ) : (
                            'Continue'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          )}
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
