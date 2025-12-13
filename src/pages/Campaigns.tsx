import { useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { CampaignBuilder } from '@/components/campaigns/CampaignBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Play, Pause, Mail, Calendar, TrendingUp, Users, Trash2, Send, Loader2, Pencil } from 'lucide-react';
import { useCampaigns, useUpdateCampaign, useDeleteCampaign } from '@/hooks/useCampaigns';
import { useAllCampaignsStats } from '@/hooks/useCampaignStats';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign } from '@/types/Campaign';

const Campaigns = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  
  const { data: campaigns, isLoading, refetch } = useCampaigns();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const { toast } = useToast();

  const campaignIds = useMemo(() => campaigns?.map(c => c.id) || [], [campaigns]);
  const { statsMap } = useAllCampaignsStats(campaignIds);

  const filteredCampaigns = campaigns?.filter(campaign => {
    if (activeTab === 'all') return true;
    return campaign.status === activeTab;
  }) || [];

  // Calculate aggregate stats
  const totalRecipients = Object.values(statsMap).reduce((sum, s) => sum + s.recipients, 0);
  const totalOpened = Object.values(statsMap).reduce((sum, s) => sum + s.opened, 0);
  const totalResponded = Object.values(statsMap).reduce((sum, s) => sum + s.responded, 0);
  const overallOpenRate = totalRecipients > 0 ? Math.round((totalOpened / totalRecipients) * 100) : 0;
  const overallResponseRate = totalRecipients > 0 ? Math.round((totalResponded / totalRecipients) * 100) : 0;

  const stats = {
    active: campaigns?.filter(c => c.status === 'active').length || 0,
    totalRecipients,
    openRate: overallOpenRate,
    responseRate: overallResponseRate,
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await updateCampaign.mutateAsync({ id, input: { status: 'paused' } });
      toast({ title: 'Campaign paused' });
    } catch {
      toast({ title: 'Failed to pause campaign', variant: 'destructive' });
    }
  };

  const handleResumeCampaign = async (id: string) => {
    try {
      await updateCampaign.mutateAsync({ id, input: { status: 'active' } });
      toast({ title: 'Campaign resumed' });
    } catch {
      toast({ title: 'Failed to resume campaign', variant: 'destructive' });
    }
  };

  const handleLaunchCampaign = async (id: string) => {
    setSendingCampaignId(id);
    try {
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: { campaignId: id }
      });

      if (error) throw error;

      toast({ 
        title: 'Campaign launched!', 
        description: `Sent ${data?.sent || 0} emails successfully.`
      });
      
      refetch();
    } catch (err: any) {
      console.error('Error launching campaign:', err);
      toast({ 
        title: 'Failed to launch campaign', 
        description: err.message,
        variant: 'destructive' 
      });
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await deleteCampaign.mutateAsync(id);
      toast({ title: 'Campaign deleted' });
    } catch {
      toast({ title: 'Failed to delete campaign', variant: 'destructive' });
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowCampaignBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowCampaignBuilder(false);
    setEditingCampaign(null);
  };

  const getStatusBadgeClass = (status: string) => {
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                  Campaigns
                </h1>
                <p className="font-body text-muted-foreground">
                  Create and manage email campaigns and sequences
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white">
                  Template Library
                </Button>
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setShowCampaignBuilder(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stats.active}</div>
                    <div className="text-sm text-muted-foreground">Active Campaigns</div>
                  </div>
                  <Mail className="w-8 h-8 text-sky-blue" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{campaigns?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Campaigns</div>
                  </div>
                  <Users className="w-8 h-8 text-sky-blue" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stats.openRate}%</div>
                    <div className="text-sm text-muted-foreground">Open Rate</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-sunrise" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-sky-blue/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stats.responseRate}%</div>
                    <div className="text-sm text-muted-foreground">Response Rate</div>
                  </div>
                  <Calendar className="w-8 h-8 text-sunrise" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns List */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="all">All Campaigns</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6 space-y-4">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-12 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : filteredCampaigns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first campaign to start engaging with candidates.</p>
                    <Button onClick={() => setShowCampaignBuilder(true)} className="bg-gradient-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:border-sky-blue/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            <Badge className={getStatusBadgeClass(campaign.status)}>
                              {campaign.status}
                            </Badge>
                            <Badge variant="secondary">{campaign.type}</Badge>
                          </div>
                          <CardDescription>
                            Created {format(new Date(campaign.created_at), 'PPP')}
                            {campaign.scheduled_at && (
                              <> · Scheduled for {format(new Date(campaign.scheduled_at), 'PPP p')}</>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {campaign.status === 'active' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-sunrise text-sunrise hover:bg-sunrise hover:text-white"
                              onClick={() => handlePauseCampaign(campaign.id)}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                          ) : campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                              onClick={() => handleLaunchCampaign(campaign.id)}
                              disabled={sendingCampaignId === campaign.id}
                            >
                              {sendingCampaignId === campaign.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              {sendingCampaignId === campaign.id ? 'Sending...' : 'Launch'}
                            </Button>
                          ) : campaign.status === 'paused' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                              onClick={() => handleResumeCampaign(campaign.id)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </Button>
                          ) : null}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCampaign(campaign)}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          {(campaign.status === 'draft' || campaign.status === 'paused') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{statsMap[campaign.id]?.recipients ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Recipients</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{statsMap[campaign.id]?.sent ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-sky-blue">{statsMap[campaign.id]?.opened ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Opened</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-sunrise">{statsMap[campaign.id]?.responded ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Responded</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{statsMap[campaign.id]?.responseRate ?? 0}%</div>
                          <div className="text-xs text-muted-foreground">Response Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AICopilot 
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

      <CampaignBuilder 
        open={showCampaignBuilder}
        onOpenChange={handleCloseBuilder}
        editingCampaign={editingCampaign}
      />
    </div>
  );
};

export default Campaigns;
