"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CampaignBuilder } from '@/components/campaigns/CampaignBuilder';
import { TemplateLibrary } from '@/components/campaigns/TemplateLibrary';
import { HtmlCampaignEmailEditor } from '@/components/campaigns/email/HtmlCampaignEmailEditor';
import { newEmailDraftSessionId } from '@/lib/email/email-ai-chat-storage-key';
import { emailTemplateService } from '@/services/emailTemplateService';
import { Json } from '@/integrations/supabase/types';
import { useQueryClient } from '@tanstack/react-query';
import { CampaignSearchBar } from '@/components/campaigns/CampaignSearchBar';
import { CampaignFolderSidebar } from '@/components/campaigns/CampaignFolderSidebar';
import { UpcomingSendsTab } from '@/components/campaigns/UpcomingSendsTab';
import { AddRecipientsModal } from '@/components/campaigns/AddRecipientsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Mail, Calendar, TrendingUp, Users, ChevronDown, ChevronUp, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useMyCampaigns, useOrgCampaigns, useArchivedCampaigns, useCampaign, useUpdateCampaign, useDeleteCampaign, useDuplicateCampaign } from '@/hooks/useCampaigns';
import { useCurrentUser, useAllProfiles } from '@/hooks/useAuth';
import { CampaignListRow } from '@/components/campaigns/CampaignListRow';
import { profileDisplayName } from '@/lib/profileDisplayName';
import { Virtuoso } from 'react-virtuoso';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/types/User';
import { useCampaignFolders } from '@/hooks/useCampaignFolders';
import { useAllCampaignsStats, type CampaignStats } from '@/hooks/useCampaignStats';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign } from '@/types/Campaign';
import type { EmailTemplate } from '@/services/emailTemplateService';
import { describeCampaignSendToast } from '@/lib/campaignSendToast';

const CAMPAIGN_TYPES = ['nurture', 'event', 'job_alert', 'reengagement', 'newsletter'] as const;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name-az', label: 'Name A–Z' },
  { value: 'name-za', label: 'Name Z–A' },
  { value: 'open-rate', label: 'Open rate' },
  { value: 'click-rate', label: 'Click rate' },
] as const;
const ORG_ONLY_SORT: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'creator-az', label: 'Creator A–Z' },
  { value: 'creator-za', label: 'Creator Z–A' },
];

/** When the campaign is/was "active" on the calendar: scheduled send time if set, else created. */
function getCampaignActiveTimeMs(c: Campaign): number {
  if (c.scheduled_at) return new Date(c.scheduled_at).getTime();
  return new Date(c.created_at).getTime();
}

/** Compare two campaigns in the same org group (per-user list). */
function compareCampaignsForOrgSubgroup(
  a: Campaign,
  b: Campaign,
  sortBy: string,
  statsMap: Record<string, CampaignStats>
): number {
  switch (sortBy) {
    case 'newest':
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    case 'oldest':
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    case 'name-az':
      return (a.name || '').localeCompare(b.name || '');
    case 'name-za':
      return (b.name || '').localeCompare(a.name || '');
    case 'open-rate':
      return (statsMap[b.id]?.openRate ?? 0) - (statsMap[a.id]?.openRate ?? 0);
    case 'click-rate':
      return (statsMap[b.id]?.clickRate ?? 0) - (statsMap[a.id]?.clickRate ?? 0);
    case 'creator-az':
    case 'creator-za':
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    default:
      return 0;
  }
}

