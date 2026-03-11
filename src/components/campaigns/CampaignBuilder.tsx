import { useState, useEffect } from 'react';
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
import { BeefreeEmailEditor } from './BeefreeEmailEditor';
import { ArrowLeft, Save, Send, Calendar as CalendarIcon, Users, Loader2, Search, AlertTriangle, Mail, Folder } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useCreateCampaign, useUpdateCampaign, useRecipientCount, useFilteredCandidates, useAddCampaignRecipients, useCreateCampaignEmail } from '@/hooks/useCampaigns';
import { useQueryClient } from '@tanstack/react-query';
import { useTalentPools } from '@/hooks/useTalentPools';
import { usePipelines } from '@/hooks/usePipelines';
import { useCampaignFolders } from '@/hooks/useCampaignFolders';
import { useJobsForCampaign } from '@/hooks/useJobs';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { isOverRecipientLimit, getRecipientLimitForRole } from '@/config/roleLimits';
import { EmailTemplate } from '@/services/emailTemplateService';
import { AudienceFilter, CampaignEmail, Campaign, LeadStatus } from '@/types/Campaign';
import { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LeadUsageIndicator } from '@/components/candidates/LeadUsageIndicator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { campaignService } from '@/services/campaignService';

interface CampaignBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCampaign?: Campaign | null;
  initialTemplate?: EmailTemplate | null;
}

