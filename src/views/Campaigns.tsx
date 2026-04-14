"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AICopilot } from '@/components/dashboard/AICopilot';
import { CampaignBuilder } from '@/components/campaigns/CampaignBuilder';
import { TemplateLibrary } from '@/components/campaigns/TemplateLibrary';
import { CampaignScheduledQueue } from '@/components/campaigns/CampaignScheduledQueue';
import { CampaignSearchBar } from '@/components/campaigns/CampaignSearchBar';
import { CampaignFolderSidebar } from '@/components/campaigns/CampaignFolderSidebar';
import { UpcomingSendsTab } from '@/components/campaigns/UpcomingSendsTab';
import { AddRecipientsModal } from '@/components/campaigns/AddRecipientsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Play, Pause, Mail, Calendar, TrendingUp, Users, Trash2, Send, Loader2, Pencil, ChevronDown, ChevronUp, Copy, UserPlus, Archive, ArchiveRestore, MoreVertical, Folder, FolderOpen, RotateCcw } from 'lucide-react';
import { useMyCampaigns, useOrgCampaigns, useArchivedCampaigns, useCampaign, useUpdateCampaign, useDeleteCampaign, useDuplicateCampaign } from '@/hooks/useCampaigns';
import { useCampaignFolders } from '@/hooks/useCampaignFolders';
import { useAllCampaignsStats } from '@/hooks/useCampaignStats';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign } from '@/types/Campaign';
import type { EmailTemplate } from '@/services/emailTemplateService';

const CAMPAIGN_TYPES = ['nurture', 'event', 'job_alert', 'reengagement', 'newsletter'] as const;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name-az', label: 'Name A–Z' },
  { value: 'name-za', label: 'Name Z–A' },
  { value: 'open-rate', label: 'Open rate' },
  { value: 'click-rate', label: 'Click rate' },
] as const;

