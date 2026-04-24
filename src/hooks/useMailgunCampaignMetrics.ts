import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignReportingWindow } from '@/lib/campaignReportingWindow';

export type MailgunAggregatedMetrics = {
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  unique_clicked_count: number;
  bounced_count: number;
  permanent_failed_count: number;
  complained_count: number;
  unsubscribed_count: number;
  clickRate: number;
  bounceRate: number;
};

export type MailgunMetricsResult =
  | { ok: true; metrics: MailgunAggregatedMetrics }
  | { ok: false; error: string; metrics: null };

const METRIC_ZEROS: MailgunAggregatedMetrics = {
  sent_count: 0,
  delivered_count: 0,
  opened_count: 0,
  clicked_count: 0,
  unique_clicked_count: 0,
  bounced_count: 0,
  permanent_failed_count: 0,
  complained_count: 0,
  unsubscribed_count: 0,
  clickRate: 0,
  bounceRate: 0,
};

function normalizeMetrics(m: Partial<MailgunAggregatedMetrics>): MailgunAggregatedMetrics {
  return { ...METRIC_ZEROS, ...m };
}

async function fetchMailgunMetrics(
  campaignIds: string[],
  window: CampaignReportingWindow
): Promise<MailgunMetricsResult> {
  const { data, error } = await supabase.functions.invoke<MailgunMetricsResult>('mailgun-metrics', {
    body: {
      campaignIds,
      start: window.start.toISOString(),
      end: window.end.toISOString(),
    },
  });

  if (error) {
    return { ok: false, error: error.message ?? 'Mailgun metrics request failed', metrics: null };
  }
  if (!data) {
    return { ok: false, error: 'Empty response', metrics: null };
  }
  if (data.ok && data.metrics) {
    return { ok: true, metrics: normalizeMetrics(data.metrics) };
  }
  return data;
}

export function useMailgunCampaignMetrics(campaignIds: string[], window: CampaignReportingWindow | null) {
  return useQuery({
    queryKey: [
      'mailgun-campaign-metrics',
      [...campaignIds].sort().join(','),
      window ? window.start.toISOString() : '',
      window ? window.end.toISOString() : '',
    ],
    queryFn: () => fetchMailgunMetrics(campaignIds, window!),
    enabled: Boolean(window && campaignIds.length > 0),
  });
}
