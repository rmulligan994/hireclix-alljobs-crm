"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Save, Plus, Trash2, Copy, GitBranch, Building2 } from 'lucide-react';
import { defaultTemplates, PipelineTemplate } from '@/data/pipelineStages';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useCurrentUser, useUpdateProfile, useAllProfiles } from '@/hooks/useAuth';

const Settings = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const { toast } = useToast();
  const [customTemplates, setCustomTemplates] = useState<PipelineTemplate[]>([]);
  const { settings: orgSettings, update: updateOrgSettings, isUpdating: isUpdatingOrg } = useOrganizationSettings();
  const [orgCompany, setOrgCompany] = useState('');
  const [orgBrand, setOrgBrand] = useState('');
  const [orgBaseUrl, setOrgBaseUrl] = useState('');

  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();
  const userId = currentUser?.id;
  const profile = currentUser?.profile;
  const updateProfile = useUpdateProfile();
  const { data: allProfiles = [], isLoading: teamLoading, isError: teamError, refetch: refetchTeam } = useAllProfiles(!!userId);

  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTitle, setProfileTitle] = useState('');
  const [profileCompany, setProfileCompany] = useState('');

  useEffect(() => {
    if (currentUser) {
      setProfileFirstName(profile?.firstName ?? '');
      setProfileLastName(profile?.lastName ?? '');
      setProfileEmail(profile?.email ?? currentUser.email ?? '');
      setProfileTitle(profile?.title ?? '');
      setProfileCompany(profile?.company ?? '');
    }
  }, [currentUser, profile]);

  useEffect(() => {
    if (orgSettings) {
      setOrgCompany(orgSettings.company_name || '');
      setOrgBrand(orgSettings.brand_name || '');
      setOrgBaseUrl(orgSettings.base_url || '');
    }
  }, [orgSettings]);

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
        },
      });
    } catch {
      toast({ title: 'Failed to save profile', variant: 'destructive' });
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
        <TopBar 
          onCopilotToggle={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
        />
        
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
                      placeholder="https://your-app.com"
                    />
                    <p className="text-sm text-muted-foreground">
                      Used for unsubscribe links. Include protocol (https://).
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
                                {isCurrentUser ? 'Admin' : 'Member'}
                              </Badge>
                              {!isCurrentUser && (
                                <Button variant="ghost" size="sm">Manage</Button>
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

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};

export default Settings;