const Campaigns = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [scopeTab, setScopeTab] = useState<'my' | 'org' | 'upcoming' | 'archived'>('my');
  const [activeTab, setActiveTab] = useState('all');
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [expandedQueueCampaignId, setExpandedQueueCampaignId] = useState<string | null>(null);
  const [selectedTemplateForCampaign, setSelectedTemplateForCampaign] = useState<EmailTemplate | null | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [addRecipientsCampaignId, setAddRecipientsCampaignId] = useState<string | null>(null);
  const [duplicatingCampaignId, setDuplicatingCampaignId] = useState<string | null>(null);
  const [viewCampaignId, setViewCampaignId] = useState<string | null>(null);
  const { data: campaignForView, isLoading: loadingCampaignForView } = useCampaign(viewCampaignId || '');

  const handledOpenQueryRef = useRef<string | null>(null);
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) {
      handledOpenQueryRef.current = null;
      return;
    }
    if (handledOpenQueryRef.current === openId) return;
    handledOpenQueryRef.current = openId;
    setViewCampaignId(openId);
    setShowCampaignBuilder(true);
    router.replace('/campaigns', { scroll: false });
  }, [searchParams, router]);

  const { data: myCampaigns, isLoading: loadingMy, refetch: refetchMy } = useMyCampaigns();
  const { data: orgCampaigns, isLoading: loadingOrg, refetch: refetchOrg } = useOrgCampaigns();
  const { data: archivedCampaigns, isLoading: loadingArchived, refetch: refetchArchived } = useArchivedCampaigns();

  const campaigns = scopeTab === 'my' ? myCampaigns : scopeTab === 'org' ? orgCampaigns : scopeTab === 'archived' ? archivedCampaigns : [];
  const isLoading = scopeTab === 'my' ? loadingMy : scopeTab === 'org' ? loadingOrg : scopeTab === 'archived' ? loadingArchived : false;
  const refetch = () => { refetchMy(); refetchOrg(); refetchArchived(); };

  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const { data: folders } = useCampaignFolders();
  const { toast } = useToast();

  const handleMoveToFolder = async (campaignId: string, folderId: string | null) => {
    try {
      await updateCampaign.mutateAsync({ id: campaignId, input: { folder_id: folderId } });
      toast({ title: folderId ? 'Moved to folder' : 'Removed from folder' });
      refetch();
    } catch {
      toast({ title: 'Failed to move', variant: 'destructive' });
    }
  };

  const campaignIds = useMemo(() => campaigns?.map(c => c.id) || [], [campaigns]);
  const { statsMap } = useAllCampaignsStats(campaignIds);

  const filteredCampaigns = campaigns?.filter(campaign => {
    if (activeTab !== 'all' && campaign.status !== activeTab) return false;
    if (typeFilter !== 'all' && campaign.type !== typeFilter) return false;
    if (selectedFolderId === 'uncategorized' && campaign.folder_id) return false;
    if (selectedFolderId && selectedFolderId !== 'uncategorized' && campaign.folder_id !== selectedFolderId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = (campaign.name?.toLowerCase().includes(q)) ||
        (campaign.type?.toLowerCase().includes(q)) ||
        (campaign.goal?.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  }) || [];

  const sortedCampaigns = useMemo(() => {
    const arr = [...filteredCampaigns];
    switch (sortBy) {
      case 'newest': return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest': return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'name-az': return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name-za': return arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      case 'open-rate': return arr.sort((a, b) => (statsMap[b.id]?.openRate ?? 0) - (statsMap[a.id]?.openRate ?? 0));
      case 'click-rate': return arr.sort((a, b) => (statsMap[b.id]?.clickRate ?? 0) - (statsMap[a.id]?.clickRate ?? 0));
      default: return arr;
    }
  }, [filteredCampaigns, sortBy, statsMap]);

  // Calculate aggregate stats
  const totalRecipients = Object.values(statsMap).reduce((sum, s) => sum + s.recipients, 0);
  const totalOpened = Object.values(statsMap).reduce((sum, s) => sum + s.opened, 0);
  const totalClicked = Object.values(statsMap).reduce((sum, s) => sum + s.clicked, 0);
  const overallOpenRate = totalRecipients > 0 ? Math.round((totalOpened / totalRecipients) * 100) : 0;
  const overallClickRate = totalRecipients > 0 ? Math.round((totalClicked / totalRecipients) * 100) : 0;

  const displayCampaigns = scopeTab === 'upcoming' ? [] : sortedCampaigns;
  const stats = {
    active: campaigns?.filter(c => c.status === 'active').length || 0,
    total: campaigns?.length || 0,
    totalRecipients,
    openRate: overallOpenRate,
    clickRate: overallClickRate,
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
    toast({ title: 'Sending emails...', description: 'Please wait while we send your campaign.' });
    try {
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: { campaignId: id }
      });
      if (error) throw error;
      if (data?.sent === 0 && data?.message === 'No pending recipients') {
        toast({ 
          title: 'No pending recipients', 
          description: 'All recipients have already been sent emails.',
          variant: 'default'
        });
      } else {
        toast({ 
          title: 'Campaign launched!', 
          description: `Sent ${data?.sent || 0} of ${data?.total || 0} emails successfully.${data?.errors?.length ? ` ${data.errors.length} failed.` : ''}`
        });
      }
      refetch();
    } catch (err: any) {
      toast({ 
        title: 'Failed to launch campaign', 
        description: err.message || 'Unknown error occurred',
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
    setViewCampaignId(null);
    setSelectedTemplateForCampaign(undefined);
  };

  const handleTemplateLibrarySelect = (template: EmailTemplate | null) => {
    setSelectedTemplateForCampaign(template);
    setShowTemplateLibrary(false);
    setShowCampaignBuilder(true);
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const newCampaign = await duplicateCampaign.mutateAsync({
        campaignId: campaign.id,
        newName: `${campaign.name} (Copy)`,
      });
      setDuplicatingCampaignId(null);
      toast({ title: 'Campaign duplicated', description: 'Add audience and launch.' });
      setEditingCampaign(newCampaign);
      setShowCampaignBuilder(true);
    } catch {
      toast({ title: 'Failed to duplicate', variant: 'destructive' });
    }
  };

  const handleArchiveCampaign = async (id: string) => {
    try {
      await updateCampaign.mutateAsync({ id, input: { archived_at: new Date().toISOString() } });
      toast({ title: 'Campaign archived' });
      refetch();
    } catch {
      toast({ title: 'Failed to archive', variant: 'destructive' });
    }
  };

  const handleUnarchiveCampaign = async (id: string) => {
    try {
      await updateCampaign.mutateAsync({ id, input: { archived_at: null } });
      toast({ title: 'Campaign restored' });
      refetch();
    } catch {
      toast({ title: 'Failed to restore', variant: 'destructive' });
    }
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
                <Button 
                  variant="outline" 
                  className="border-sky-blue text-sky-blue hover:bg-sky-blue hover:text-white"
                  onClick={() => setShowTemplateLibrary(true)}
                >
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
                    <div className="text-2xl font-bold text-foreground">{stats.total}</div>
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
                    <div className="text-2xl font-bold text-foreground">{stats.clickRate}%</div>
                    <div className="text-sm text-muted-foreground">Click Rate</div>
                  </div>
                  <Calendar className="w-8 h-8 text-sunrise" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Primary scope tabs */}
          <Tabs value={scopeTab} onValueChange={(v) => setScopeTab(v as typeof scopeTab)} className="w-full">
            <TabsList className="bg-muted mb-4">
              <TabsTrigger value="my">My Campaigns</TabsTrigger>
              <TabsTrigger value="org">Organization</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming Sends</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            {scopeTab === 'upcoming' ? (
              <div className="mt-6">
                <UpcomingSendsTab onViewCampaign={(id) => { setViewCampaignId(id); setShowCampaignBuilder(true); }} />
              </div>
            ) : (
              <>
                {/* Search, filters, sort - only for campaign lists */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="w-64">
                    <CampaignSearchBar value={searchQuery} onChange={setSearchQuery} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {CAMPAIGN_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort:</span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-6">
                  {(scopeTab === 'my' || scopeTab === 'org') && (
                    <CampaignFolderSidebar
                      selectedFolderId={selectedFolderId}
                      onSelectFolder={setSelectedFolderId}
                      isMyCampaigns={scopeTab === 'my'}
                      campaigns={campaigns}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="bg-muted mb-4">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                        <TabsTrigger value="paused">Paused</TabsTrigger>
                        <TabsTrigger value="draft">Drafts</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                      </TabsList>

                      <TabsContent value={activeTab} className="mt-0 space-y-4">
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
              ) : displayCampaigns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {campaigns && campaigns.length > 0 ? 'No campaigns match your filters' : 'No campaigns yet'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {campaigns && campaigns.length > 0
                        ? 'Try adjusting your search, type filter, or folder to see more campaigns.'
                        : 'Create your first campaign to start engaging with candidates.'}
                    </p>
                    <Button
                      onClick={() => {
                        if (campaigns && campaigns.length > 0) {
                          setSearchQuery('');
                          setTypeFilter('all');
                          setSortBy('newest');
                          setSelectedFolderId(null);
                          setActiveTab('all');
                        } else {
                          setShowCampaignBuilder(true);
                        }
                      }}
                      className="bg-gradient-primary"
                    >
                      {campaigns && campaigns.length > 0 ? (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Clear filters
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Campaign
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                displayCampaigns.map((campaign) => (
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
                          {/* Show Send Pending button for active campaigns with pending recipients */}
                          {campaign.status === 'active' && (statsMap[campaign.id]?.pending ?? 0) > 0 && (
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
                              {sendingCampaignId === campaign.id ? 'Sending...' : `Send ${statsMap[campaign.id]?.pending} Pending`}
                            </Button>
                          )}
                          {campaign.status === 'active' && (statsMap[campaign.id]?.pending ?? 0) === 0 ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-sunrise text-sunrise hover:bg-sunrise hover:text-white"
                              onClick={() => handlePauseCampaign(campaign.id)}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                          ) : campaign.status === 'draft' ? (
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
                          ) : campaign.status === 'scheduled' && (statsMap[campaign.id]?.pending ?? 0) > 0 ? (
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
                              {sendingCampaignId === campaign.id ? 'Sending...' : `Send ${statsMap[campaign.id]?.pending} Pending`}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              {['draft', 'paused', 'completed'].includes(campaign.status) && (
                                <DropdownMenuItem
                                  onClick={() => handleDuplicateCampaign(campaign)}
                                  disabled={duplicatingCampaignId === campaign.id}
                                  className="cursor-pointer"
                                >
                                {duplicatingCampaignId === campaign.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Copy className="w-4 h-4 mr-2" />
                                )}
                                Duplicate
                              </DropdownMenuItem>
                              )}
                              {(campaign.status === 'active' || campaign.status === 'scheduled') && (
                                <DropdownMenuItem
                                  onClick={() => setAddRecipientsCampaignId(campaign.id)}
                                  className="cursor-pointer"
                                >
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Add recipients
                                </DropdownMenuItem>
                              )}
                              {scopeTab === 'my' && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="cursor-pointer">
                                    <Folder className="w-4 h-4 mr-2" />
                                    Move to folder
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() => handleMoveToFolder(campaign.id, null)}
                                      className="cursor-pointer"
                                    >
                                      No folder
                                    </DropdownMenuItem>
                                    {folders?.map((f) => (
                                      <DropdownMenuItem
                                        key={f.id}
                                        onClick={() => handleMoveToFolder(campaign.id, f.id)}
                                        className="cursor-pointer"
                                      >
                                        <FolderOpen className="w-4 h-4 mr-2" />
                                        {f.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                              <DropdownMenuSeparator />
                              {scopeTab !== 'archived' ? (
                                <DropdownMenuItem
                                  onClick={() => handleArchiveCampaign(campaign.id)}
                                  className="cursor-pointer"
                                >
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleUnarchiveCampaign(campaign.id)}
                                  className="cursor-pointer"
                                >
                                  <ArchiveRestore className="w-4 h-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                      <div className="grid grid-cols-6 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{statsMap[campaign.id]?.recipients ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Recipients</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{statsMap[campaign.id]?.sent ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-sunrise">{statsMap[campaign.id]?.scheduled ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Scheduled</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-sky-blue">{statsMap[campaign.id]?.opened ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Opened</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-sunrise">{statsMap[campaign.id]?.clicked ?? 0}</div>
                          <div className="text-xs text-muted-foreground">Clicked</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{statsMap[campaign.id]?.clickRate ?? 0}%</div>
                          <div className="text-xs text-muted-foreground">Click Rate</div>
                        </div>
                      </div>
                      {(statsMap[campaign.id]?.scheduled ?? 0) > 0 && campaign.status === 'scheduled' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 text-sunrise hover:text-sunrise"
                            onClick={() => setExpandedQueueCampaignId(expandedQueueCampaignId === campaign.id ? null : campaign.id)}
                          >
                            {expandedQueueCampaignId === campaign.id ? (
                              <ChevronUp className="w-4 h-4 mr-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 mr-1" />
                            )}
                            {expandedQueueCampaignId === campaign.id ? 'Hide queue' : 'View queue'}
                          </Button>
                          <CampaignScheduledQueue
                            campaignId={campaign.id}
                            scheduledAt={campaign.scheduled_at ?? null}
                            isExpanded={expandedQueueCampaignId === campaign.id}
                          />
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </>
            )}
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
        editingCampaign={editingCampaign || (viewCampaignId && campaignForView ? campaignForView : null)}
        initialTemplate={selectedTemplateForCampaign}
        isLoadingCampaign={!!viewCampaignId && loadingCampaignForView}
      />

      <Dialog open={showTemplateLibrary} onOpenChange={setShowTemplateLibrary}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
            <DialogDescription>Choose a template to start your campaign</DialogDescription>
          </DialogHeader>
          <TemplateLibrary onSelectTemplate={handleTemplateLibrarySelect} />
        </DialogContent>
      </Dialog>

      {addRecipientsCampaignId && (
        <AddRecipientsModal
          campaignId={addRecipientsCampaignId}
          open={true}
          onOpenChange={(open) => !open && setAddRecipientsCampaignId(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};

export default Campaigns;