const Campaigns = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [scopeTab, setScopeTab] = useState<'my' | 'org' | 'upcoming' | 'archived'>('my');
  const [activeTab, setActiveTab] = useState('all');
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [expandedQueueCampaignId, setExpandedQueueCampaignId] = useState<string | null>(null);
  /** Standalone template editor (Template Library) — not part of campaign creation. */
  const [templateEditorSession, setTemplateEditorSession] = useState<null | {
    seed: string;
    initialWorkspaceTab: 'editor' | 'ai';
    libraryRecord: EmailTemplate | null;
  }>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [addRecipientsCampaignId, setAddRecipientsCampaignId] = useState<string | null>(null);
  const [duplicatingCampaignId, setDuplicatingCampaignId] = useState<string | null>(null);
  const [viewCampaignId, setViewCampaignId] = useState<string | null>(null);
  /** Organization tab: filter to a single creator (user_id), or "" for all */
  const [orgCreatorUserId, setOrgCreatorUserId] = useState<string>('');
  const [summaryOpen, setSummaryOpen] = useState(true);
  /** Filter by a single "active time" (scheduled at if set, else created at). */
  const [activeTimeFrom, setActiveTimeFrom] = useState<string>('');
  const [activeTimeTo, setActiveTimeTo] = useState<string>('');
  const { data: campaignForView, isLoading: loadingCampaignForView } = useCampaign(viewCampaignId || '');
  const [sendSuccess, setSendSuccess] = useState<{
    campaignId: string;
    campaignName: string;
    kind: 'launch' | 'schedule';
    description?: string;
  } | null>(null);

  const handledOpenQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (scopeTab === 'org') return;
    setSortBy((s) => (s === 'creator-az' || s === 'creator-za' ? 'newest' : s));
    setOrgCreatorUserId('');
  }, [scopeTab]);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) {
      handledOpenQueryRef.current = null;
      return;
    }
    if (handledOpenQueryRef.current === openId) return;
    handledOpenQueryRef.current = openId;
    setEditingCampaign(null);
    setViewCampaignId(openId);
    setShowCampaignBuilder(true);
    router.replace('/campaigns', { scroll: false });
  }, [searchParams, router]);

  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const forceShowInOrgTab = currentUser?.profile?.forceShowInOrgTab !== false;

  const { data: myCampaigns, isLoading: loadingMy, refetch: refetchMy } = useMyCampaigns();
  const { data: orgCampaigns, isLoading: loadingOrg, refetch: refetchOrg } = useOrgCampaigns(forceShowInOrgTab);
  const { data: allProfiles = [] } = useAllProfiles(scopeTab === 'org');
  const profileByUserId = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of allProfiles) m.set(p.userId, p);
    return m;
  }, [allProfiles]);

  /** Creators present in org campaigns — for the Organization tab filter dropdown */
  const orgCreatorOptions = useMemo(() => {
    if (scopeTab !== 'org') return [];
    const list = orgCampaigns ?? [];
    const ids = [...new Set(list.map((c) => c.user_id))];
    return ids
      .map((id) => ({
        id,
        label: id === currentUserId ? 'You' : profileDisplayName(profileByUserId.get(id), id),
      }))
      .sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [scopeTab, orgCampaigns, currentUserId, profileByUserId]);

  useEffect(() => {
    if (scopeTab !== 'org' || !orgCreatorUserId) return;
    if (!orgCreatorOptions.some((o) => o.id === orgCreatorUserId)) {
      setOrgCreatorUserId('');
    }
  }, [scopeTab, orgCreatorUserId, orgCreatorOptions]);
  const { data: archivedCampaigns, isLoading: loadingArchived, refetch: refetchArchived } = useArchivedCampaigns();

  const campaigns = useMemo((): Campaign[] => {
    if (scopeTab === 'my') return myCampaigns ?? [];
    if (scopeTab === 'org') return orgCampaigns ?? [];
    if (scopeTab === 'archived') return archivedCampaigns ?? [];
    return [];
  }, [scopeTab, myCampaigns, orgCampaigns, archivedCampaigns]);
  const isLoading = scopeTab === 'my' ? loadingMy : scopeTab === 'org' ? loadingOrg : scopeTab === 'archived' ? loadingArchived : false;
  const refetch = () => { refetchMy(); refetchOrg(); refetchArchived(); };

  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const { data: folders } = useCampaignFolders();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleMoveToFolder = async (campaignId: string, folderId: string | null) => {
    try {
      await updateCampaign.mutateAsync({ id: campaignId, input: { folder_id: folderId } });
      toast({ title: folderId ? 'Moved to folder' : 'Removed from folder' });
      refetch();
    } catch {
      toast({ title: 'Failed to move', variant: 'destructive' });
    }
  };

  const campaignIds = useMemo(() => campaigns.map((c) => c.id), [campaigns]);
  const { statsMap } = useAllCampaignsStats(campaignIds);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      if (scopeTab === 'org' && orgCreatorUserId && campaign.user_id !== orgCreatorUserId) {
        return false;
      }
      if (activeTab !== 'all' && campaign.status !== activeTab) return false;
      if (typeFilter !== 'all' && campaign.type !== typeFilter) return false;
      if (selectedFolderId === 'uncategorized' && campaign.folder_id) return false;
      if (selectedFolderId && selectedFolderId !== 'uncategorized' && campaign.folder_id !== selectedFolderId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fields = [campaign.name, campaign.type, campaign.goal, campaign.status].map((s) =>
          (s ?? '').toLowerCase()
        );
        if (!fields.some((f) => f.includes(q))) return false;
      }
      if (activeTimeFrom || activeTimeTo) {
        const t = getCampaignActiveTimeMs(campaign);
        if (activeTimeFrom) {
          const st = new Date(`${activeTimeFrom}T00:00:00`).getTime();
          if (t < st) return false;
        }
        if (activeTimeTo) {
          const en = new Date(`${activeTimeTo}T23:59:59.999`).getTime();
          if (t > en) return false;
        }
      }
      return true;
    });
  }, [
    campaigns,
    scopeTab,
    orgCreatorUserId,
    activeTab,
    typeFilter,
    selectedFolderId,
    searchQuery,
    activeTimeFrom,
    activeTimeTo,
  ]);

  const sortOptions = useMemo(
    () => (scopeTab === 'org' ? [...SORT_OPTIONS, ...ORG_ONLY_SORT] : [...SORT_OPTIONS]),
    [scopeTab]
  );

  const sortedCampaigns = useMemo(() => {
    const arr = [...filteredCampaigns];
    switch (sortBy) {
      case 'newest': return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest': return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'name-az': return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name-za': return arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      case 'open-rate': return arr.sort((a, b) => (statsMap[b.id]?.openRate ?? 0) - (statsMap[a.id]?.openRate ?? 0));
      case 'click-rate': return arr.sort((a, b) => (statsMap[b.id]?.clickRate ?? 0) - (statsMap[a.id]?.clickRate ?? 0));
      case 'creator-az':
        return arr.sort((a, b) => {
          const la = profileDisplayName(profileByUserId.get(a.user_id), a.user_id);
          const lb = profileDisplayName(profileByUserId.get(b.user_id), b.user_id);
          const c = la.localeCompare(lb);
          if (c !== 0) return c;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case 'creator-za':
        return arr.sort((a, b) => {
          const la = profileDisplayName(profileByUserId.get(a.user_id), a.user_id);
          const lb = profileDisplayName(profileByUserId.get(b.user_id), b.user_id);
          const c = lb.localeCompare(la);
          if (c !== 0) return c;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      default: return arr;
    }
  }, [filteredCampaigns, sortBy, statsMap, profileByUserId]);

  // Calculate aggregate stats
  const totalRecipients = Object.values(statsMap).reduce((sum, s) => sum + s.recipients, 0);
  const totalOpened = Object.values(statsMap).reduce((sum, s) => sum + s.opened, 0);
  const totalClicked = Object.values(statsMap).reduce((sum, s) => sum + s.clicked, 0);
  const overallOpenRate = totalRecipients > 0 ? Math.round((totalOpened / totalRecipients) * 100) : 0;
  const overallClickRate = totalRecipients > 0 ? Math.round((totalClicked / totalRecipients) * 100) : 0;

  const displayCampaigns = useMemo(
    () => (scopeTab === 'upcoming' ? [] : sortedCampaigns),
    [scopeTab, sortedCampaigns]
  );

  type VirtRow =
    | { kind: 'header'; id: string; label: string }
    | { kind: 'campaign'; id: string; campaign: Campaign };

  const listRows: VirtRow[] = useMemo(() => {
    if (scopeTab !== 'org' || !currentUserId) {
      return displayCampaigns.map((c) => ({ kind: 'campaign' as const, id: c.id, campaign: c }));
    }
    const byUser = new Map<string, Campaign[]>();
    for (const c of displayCampaigns) {
      const arr = byUser.get(c.user_id) || [];
      arr.push(c);
      byUser.set(c.user_id, arr);
    }
    const uids = [...byUser.keys()].sort((a, b) => {
      // "You" first when your org campaigns appear in this tab, then by creator (matches creator-az/za when selected).
      if (sortBy === 'creator-az' || sortBy === 'creator-za') {
        if (a === currentUserId) return -1;
        if (b === currentUserId) return 1;
        const la = profileDisplayName(profileByUserId.get(a), a);
        const lb = profileDisplayName(profileByUserId.get(b), b);
        if (sortBy === 'creator-az') return la.localeCompare(lb);
        return lb.localeCompare(la);
      }
      if (a === currentUserId) return -1;
      if (b === currentUserId) return 1;
      return profileDisplayName(profileByUserId.get(a), a).localeCompare(
        profileDisplayName(profileByUserId.get(b), b)
      );
    });
    const rows: VirtRow[] = [];
    for (const uid of uids) {
      const label =
        uid === currentUserId
          ? 'You'
          : profileDisplayName(profileByUserId.get(uid), uid);
      rows.push({ kind: 'header', id: `h-${uid}`, label });
      const list = [...(byUser.get(uid) || [])].sort((a, b) =>
        compareCampaignsForOrgSubgroup(a, b, sortBy, statsMap)
      );
      for (const c of list) {
        rows.push({ kind: 'campaign', id: c.id, campaign: c });
      }
    }
    return rows;
  }, [displayCampaigns, scopeTab, currentUserId, profileByUserId, sortBy, statsMap]);

  const stats = {
    active: campaigns.filter((c) => c.status === 'active').length,
    total: campaigns.length,
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
          description: describeCampaignSendToast({
            sent: data?.sent,
            total: data?.total,
            errors: data?.errors,
            skippedNoEmail: data?.skippedNoEmail,
          }),
        });
      }
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({ 
        title: 'Failed to launch campaign', 
        description: message,
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

  const handleViewCampaign = (campaign: Campaign) => {
    setEditingCampaign(null);
    setViewCampaignId(campaign.id);
    setShowCampaignBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowCampaignBuilder(false);
    setEditingCampaign(null);
    setViewCampaignId(null);
  };

  const handleTemplateLibrarySelect = (template: EmailTemplate | null, options?: { initialAiTab?: boolean }) => {
    setTemplateEditorSession({
      seed: newEmailDraftSessionId(),
      initialWorkspaceTab: options?.initialAiTab ? 'ai' : 'editor',
      libraryRecord: template,
    });
    setShowTemplateLibrary(false);
  };

  const closeTemplateEditorSession = () => setTemplateEditorSession(null);

  const templateSessionRef = useRef(templateEditorSession);
  templateSessionRef.current = templateEditorSession;

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    setDuplicatingCampaignId(campaign.id);
    try {
      const newCampaign = await duplicateCampaign.mutateAsync({
        campaignId: campaign.id,
        newName: `${campaign.name} (Copy)`,
      });
      toast({ title: 'Campaign duplicated', description: 'Add audience and launch.' });
      setViewCampaignId(null);
      setEditingCampaign(newCampaign);
      setShowCampaignBuilder(true);
    } catch {
      toast({ title: 'Failed to duplicate', variant: 'destructive' });
    } finally {
      setDuplicatingCampaignId(null);
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
        <TopBar />
        
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
                  onClick={() => {
                    setViewCampaignId(null);
                    setEditingCampaign(null);
                    setShowCampaignBuilder(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSummaryOpen((s) => !s)}
            >
              {summaryOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {summaryOpen ? 'Hide' : 'Show'} summary
            </Button>
          </div>
          {summaryOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card className="border-sky-blue/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-foreground">{stats.active}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    <Mail className="w-6 h-6 text-sky-blue" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-sky-blue/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-foreground">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total in tab</div>
                    </div>
                    <Users className="w-6 h-6 text-sky-blue" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-sky-blue/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-foreground">{stats.openRate}%</div>
                      <div className="text-xs text-muted-foreground">Open rate</div>
                    </div>
                    <TrendingUp className="w-6 h-6 text-sunrise" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-sky-blue/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-foreground">{stats.clickRate}%</div>
                      <div className="text-xs text-muted-foreground">Click rate</div>
                    </div>
                    <Calendar className="w-6 h-6 text-sunrise" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                <UpcomingSendsTab
                  onViewCampaign={(id) => {
                    setEditingCampaign(null);
                    setViewCampaignId(id);
                    setShowCampaignBuilder(true);
                  }}
                />
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div className="w-full min-w-0">
                    <CampaignSearchBar value={searchQuery} onChange={setSearchQuery} />
                  </div>
                  <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                    {scopeTab === 'org' && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Creator</span>
                        <Select
                          value={orgCreatorUserId || 'all'}
                          onValueChange={(v) => setOrgCreatorUserId(v === 'all' ? '' : v)}
                        >
                          <SelectTrigger className="w-[min(100%,14rem)] h-9">
                            <SelectValue placeholder="All creators" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All creators</SelectItem>
                            {orgCreatorOptions.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Type</span>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[9.5rem] h-9">
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
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Sort</span>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[9.5rem] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sortOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap items-end gap-2 sm:ml-auto">
                      <div className="space-y-1 min-w-0">
                        <Label className="text-xs text-muted-foreground">
                          Active time (scheduled, or created if not scheduled)
                        </Label>
                        <div className="flex flex-wrap items-end gap-2">
                          <Input
                            type="date"
                            className="h-9 w-36"
                            value={activeTimeFrom}
                            onChange={(e) => setActiveTimeFrom(e.target.value)}
                            aria-label="Active time from"
                          />
                          <span className="text-xs text-muted-foreground pb-2">to</span>
                          <Input
                            type="date"
                            className="h-9 w-36"
                            value={activeTimeTo}
                            onChange={(e) => setActiveTimeTo(e.target.value)}
                            aria-label="Active time to"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-8">
                  {(scopeTab === 'my' || scopeTab === 'org') && (
                    <CampaignFolderSidebar
                      selectedFolderId={selectedFolderId}
                      onSelectFolder={setSelectedFolderId}
                      isMyCampaigns={scopeTab === 'my'}
                      campaigns={campaigns}
                    />
                  )}
                  <div className="flex-1 min-w-0 pl-1 md:pl-3">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="bg-muted mb-4">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                        <TabsTrigger value="paused">Paused</TabsTrigger>
                        <TabsTrigger value="draft">Drafts</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                      </TabsList>

                      <TabsContent value={activeTab} className="mt-0">
                        {isLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <Card key={i}>
                                <CardContent className="p-4">
                                  <Skeleton className="h-5 w-48 mb-2" />
                                  <Skeleton className="h-4 w-32" />
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : displayCampaigns.length === 0 ? (
                          <Card>
                            <CardContent className="py-12 text-center">
                              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-foreground mb-2">
                                {campaigns.length > 0
                                  ? 'No campaigns match your filters'
                                  : scopeTab === 'org'
                                    ? 'No organization campaigns yet'
                                    : 'No campaigns yet'}
                              </h3>
                              <p className="text-muted-foreground mb-4">
                                {campaigns.length > 0
                                  ? 'Try adjusting search, type, folder, or date filters.'
                                  : scopeTab === 'org'
                                    ? 'Teammate campaigns show here when an admin turns on Share with organization. Yours can appear here too for org-shared campaigns — either your admin forces Organization listing in Settings → Team, or you enable “Also list under Organization” on each campaign.'
                                    : 'Create your first campaign to start engaging with candidates.'}
                              </p>
                              <Button
                                onClick={() => {
                                  if (campaigns.length > 0) {
                                    setSearchQuery('');
                                    setTypeFilter('all');
                                    setSortBy('newest');
                                    setOrgCreatorUserId('');
                                    setSelectedFolderId(null);
                                    setActiveTab('all');
                                    setActiveTimeFrom('');
                                    setActiveTimeTo('');
                                  } else {
                                    setViewCampaignId(null);
                                    setEditingCampaign(null);
                                    setShowCampaignBuilder(true);
                                  }
                                }}
                                className="bg-gradient-primary"
                              >
                                {campaigns.length > 0 ? (
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
                          <Virtuoso
                            className="rounded-lg border border-border"
                            style={{ height: 'min(70vh, 720px)' }}
                            data={listRows}
                            itemContent={(_, item) => {
                              if (item.kind === 'header') {
                                return (
                                  <div className="bg-muted/80 px-3 py-2 text-sm font-medium text-foreground border-b border-border">
                                    {item.label}
                                  </div>
                                );
                              }
                              return (
                                <div className="p-1.5 sm:p-2">
                                  <CampaignListRow
                                    campaign={item.campaign}
                                    stats={statsMap[item.campaign.id]}
                                    scopeTab={scopeTab === 'archived' ? 'archived' : scopeTab}
                                    currentUserId={currentUserId}
                                    folders={folders}
                                    density="comfortable"
                                    sendingCampaignId={sendingCampaignId}
                                    duplicatingCampaignId={duplicatingCampaignId}
                                    expandedQueueCampaignId={expandedQueueCampaignId}
                                    onExpandQueue={setExpandedQueueCampaignId}
                                    onView={handleViewCampaign}
                                    onDuplicate={handleDuplicateCampaign}
                                    onLaunch={handleLaunchCampaign}
                                    onPause={handlePauseCampaign}
                                    onResume={handleResumeCampaign}
                                    onAddRecipients={setAddRecipientsCampaignId}
                                    onMoveToFolder={handleMoveToFolder}
                                    onArchive={handleArchiveCampaign}
                                    onUnarchive={handleUnarchiveCampaign}
                                    onDelete={handleDeleteCampaign}
                                    getStatusBadgeClass={getStatusBadgeClass}
                                  />
                                </div>
                              );
                            }}
                          />
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

      <CampaignBuilder
        open={showCampaignBuilder}
        onOpenChange={handleCloseBuilder}
        editingCampaign={editingCampaign || (viewCampaignId && campaignForView ? campaignForView : null)}
        isLoadingCampaign={!!viewCampaignId && loadingCampaignForView}
        readOnly={viewCampaignId !== null && editingCampaign === null}
        onSendSuccess={setSendSuccess}
      />

      <Dialog
        open={!!templateEditorSession}
        onOpenChange={(open) => {
          if (!open) closeTemplateEditorSession();
        }}
      >
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 border-0 rounded-none sm:max-w-[100vw]">
          <DialogTitle className="sr-only">Edit email template</DialogTitle>
          {templateEditorSession ? (
            <HtmlCampaignEmailEditor
              key={templateEditorSession.seed}
              editorSeed={templateEditorSession.seed}
              initialSubject={templateEditorSession.libraryRecord?.subject ?? ''}
              initialHtmlContent={templateEditorSession.libraryRecord?.html_content ?? null}
              initialComposeKind={
                templateEditorSession.libraryRecord?.compose_kind === 'raw_html' ? 'raw_html' : 'announcement_form'
              }
              initialFormPayload={templateEditorSession.libraryRecord?.form_payload ?? undefined}
              initialWorkspaceTab={templateEditorSession.initialWorkspaceTab}
              draftChatSessionId={templateEditorSession.seed}
              aiChatScopeSuffix="standalone-template"
              showCampaignContinue={false}
              onContinue={() => {}}
              onCancel={closeTemplateEditorSession}
              loadedTemplate={
                templateEditorSession.libraryRecord
                  ? {
                      id: templateEditorSession.libraryRecord.id,
                      name: templateEditorSession.libraryRecord.name,
                    }
                  : null
              }
              onRenameTemplate={async (templateId, newName) => {
                try {
                  const updated = await emailTemplateService.update(templateId, { name: newName.trim() });
                  setTemplateEditorSession((s) => (s ? { ...s, libraryRecord: updated } : null));
                  queryClient.invalidateQueries({ queryKey: ['email-templates'] });
                  toast({ title: 'Template renamed' });
                } catch (e) {
                  toast({
                    title: 'Rename failed',
                    description: (e as Error).message,
                    variant: 'destructive',
                  });
                }
              }}
              onSaveTemplate={
                templateEditorSession.libraryRecord
                  ? async (payload) => {
                      const s = templateSessionRef.current;
                      if (!s?.libraryRecord) return;
                      try {
                        const updated = await emailTemplateService.update(s.libraryRecord.id, {
                          bee_json: null,
                          html_content: payload.html,
                          subject: payload.subject,
                          compose_kind: payload.compose_kind,
                          form_payload: payload.form_payload as Json | null,
                        });
                        setTemplateEditorSession((cur) => (cur ? { ...cur, libraryRecord: updated } : null));
                        queryClient.invalidateQueries({ queryKey: ['email-templates'] });
                        toast({ title: 'Template saved' });
                      } catch (e) {
                        toast({
                          title: 'Save failed',
                          description: (e as Error).message,
                          variant: 'destructive',
                        });
                      }
                    }
                  : undefined
              }
              onSaveAsTemplate={
                templateEditorSession.libraryRecord
                  ? undefined
                  : async (payload, name) => {
                      try {
                        const created = await emailTemplateService.create({
                          name: name.trim() || payload.subject.trim() || 'Untitled template',
                          category: 'custom',
                          subject: payload.subject,
                          bee_json: null,
                          html_content: payload.html,
                          compose_kind: payload.compose_kind,
                          form_payload: payload.form_payload as Json | null,
                        });
                        setTemplateEditorSession((cur) => (cur ? { ...cur, libraryRecord: created } : null));
                        queryClient.invalidateQueries({ queryKey: ['email-templates'] });
                        toast({
                          title: 'Template created',
                          description: `"${created.name}" is in your library.`,
                        });
                      } catch (e) {
                        toast({
                          title: 'Save failed',
                          description: (e as Error).message,
                          variant: 'destructive',
                        });
                      }
                    }
              }
              defaultSaveAsTemplateName={
                templateEditorSession.libraryRecord?.subject?.trim() || 'New template'
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sendSuccess}
        onOpenChange={(open) => {
          if (!open) setSendSuccess(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" aria-hidden />
              <DialogTitle className="text-xl">
                {sendSuccess?.kind === 'schedule' ? 'Campaign scheduled' : 'Campaign launched'}
              </DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2 text-left">
                {sendSuccess?.campaignName ? (
                  <p className="text-sm font-medium text-foreground">{sendSuccess.campaignName}</p>
                ) : null}
                {sendSuccess?.description ? (
                  <p className="text-sm text-muted-foreground">{sendSuccess.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {sendSuccess?.kind === 'schedule'
                      ? 'Your campaign is on the calendar. You can manage sends from Upcoming Sends.'
                      : 'Your campaign is active and emails will begin sending.'}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSendSuccess(null)}>
              Done
            </Button>
            <Button
              type="button"
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => {
                if (!sendSuccess) return;
                const id = sendSuccess.campaignId;
                setSendSuccess(null);
                setEditingCampaign(null);
                setViewCampaignId(id);
                setShowCampaignBuilder(true);
              }}
            >
              View campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateLibrary} onOpenChange={setShowTemplateLibrary}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
            <DialogDescription>
              Create and edit saved email designs. To send mail, use New Campaign and pick a template there.
            </DialogDescription>
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
