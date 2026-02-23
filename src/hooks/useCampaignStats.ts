import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignStats {
  recipients: number;
  pending: number;
  sent: number;
  scheduled: number;
  opened: number;
  clicked: number;
  responded: number;
  responseRate: number;
  clickRate: number;
}

export function useCampaignStats(campaignId: string) {
  const [stats, setStats] = useState<CampaignStats>({
    recipients: 0,
    pending: 0,
    sent: 0,
    scheduled: 0,
    opened: 0,
    clicked: 0,
    responded: 0,
    responseRate: 0,
    clickRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('campaign_recipients')
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Error fetching campaign stats:', error);
      return;
    }

    const recipients = data.length;
    const pending = data.filter(r => r.status === 'pending').length;
    const scheduled = data.filter(r => r.status === 'scheduled').length;
    const sent = data.filter(r => r.status === 'sent').length;
    const opened = data.filter(r => r.status === 'opened' || r.status === 'clicked' || r.status === 'responded').length;
    const clicked = data.filter(r => r.status === 'clicked' || r.status === 'responded').length;
    const responded = data.filter(r => r.status === 'responded').length;
    const responseRate = recipients > 0 ? Math.round((responded / recipients) * 100) : 0;
    const clickRate = recipients > 0 ? Math.round((clicked / recipients) * 100) : 0;

    setStats({ recipients, pending, sent, scheduled, opened, clicked, responded, responseRate, clickRate });
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`campaign-stats-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_recipients',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  return { stats, isLoading };
}

export function useAllCampaignsStats(campaignIds: string[]) {
  const [statsMap, setStatsMap] = useState<Record<string, CampaignStats>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllStats = async () => {
    if (campaignIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('campaign_recipients')
      .select('campaign_id, status')
      .in('campaign_id', campaignIds);

    if (error) {
      console.error('Error fetching campaign stats:', error);
      return;
    }

    const newStatsMap: Record<string, CampaignStats> = {};

    campaignIds.forEach(campaignId => {
      const campaignData = data.filter(r => r.campaign_id === campaignId);
      const recipients = campaignData.length;
      const pending = campaignData.filter(r => r.status === 'pending').length;
      const scheduled = campaignData.filter(r => r.status === 'scheduled').length;
      const sent = campaignData.filter(r => r.status === 'sent').length;
      const opened = campaignData.filter(r => r.status === 'opened' || r.status === 'clicked' || r.status === 'responded').length;
      const clicked = campaignData.filter(r => r.status === 'clicked' || r.status === 'responded').length;
      const responded = campaignData.filter(r => r.status === 'responded').length;
      const responseRate = recipients > 0 ? Math.round((responded / recipients) * 100) : 0;
      const clickRate = recipients > 0 ? Math.round((clicked / recipients) * 100) : 0;

      newStatsMap[campaignId] = { recipients, pending, sent, scheduled, opened, clicked, responded, responseRate, clickRate };
    });

    setStatsMap(newStatsMap);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllStats();

    // Subscribe to realtime changes for all campaigns
    const channel = supabase
      .channel('all-campaign-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_recipients',
        },
        (payload) => {
          const changedCampaignId = (payload.new as any)?.campaign_id || (payload.old as any)?.campaign_id;
          if (changedCampaignId && campaignIds.includes(changedCampaignId)) {
            fetchAllStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignIds.join(',')]);

  return { statsMap, isLoading };
}
