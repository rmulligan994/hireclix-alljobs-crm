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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SequenceBuilder } from './SequenceBuilder';
import { TemplateLibrary } from './TemplateLibrary';
import { BeefreeEmailEditor } from './BeefreeEmailEditor';
import { ArrowLeft, Save, Send, Calendar as CalendarIcon, Clock, Users, Loader2, Search, AlertTriangle } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useCreateCampaign, useUpdateCampaign, useRecipientCount, useFilteredCandidates, useAddCampaignRecipients, useCreateCampaignEmail } from '@/hooks/useCampaigns';
import { useTalentPools } from '@/hooks/useTalentPools';
import { usePipelines } from '@/hooks/usePipelines';
import { useJobsForCampaign } from '@/hooks/useJobs';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { EmailTemplate } from '@/services/emailTemplateService';
import { AudienceFilter, CampaignEmail, Campaign } from '@/types/Campaign';
import { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

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
      setSelectedJobId(editingCampaign.job_id ?? null);
      if (editingCampaign.audience_filter) {
        const filter = editingCampaign.audience_filter as AudienceFilter;
        setAudienceFilter(filter);
        setSelectedTalentPools(filter.talentPoolIds || []);
        setSelectedPipelines(filter.pipelineIds || []);
        setSelectedTags(filter.tags || []);
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
      setCurrentStep('editor');
    }
  }, [open, editingCampaign, initialTemplate]);
  
  // Audience state
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const [selectedTalentPools, setSelectedTalentPools] = useState<string[]>([]);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Schedule state
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isScheduled, setIsScheduled] = useState(false);

  // Job state (for job_alert campaigns)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState('');
  
  const { toast } = useToast();
  const { createTemplate } = useEmailTemplates();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const addRecipients = useAddCampaignRecipients();
  const createCampaignEmail = useCreateCampaignEmail();
  const { data: talentPools } = useTalentPools();
  const { data: pipelines } = usePipelines();
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
    });
  }, [selectedTalentPools, selectedPipelines, selectedTags]);

  const handleTemplateSelect = (template: EmailTemplate | null) => {
    setSelectedTemplate(template);
    if (template?.bee_json && typeof template.bee_json === 'object' && !Array.isArray(template.bee_json)) {
      setTemplateBeeJson(template.bee_json as Record<string, unknown>);
    } else {
      setTemplateBeeJson(null);
    }
    setCurrentStep('editor');
  };

  const handleEditorSave = (beeJson: Record<string, unknown>, html: string) => {
    setTemplateBeeJson(beeJson);
    setTemplateHtml(html);
    
    if (!selectedTemplate) {
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

  const handleSequenceContinue = (steps: Partial<CampaignEmail>[]) => {
    setEmailSteps(steps);
    setCurrentStep('audience');
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
    if (!scheduleDate) {
      toast({
        title: 'Schedule required',
        description: 'Please select a date and time to schedule the campaign.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const scheduledAt = new Date(scheduleDate);
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
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
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
            job_id: campaignType === 'job_alert' ? selectedJobId : null,
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
      if (!campaignId) {
        const campaign = await createCampaign.mutateAsync({
          name: campaignName,
          type: campaignType,
          goal: campaignGoal,
          audience_filter: audienceFilter,
          job_id: campaignType === 'job_alert' ? selectedJobId : null,
        });
        setCampaignId(campaign.id);
        
        // Save email steps
        if (emailSteps.length > 0) {
          await saveCampaignEmails(campaign.id);
        }
        
        await updateCampaign.mutateAsync({
          id: campaign.id,
          input: { status: 'active', job_id: campaignType === 'job_alert' ? selectedJobId : null },
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
          input: { status: 'active', job_id: campaignType === 'job_alert' ? selectedJobId : null },
        });
      }

      toast({
        title: 'Campaign launched!',
        description: 'Your campaign is now active and emails will begin sending.',
      });
      handleClose();
    } catch (err) {
      toast({
        title: 'Launch failed',
        description: 'Failed to launch campaign. Please try again.',
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
    setScheduleDate(undefined);
    setIsScheduled(false);
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
                onClick={() => {
                  const steps = ['details', 'template', 'sequence', 'audience', 'review'];
                  const currentIndex = steps.indexOf(currentStep);
                  setCurrentStep(steps[currentIndex - 1] as typeof currentStep);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            {['Details', 'Template', 'Sequence', 'Audience', 'Review'].map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`h-2 flex-1 rounded ${
                  ['details', 'template', 'sequence', 'audience', 'review'].indexOf(currentStep) >= index
                    ? 'bg-sky-blue'
                    : 'bg-muted'
                }`} />
                {index < 4 && <div className="w-2" />}
              </div>
            ))}
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

                  {/* Recipient Count */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-sky-blue" />
                      <div>
                        <div className="font-semibold text-foreground">Estimated Recipients</div>
                        <div className="text-sm text-muted-foreground">Based on current filters</div>
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

                  {/* Preview Recipients */}
                  {filteredCandidates && filteredCandidates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Preview Recipients</Label>
                      <ScrollArea className="h-32 border rounded-md p-3">
                        <div className="space-y-1">
                          {filteredCandidates.slice(0, 10).map((candidate) => (
                            <div key={candidate.id} className="text-sm">
                              {candidate.first_name} {candidate.last_name} - {candidate.email}
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
                    disabled={!filteredCandidates || filteredCandidates.length === 0}
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

                  {/* Schedule Option */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="schedule-campaign"
                        checked={isScheduled}
                        onCheckedChange={(checked) => setIsScheduled(checked === true)}
                      />
                      <label htmlFor="schedule-campaign" className="text-sm font-medium cursor-pointer">
                        Schedule for later
                      </label>
                    </div>

                    {isScheduled && (
                      <div className="flex items-center space-x-4 pl-6">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {scheduleDate ? format(scheduleDate, 'PPP') : 'Pick a date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={scheduleDate}
                              onSelect={setScheduleDate}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>

                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
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
                    
                    {isScheduled ? (
                      <Button 
                        className="flex-1 bg-gradient-primary hover:opacity-90"
                        onClick={handleScheduleCampaign}
                        disabled={createCampaign.isPending || updateCampaign.isPending || !scheduleDate}
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
                        onClick={handleLaunchCampaign}
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
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