export const CampaignBuilder = ({ open, onOpenChange, editingCampaign, initialTemplate }: CampaignBuilderProps) => {
  const [currentStep, setCurrentStep] = useState<'details' | 'template' | 'editor' | 'sequence' | 'audience' | 'review'>('details');
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateBeeJson, setTemplateBeeJson] = useState<Record<string, unknown> | null>(null);
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [emailSteps, setEmailSteps] = useState<Partial<CampaignEmail>[]>([]);

  // Initialize from editing campaign
  useEffect(() => {
    if (editingCampaign) {
      setCampaignName(editingCampaign.name);
      setCampaignType(editingCampaign.type);
      setCampaignGoal(editingCampaign.goal || '');
      setCampaignId(editingCampaign.id);
      setSelectedFolderId(editingCampaign.folder_id ?? null);
      setSelectedJobId(editingCampaign.job_id ?? null);
      if (editingCampaign.audience_filter) {
        const filter = editingCampaign.audience_filter as AudienceFilter;
        setAudienceFilter(filter);
        setSelectedTalentPools(filter.talentPoolIds || []);
        setSelectedPipelines(filter.pipelineIds || []);
        setSelectedTags(filter.tags || []);
        setSelectedLeadStatus(filter.leadStatus || []);
      }
    }
  }, [editingCampaign]);

  // When opening with initialTemplate (from Template Library), go straight to editor
  useEffect(() => {
    if (open && !editingCampaign && initialTemplate !== undefined) {
      setSelectedTemplate(initialTemplate ?? null);
      if (initialTemplate?.bee_json && typeof initialTemplate.bee_json === 'object' && !Array.isArray(initialTemplate.bee_json)) {
        setTemplateBeeJson(initialTemplate.bee_json as Record<string, unknown>);
      } else {
        setTemplateBeeJson(null);
      }
      setTemplateHtml(initialTemplate?.html_content ?? null);
      setCurrentStep('editor');
    }
  }, [open, editingCampaign, initialTemplate]);
  
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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createTemplate, updateTemplate } = useEmailTemplates();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const addRecipients = useAddCampaignRecipients();
  const createCampaignEmail = useCreateCampaignEmail();
  const { data: talentPools } = useTalentPools();
  const { data: pipelines } = usePipelines();
  const { data: folders } = useCampaignFolders();
  const userRole = useCurrentUserRole();
  const { settings: orgSettings } = useOrganizationSettings();
  const { data: campaignJobs } = useJobsForCampaign(jobSearch);
  const { data: filteredCandidates, isLoading: isLoadingCandidates } = useFilteredCandidates(audienceFilter);
  const { data: recipientCount } = useRecipientCount(audienceFilter);

  // Helper to save campaign emails
  const saveCampaignEmails = async (campaignId: string) => {
    for (const step of emailSteps) {
      await createCampaignEmail.mutateAsync({
        campaign_id: campaignId,
        step_order: step.step_order || 1,
        delay_days: step.delay_days || 0,
        delay_hours: step.delay_hours || 0,
        subject: step.subject || 'Untitled',
        bee_json: step.bee_json,
        html_content: step.html_content,
      });
    }
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

  const handleTemplateSelect = (template: EmailTemplate | null) => {
    setSelectedTemplate(template);
    if (template?.bee_json && typeof template.bee_json === 'object' && !Array.isArray(template.bee_json)) {
      setTemplateBeeJson(template.bee_json as Record<string, unknown>);
    } else {
      setTemplateBeeJson(null);
    }
    setTemplateHtml(template?.html_content ?? null);
    setCurrentStep('editor');
  };

  const handleEditorSave = (beeJson: Record<string, unknown>, html: string) => {
    setTemplateBeeJson(beeJson);
    setTemplateHtml(html);
    
    if (selectedTemplate) {
      updateTemplate({
        id: selectedTemplate.id,
        input: {
          bee_json: beeJson as Json,
          html_content: html,
        },
      });
    } else {
      createTemplate({
        name: campaignName || 'Untitled Template',
        category: campaignType || 'custom',
        bee_json: beeJson as Json,
        html_content: html,
      });
    }
    
    setCurrentStep('sequence');
  };

  const handleEditorCancel = () => {
    setCurrentStep('template');
  };

  const handleSequenceContinue = (steps: Partial<CampaignEmail>[], opts?: { firstSendDate?: string; metadata?: SequenceMetadata }) => {
    setEmailSteps(steps);
    setSequenceMetadata(opts?.metadata ?? null);
    setCurrentStep('audience');
  };

  const handleSendTest = async () => {
    if (emailSteps.length === 0) {
      toast({ title: 'Add at least one email to the sequence', variant: 'destructive' });
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
          name: campaignName || 'Test',
          type: campaignType,
          goal: campaignGoal,
          audience_filter: audienceFilter,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
        });
        setCampaignId(campaign.id);
        testCampaignId = campaign.id;
        if (emailSteps.length > 0) await saveCampaignEmails(campaign.id);
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
    if (!filteredCandidates || filteredCandidates.length === 0) {
      if (action === 'launch') handleLaunchCampaign();
      else handleScheduleCampaign();
      return;
    }
    const candidateIds = filteredCandidates.map(c => c.id);
    campaignService.getRecipientValidation(campaignId || '', candidateIds).then((v) => {
      if (v.noEmail > 0 || v.unsubscribed > 0) {
        setValidationData(v);
        setPendingAction(action);
        setShowValidationDialog(true);
      } else {
        if (action === 'launch') handleLaunchCampaign();
        else handleScheduleCampaign();
      }
    });
  };

  const handleSaveAsDraft = async () => {
    try {
      if (!campaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: campaignName,
          type: campaignType,
          goal: campaignGoal,
          audience_filter: audienceFilter,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
        });
        setCampaignId(campaign.id);
        
        // Save email steps
        if (emailSteps.length > 0) {
          await saveCampaignEmails(campaign.id);
        }
        
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
            goal: campaignGoal,
            status: 'draft',
            audience_filter: audienceFilter,
            job_id: campaignType === 'job_alert' ? selectedJobId : null,
            folder_id: selectedFolderId,
          },
        });
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

  const handleScheduleCampaign = async () => {
    const firstDate = sequenceMetadata?.firstSendDate;
    const scheduleTime = sequenceMetadata?.scheduleTime ?? '09:00';
    if (!firstDate) {
      toast({
        title: 'Schedule required',
        description: 'Please set a scheduled date in the Sequence step.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const scheduledAt = new Date(firstDate);
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      scheduledAt.setHours(hours, minutes);
      const scheduledAtIso = scheduledAt.toISOString();

      let finalCampaignId = campaignId;

      if (!campaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: campaignName,
          type: campaignType,
          goal: campaignGoal,
          audience_filter: audienceFilter,
          scheduled_at: scheduledAtIso,
          schedule_recurrence: sequenceMetadata?.scheduleRecurrence ?? null,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
        });
        setCampaignId(campaign.id);
        finalCampaignId = campaign.id;
        
        // Save email steps
        if (emailSteps.length > 0) {
          await saveCampaignEmails(campaign.id);
        }
        
        await updateCampaign.mutateAsync({
          id: campaign.id,
          input: { status: 'scheduled' },
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
            status: 'scheduled',
            scheduled_at: scheduledAtIso,
            schedule_recurrence: sequenceMetadata?.scheduleRecurrence ?? null,
            job_id: campaignType === 'job_alert' ? selectedJobId : null,
            folder_id: selectedFolderId,
          },
        });
      }

      // Queue emails with Mailgun via o:deliverytime
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: { campaignId: finalCampaignId, scheduledAt: scheduledAtIso },
      });

      if (error) {
        throw error;
      }

      const queued = data?.sent ?? 0;

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });

      toast({
        title: 'Campaign scheduled',
        description: `${queued} emails queued for ${format(scheduledAt, 'PPP')} at ${scheduleTime}.`,
      });
      handleClose();
    } catch (err) {
      toast({
        title: 'Schedule failed',
        description: (err as Error)?.message || 'Failed to schedule campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLaunchCampaign = async () => {
    try {
      let finalCampaignId = campaignId;

      if (!campaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: campaignName,
          type: campaignType,
          goal: campaignGoal,
          audience_filter: audienceFilter,
          schedule_recurrence: sequenceMetadata?.scheduleRecurrence ?? null,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
          folder_id: selectedFolderId,
        });
        setCampaignId(campaign.id);
        finalCampaignId = campaign.id;

        // Save email steps
        if (emailSteps.length > 0) {
          await saveCampaignEmails(campaign.id);
        }

        await updateCampaign.mutateAsync({
          id: campaign.id,
          input: { status: 'active', job_id: campaignType === 'job_alert' ? selectedJobId : null, folder_id: selectedFolderId },
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
          input: { status: 'active', job_id: campaignType === 'job_alert' ? selectedJobId : null, folder_id: selectedFolderId },
        });
      }

      // Invoke edge function to send step 1 immediately and queue step 2+
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: { campaignId: finalCampaignId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });

      toast({
        title: 'Campaign launched!',
        description: 'Your campaign is now active and emails will begin sending.',
      });
      handleClose();
    } catch (err) {
      toast({
        title: 'Launch failed',
        description: (err as Error)?.message || 'Failed to launch campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setCurrentStep('details');
    setCampaignName('');
    setCampaignType('');
    setCampaignGoal('');
    setSelectedTemplate(null);
    setTemplateBeeJson(null);
    setTemplateHtml(null);
    setCampaignId(null);
    setEmailSteps([]);
    setAudienceFilter({});
    setSelectedTalentPools([]);
    setSelectedPipelines([]);
    setSelectedTags([]);
    setSequenceMetadata(null);
    setSelectedFolderId(null);
    setSelectedJobId(null);
    setJobSearch('');
    onOpenChange(false);
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

  if (currentStep === 'editor') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0">
          <BeefreeEmailEditor
            initialTemplate={templateBeeJson}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
            campaignJobId={selectedJobId}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                {currentStep === 'details' && 'Set up your campaign details and objectives'}
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
                        name: campaignName,
                        type: campaignType || 'email',
                        goal: campaignGoal,
                        audience_filter: audienceFilter,
                        ...(sequenceMetadata?.scheduleRecurrence !== undefined && { schedule_recurrence: sequenceMetadata.scheduleRecurrence }),
                        job_id: campaignType === 'job_alert' ? selectedJobId : null,
                        folder_id: selectedFolderId,
                      });
                      setCampaignId(campaign.id);
                      await saveCampaignEmails(campaign.id);
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
                          goal: campaignGoal,
                          audience_filter: audienceFilter,
                          ...(sequenceMetadata?.scheduleRecurrence !== undefined && { schedule_recurrence: sequenceMetadata.scheduleRecurrence }),
                          job_id: campaignType === 'job_alert' ? selectedJobId : null,
                          folder_id: selectedFolderId,
                        },
                      });
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
              const isClickable = !!editingCampaign;
              return (
                <button
                  key={stepKey}
                  type="button"
                  onClick={() => isClickable && setCurrentStep(stepKey)}
                  className={cn(
                    'flex items-center gap-1.5 flex-1 min-w-0 py-2 px-2 rounded-md text-sm font-medium transition-colors',
                    isCurrent && 'bg-sky-blue/20 text-sky-blue ring-1 ring-sky-blue/30',
                    isPast && !isCurrent && 'bg-sky-blue/10 text-sky-blue',
                    !isCurrent && !isPast && 'text-muted-foreground bg-muted/50',
                    isClickable && 'hover:bg-muted cursor-pointer',
                    !isClickable && 'cursor-default'
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/20 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="hidden sm:inline truncate">{labels[index]}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-6">
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
                <Label htmlFor="campaign-goal">Campaign Goal</Label>
                <Input 
                  id="campaign-goal" 
                  placeholder="What do you want to achieve?"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                />
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
                onClick={() => setCurrentStep('template')}
                disabled={!campaignName || !campaignType}
              >
                Continue to Templates
              </Button>
            </div>
          )}

          {currentStep === 'template' && (
            <TemplateLibrary onSelectTemplate={handleTemplateSelect} />
          )}

          {currentStep === 'sequence' && (
            <SequenceBuilder 
              template={selectedTemplate} 
              onContinue={handleSequenceContinue}
              templateBeeJson={templateBeeJson}
              templateHtml={templateHtml}
              campaignJobId={selectedJobId}
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
                    onClick={() => setCurrentStep('review')}
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
              {(!orgSettings?.base_url || !orgSettings.base_url.trim()) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Base URL not set</AlertTitle>
                  <AlertDescription>
                    Set Base URL in Settings → Organization so unsubscribe links work.
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
                        Emails will be queued for {format(new Date(sequenceMetadata.firstSendDate), 'PPP')} at {sequenceMetadata.scheduleTime}. They will be sent on the next hourly run. View and manage in the <strong>Upcoming Sends</strong> tab.
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
                          disabled={createCampaign.isPending || updateCampaign.isPending || !sequenceMetadata?.firstSendDate}
                        >
                          {createCampaign.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CalendarIcon className="w-4 h-4 mr-2" />
                          )}
                          Schedule Campaign
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1 bg-gradient-primary hover:opacity-90"
                          onClick={() => runWithValidation('launch')}
                          disabled={createCampaign.isPending || updateCampaign.isPending}
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
                          onClick={() => {
                            if (pendingAction === 'launch') handleLaunchCampaign();
                            else if (pendingAction === 'schedule') handleScheduleCampaign();
                            setShowValidationDialog(false);
                            setPendingAction(null);
                          }}
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
