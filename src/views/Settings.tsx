"use client";

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
import { Save, Plus, Trash2, Copy, GitBranch, Building2, Briefcase, CheckCircle, XCircle, Loader2, CloudDownload, ChevronDown } from 'lucide-react';
import { useJobsSyncLogs, useTriggerJobsSync } from '@/hooks/useJobsSync';
import { defaultTemplates, PipelineTemplate } from '@/data/pipelineStages';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { emailTemplateService, type EmailTemplate } from '@/services/emailTemplateService';
import { useCurrentUser, useUpdateProfile, useAllProfiles } from '@/hooks/useAuth';
import { userService } from '@/services';
import type { UserRole } from '@/types/User';

const Settings = () => {
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast } = useToast();
  const [customTemplates, setCustomTemplates] = useState<PipelineTemplate[]>([]);
  const { settings: orgSettings, update: updateOrgSettings, isUpdating: isUpdatingOrg } = useOrganizationSettings();
  const [orgCompany, setOrgCompany] = useState('');
  const [orgBrand, setOrgBrand] = useState('');
  const [orgBaseUrl, setOrgBaseUrl] = useState('');
  const [webflowSiteId, setWebflowSiteId] = useState('');
  const [webflowCollectionId, setWebflowCollectionId] = useState('');
  const [webflowApiToken, setWebflowApiToken] = useState(''); // Leave blank to keep current
  const [webflowFieldMapping, setWebflowFieldMapping] = useState('');
  const [careerSiteBaseUrl, setCareerSiteBaseUrl] = useState('');
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(false);
  const [welcomeEmailTemplateId, setWelcomeEmailTemplateId] = useState('');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const { data: syncLogs } = useJobsSyncLogs();
  const triggerSync = useTriggerJobsSync();

  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();
  const userId = currentUser?.id;
  const profile = currentUser?.profile;
  const isAdmin = profile?.role === 'admin';
  const updateProfile = useUpdateProfile();
  const { data: allProfiles = [], isLoading: teamLoading, isError: teamError, refetch: refetchTeam } = useAllProfiles(!!userId);

  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTitle, setProfileTitle] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileLinkedinUrl, setProfileLinkedinUrl] = useState('');
  /** While saving campaign visibility prefs for a user (Team tab, admins only). */
  const [campaignPrefsSavingUserId, setCampaignPrefsSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setProfileFirstName(profile?.firstName ?? '');
      setProfileLastName(profile?.lastName ?? '');
      setProfileEmail(profile?.email ?? currentUser.email ?? '');
      setProfileTitle(profile?.title ?? '');
      setProfileCompany(profile?.company ?? '');
      setProfileLinkedinUrl(profile?.linkedinUrl ?? '');
    }
  }, [currentUser, profile]);

  useEffect(() => {
    if (orgSettings) {
      setOrgCompany(orgSettings.company_name || '');
      setOrgBrand(orgSettings.brand_name || '');
      setOrgBaseUrl(orgSettings.base_url || '');
      setWebflowSiteId(orgSettings.webflow_site_id || '');
      setWebflowCollectionId(orgSettings.webflow_collection_id || '');
      setWebflowFieldMapping(
        orgSettings.webflow_job_field_mapping
          ? JSON.stringify(orgSettings.webflow_job_field_mapping, null, 2)
          : ''
      );
      setCareerSiteBaseUrl(orgSettings.career_site_base_url || '');
      setWelcomeEmailEnabled(orgSettings.welcome_email_enabled ?? false);
      setWelcomeEmailTemplateId(orgSettings.welcome_email_template_id || '');
      // Don't load token into state (security); user enters new one to update
    }
  }, [orgSettings]);

  useEffect(() => {
    emailTemplateService.getAll().then(setEmailTemplates).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    if (!userId) {
      toast({ title: 'Please sign in to save your profile', variant: 'destructive' });
      return;
    }
    try {
      await updateProfile.mutateAsync({
        userId,
        data: {
          firstName: profileFirstName || undefined,
          lastName: profileLastName || undefined,
          email: profileEmail || undefined,
          title: profileTitle || undefined,
          company: profileCompany || undefined,
          linkedinUrl: profileLinkedinUrl || undefined,
        },
      });
    } catch {
      toast({ title: 'Failed to save profile', variant: 'destructive' });
    }
  };

  const saveMemberCampaignVisibility = async (
    targetUserId: string,
    data: { requireOrgSharedCampaigns: boolean }
  ) => {
    if (!isAdmin) return;
    if (!targetUserId?.trim()) {
      toast({
        title: 'Cannot save',
        description: 'Missing user id for this team member. Refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }
    setCampaignPrefsSavingUserId(targetUserId);
    try {
      await userService.updateProfile(targetUserId, {
        requireOrgSharedCampaigns: data.requireOrgSharedCampaigns === true,
      });
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({ title: 'Campaign settings updated' });
    } catch (e) {
      console.error('saveMemberCampaignVisibility', e);
      const description =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Could not update profile. Check the browser console for details.';
      toast({ title: 'Failed to save campaign settings', description, variant: 'destructive' });
    } finally {
      setCampaignPrefsSavingUserId(null);
    }
  };

  const handleSaveOrganization = async () => {
    try {
      await updateOrgSettings({
        company_name: orgCompany || null,
        brand_name: orgBrand || null,
        base_url: orgBaseUrl || null,
      });
      toast({ title: 'Organization settings saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleSaveWebflowJobs = async () => {
    try {
      let mapping: Record<string, string> | null = null;
      if (webflowFieldMapping.trim()) {
        try {
          mapping = JSON.parse(webflowFieldMapping) as Record<string, string>;
        } catch {
          toast({ title: 'Invalid field mapping JSON', variant: 'destructive' });
          return;
        }
      }
      if (welcomeEmailEnabled && !welcomeEmailTemplateId) {
        toast({
          title: 'Choose a welcome email template',
          description: 'Or turn off “Send welcome email”.',
          variant: 'destructive',
        });
        return;
      }
      await updateOrgSettings({
        webflow_site_id: webflowSiteId || null,
        webflow_collection_id: webflowCollectionId || null,
        webflow_api_token: webflowApiToken && webflowApiToken.trim() ? webflowApiToken.trim() : undefined,
        webflow_job_field_mapping: mapping,
        career_site_base_url: careerSiteBaseUrl.trim() || null,
        welcome_email_enabled: welcomeEmailEnabled,
        welcome_email_template_id:
          welcomeEmailEnabled && welcomeEmailTemplateId ? welcomeEmailTemplateId : null,
      });
      toast({ title: 'Career site settings saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleDuplicateTemplate = (template: PipelineTemplate) => {
    const newTemplate: PipelineTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      name: `${template.name} (Copy)`,
    };
    setCustomTemplates([...customTemplates, newTemplate]);
    toast({
      title: 'Template duplicated',
      description: `"${newTemplate.name}" has been created.`,
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    setCustomTemplates(customTemplates.filter(t => t.id !== templateId));
    toast({
      title: 'Template deleted',
      description: 'The template has been removed.',
    });
  };

  return (
    <div className="flex h-screen bg-background font-body">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Settings
            </h1>
            <p className="font-body text-muted-foreground">
              Manage your account and application preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
              <TabsTrigger value="webflow-jobs">Career Site</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="templates">Pipeline Templates</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal and company information. Used in campaign email merge tags ({'{{senderName}}'}, {'{{senderCompany}}'}).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentUserLoading ? (
                    <p className="text-muted-foreground">Loading profile...</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={profileFirstName}
                            onChange={(e) => setProfileFirstName(e.target.value)}
                            placeholder="Your first name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={profileLastName}
                            onChange={(e) => setProfileLastName(e.target.value)}
                            placeholder="Your last name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          placeholder="your@email.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="title">Job Title</Label>
                        <Input
                          id="title"
                          value={profileTitle}
                          onChange={(e) => setProfileTitle(e.target.value)}
                          placeholder="e.g. Talent Acquisition Lead"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={profileCompany}
                          onChange={(e) => setProfileCompany(e.target.value)}
                          placeholder="Your company name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn URL</Label>
                        <Input
                          id="linkedin"
                          value={profileLinkedinUrl}
                          onChange={(e) => setProfileLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/yourprofile"
                        />
                        <p className="text-xs text-muted-foreground">Used for recruiter LinkedIn link in campaign emails</p>
                      </div>

                      <Separator />

                      <Button
                        className="bg-gradient-primary hover:opacity-90"
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="organization" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-sky-blue" />
                    Organization Settings
                  </CardTitle>
                  <CardDescription>
                    Instance-wide settings for campaign emails. Used in merge tags ({'{{senderCompany}}'}, {'{{senderBrand}}'}).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="orgCompany">Company Name</Label>
                    <Input
                      id="orgCompany"
                      value={orgCompany}
                      onChange={(e) => setOrgCompany(e.target.value)}
                      placeholder="Your company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgBrand">Brand Name</Label>
                    <Input
                      id="orgBrand"
                      value={orgBrand}
                      onChange={(e) => setOrgBrand(e.target.value)}
                      placeholder="Your brand name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgBaseUrl">Base URL</Label>
                    <Input
                      id="orgBaseUrl"
                      value={orgBaseUrl}
                      onChange={(e) => setOrgBaseUrl(e.target.value)}
                      placeholder="https://your-career-site.com/crm"
                    />
                    <p className="text-sm text-muted-foreground">
                      Full URL where your app lives (e.g. https://yoursite.com/crm). Required for unsubscribe links in emails.
                    </p>
                  </div>
                  <Button
                    className="bg-gradient-primary hover:opacity-90"
                    onClick={handleSaveOrganization}
                    disabled={isUpdatingOrg}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Organization
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webflow-jobs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-sky-blue" />
                    HireClix Career Site Integration
                  </CardTitle>
                  <CardDescription>
                    Connect your career site CMS jobs collection for read-only display on the Jobs tab. The same Site ID and token are used to list Webflow assets when inserting images in campaign emails.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="webflowSiteId">Career Site ID (optional)</Label>
                    <Input
                      id="webflowSiteId"
                      value={webflowSiteId}
                      onChange={(e) => setWebflowSiteId(e.target.value)}
                      placeholder="e.g. 580e63fc8c9a982ac9b8b745"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your career site ID. Optional; only collection ID is required for listing jobs.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webflowCollectionId">Collection ID (required)</Label>
                    <Input
                      id="webflowCollectionId"
                      value={webflowCollectionId}
                      onChange={(e) => setWebflowCollectionId(e.target.value)}
                      placeholder="e.g. 580e63fc8c9a982ac9b8b745"
                    />
                    <p className="text-sm text-muted-foreground">
                      The CMS collection ID for your jobs. Find it in your site designer → Collections → your jobs collection → Settings.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webflowApiToken">API Token (required)</Label>
                    <Input
                      id="webflowApiToken"
                      type="password"
                      value={webflowApiToken}
                      onChange={(e) => setWebflowApiToken(e.target.value)}
                      placeholder="Leave blank to keep current token"
                    />
                    <p className="text-sm text-muted-foreground">
                      Create a token in your career site account settings → Integrations → API Access. For jobs sync: cms:read.
                      For campaign email image picking from Webflow assets, include assets:read and sites:read on the same site.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="careerSiteBaseUrl">Career site base URL (for View link)</Label>
                    <Input
                      id="careerSiteBaseUrl"
                      value={careerSiteBaseUrl}
                      onChange={(e) => setCareerSiteBaseUrl(e.target.value)}
                      placeholder="https://careers.example.com"
                    />
                    <p className="text-sm text-muted-foreground">
                      Base URL for job pages (include https://). View links to: base URL + / + slug. Example: https://www.careers.example.com/jobs
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webflowFieldMapping">Field mapping (optional)</Label>
                    <Textarea
                      id="webflowFieldMapping"
                      value={webflowFieldMapping}
                      onChange={(e) => setWebflowFieldMapping(e.target.value)}
                      placeholder='{"title": "job-title", "department": "department", "location": "location"}'
                      className="font-mono text-sm min-h-[100px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      Map career site field slugs to standard names. Use arrays for composite fields: {`{"location": ["city", "state", "country"]}`}. Leave empty to use defaults.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">Welcome email (talent community)</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        When someone new submits your Webflow career form (with CRM Interaction matching your webhook), send a welcome message. Uses the same merge tags as campaign emails. Set Base URL on the Organization tab so{' '}
                        <span className="font-mono text-xs">{'{{unsubscribeLink}}'}</span> works.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="welcomeEmailEnabled">Send welcome email</Label>
                        <p className="text-sm text-muted-foreground">
                          Sends on every successful career form submission (including when the email already exists).
                        </p>
                      </div>
                      <Switch
                        id="welcomeEmailEnabled"
                        checked={welcomeEmailEnabled}
                        onCheckedChange={setWelcomeEmailEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="welcomeTemplate">Template</Label>
                      <Select
                        value={welcomeEmailTemplateId || '__none__'}
                        onValueChange={(v) => setWelcomeEmailTemplateId(v === '__none__' ? '' : v)}
                        disabled={!welcomeEmailEnabled}
                      >
                        <SelectTrigger id="welcomeTemplate">
                          <SelectValue placeholder="Select a saved template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {emailTemplates
                            .filter((t) => t.html_content?.trim())
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Pick a template that has HTML body content (saved from the email composer).
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Jobs sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Jobs sync from your career site every 15 minutes. Use &quot;Sync now&quot; to run immediately.
                    </p>
                    {syncLogs && syncLogs.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {syncLogs.slice(0, 3).map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                          >
                            <span className="flex items-center gap-2">
                              {log.status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                              {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {log.status === 'failed' && <XCircle className="w-4 h-4 text-destructive" />}
                              {new Date(log.started_at).toLocaleString()} — {log.status}
                              {log.status === 'success' && ` (${log.jobs_upserted} jobs)`}
                              {log.status === 'failed' && log.error_message && (
                                <span className="text-destructive" title={log.error_message}>
                                  : {log.error_message.slice(0, 50)}…
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        triggerSync.mutate(undefined, {
                          onSuccess: () =>
                            toast({ title: 'Sync started', description: 'Jobs are syncing in the background.' }),
                          onError: (err) =>
                            toast({ title: 'Sync failed', description: err.message, variant: 'destructive' }),
                        })
                      }
                      disabled={triggerSync.isPending}
                    >
                      <CloudDownload className={`w-4 h-4 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
                      {triggerSync.isPending ? 'Syncing...' : 'Sync now'}
                    </Button>
                  </div>
                  <Button
                    className="bg-gradient-primary hover:opacity-90"
                    onClick={handleSaveWebflowJobs}
                    disabled={isUpdatingOrg}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Career Site
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about candidate activity
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Campaign Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when campaigns complete or need attention
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Pipeline Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Alerts when candidates have been in a stage too long
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>AI Recommendations</Label>
                      <p className="text-sm text-muted-foreground">
                        Get AI-powered suggestions and insights
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <Button className="bg-gradient-primary hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pipeline" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Configuration</CardTitle>
                  <CardDescription>
                    Customize your pipeline stages and SLA settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Pipeline Stages</Label>
                    <div className="space-y-3">
                      {['Sourced', 'Contacted', 'Engaged', 'Qualified', 'Submitted', 'Hired'].map((stage) => (
                        <div key={stage} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <span className="font-medium">{stage}</span>
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="number" 
                              placeholder="SLA (days)" 
                              className="w-24"
                              defaultValue={stage === 'Sourced' ? '7' : stage === 'Contacted' ? '5' : '10'}
                            />
                            <Button variant="ghost" size="sm">Edit</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <Button className="bg-gradient-primary hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-sky-blue" />
                    Pipeline Templates
                  </CardTitle>
                  <CardDescription>
                    Save and manage reusable stage configurations for new pipelines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Default Templates */}
                  <div className="space-y-3">
                    <Label className="text-foreground">Default Templates</Label>
                    <p className="text-sm text-muted-foreground">
                      Built-in templates that can be used when creating new pipelines
                    </p>
                    <div className="space-y-3">
                      {defaultTemplates.map((template) => (
                        <div key={template.id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-foreground">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDuplicateTemplate(template)}
                              className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Duplicate
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {template.stages.map((stage, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {stage.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Custom Templates */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground">Custom Templates</Label>
                        <p className="text-sm text-muted-foreground">
                          Templates created by your team
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Template
                      </Button>
                    </div>

                    {customTemplates.length === 0 ? (
                      <div className="p-8 border border-dashed border-border rounded-lg text-center">
                        <p className="text-muted-foreground">
                          No custom templates yet. Duplicate a default template or create a new one.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customTemplates.map((template) => (
                          <div key={template.id} className="p-4 border border-border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-foreground">{template.name}</h4>
                                <p className="text-sm text-muted-foreground">{template.description}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">Edit</Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-3">
                              {template.stages.map((stage, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {stage.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    All users in your organization (loaded from database)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teamLoading ? (
                    <p className="text-muted-foreground">Loading team...</p>
                  ) : teamError ? (
                    <p className="text-destructive">Failed to load team. Run the migration: supabase db push</p>
                  ) : allProfiles.length === 0 ? (
                    <p className="text-muted-foreground">No team members yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {allProfiles.map((p) => {
                        const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Unknown';
                        const isCurrentUser = p.userId === userId;
                        const displayRole: UserRole = p.role === 'admin' ? 'admin' : 'recruiter';
                        const handleRoleChange = (newRole: UserRole) => {
                          if (!isAdmin || isCurrentUser) return;
                          updateProfile.mutate(
                            { userId: p.userId, data: { role: newRole } },
                            { onSuccess: () => refetchTeam() }
                          );
                        };
                        return (
                          <div key={p.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                            <div>
                              <div className="font-medium text-foreground">
                                {name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{p.email}</div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className="bg-sky-blue/20 text-sky-blue border-sky-blue">
                                {displayRole === 'admin' ? 'Admin' : 'Recruiter'}
                              </Badge>
                              {isAdmin && !isCurrentUser && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      Manage <ChevronDown className="w-3 h-3 ml-1" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card border-border">
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange('admin')}
                                      disabled={displayRole === 'admin'}
                                      className="cursor-pointer"
                                    >
                                      Set as Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange('recruiter')}
                                      disabled={displayRole === 'recruiter'}
                                      className="cursor-pointer"
                                    >
                                      Set as Recruiter
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchTeam()} disabled={teamLoading}>
                      Refresh
                    </Button>
                    <Button className="bg-gradient-primary hover:opacity-90">
                      Invite Team Member
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Campaign organization sharing</CardTitle>
                    <CardDescription>
                      Per team member: require org-wide sharing to lock the campaign to shared (greyed) controls and the
                      Organization tab rules. If off, they choose on each campaign.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {teamLoading ? (
                      <p className="text-muted-foreground">Loading team…</p>
                    ) : teamError ? (
                      <p className="text-destructive">Could not load team for campaign settings.</p>
                    ) : (
                      <div className="space-y-4">
                        {allProfiles.map((p) => {
                          const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Unknown';
                          const busy = campaignPrefsSavingUserId === p.userId;
                          return (
                            <div
                              key={`campaign-prefs-${p.id}`}
                              className="flex flex-col gap-4 rounded-lg border border-border p-4"
                            >
                              <div>
                                <div className="font-medium text-foreground">
                                  {name}
                                  {p.userId === userId && (
                                    <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">{p.email}</div>
                              </div>
                              <div className="flex items-start justify-between gap-3 rounded-md border border-border/80 bg-muted/20 p-3 sm:max-w-xl">
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <Label className="text-sm">Require org-wide sharing</Label>
                                  <p className="text-xs text-muted-foreground">
                                    When on, this person cannot create private campaigns. Campaign details show fixed
                                    (greyed) &quot;Share with organization&quot; and Organization tab options. When off,
                                    they choose sharing and &quot;Also list under Organization&quot; on each campaign.
                                  </p>
                                </div>
                                <Switch
                                  checked={p.requireOrgSharedCampaigns === true}
                                  disabled={busy}
                                  onCheckedChange={(checked) =>
                                    saveMemberCampaignVisibility(p.userId, { requireOrgSharedCampaigns: checked })
                                  }
                                  aria-label={`Require org-wide campaign sharing for ${name}`}
                                  className="shrink-0"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <Separator />

                  <Button className="bg-gradient-primary hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" />
                    Update Security
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

    </div>
  );
};

export default Settings;
