"use client";

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import type { MailgunAggregatedMetrics } from '@/hooks/useMailgunCampaignMetrics';

type MetricDef = {
  id: string;
  label: string;
  help: string;
  format: 'int' | 'percent';
  get: (m: MailgunAggregatedMetrics) => number;
};

const METRICS: MetricDef[] = [
  {
    id: 'sent',
    label: 'Sent',
    help: 'Messages handed off in the send pipeline (Mailgun “sent” events) for the selected range and campaign tag(s).',
    format: 'int',
    get: (m) => m.sent_count,
  },
  {
    id: 'delivered',
    label: 'Delivered',
    help: 'Successfully delivered to the recipient mail server (per Mailgun) in this period.',
    format: 'int',
    get: (m) => m.delivered_count,
  },
  {
    id: 'total_opens',
    label: 'Total opens',
    help: 'All open events, including if someone opened multiple times. Not deduplicated by recipient.',
    format: 'int',
    get: (m) => m.opened_count,
  },
  {
    id: 'total_clicks',
    label: 'Total clicks',
    help: 'All click events, including multiple clicks from the same recipient.',
    format: 'int',
    get: (m) => m.clicked_count,
  },
  {
    id: 'click_rate',
    label: 'Click rate',
    help: 'Unique recipients who clicked at least once, as a share of delivered messages. Capped at 100%.',
    format: 'percent',
    get: (m) => m.clickRate,
  },
  {
    id: 'bounces',
    label: 'Bounces',
    help: 'All bounces in the period: hard, soft, and other bounce events (Mailgun).',
    format: 'int',
    get: (m) => m.bounced_count,
  },
  {
    id: 'bounce_rate',
    label: 'Bounce rate',
    help: 'Bounces as a share of sent messages in this view (or delivered if no sends are recorded). Capped at 100%.',
    format: 'percent',
    get: (m) => m.bounceRate,
  },
  {
    id: 'permanent_failures',
    label: 'Permanent failures',
    help: 'Hard failures in Mailgun’s delivery path in this period (distinct from bounce classification in some cases).',
    format: 'int',
    get: (m) => m.permanent_failed_count,
  },
  {
    id: 'spam_complaints',
    label: 'Spam complaints',
    help: 'Spam or abuse reports / feedback loop hits. High values hurt domain reputation.',
    format: 'int',
    get: (m) => m.complained_count,
  },
  {
    id: 'unsubscribes',
    label: 'Unsubscribes',
    help: 'Unsubscribe events from Mailgun’s tracked unsubscribe for these messages in the period.',
    format: 'int',
    get: (m) => m.unsubscribed_count,
  },
];

function formatValue(m: MailgunAggregatedMetrics, def: MetricDef): string {
  const v = def.get(m);
  if (def.format === 'percent') {
    return `${Math.round(v)}%`;
  }
  return Math.round(v).toLocaleString();
}

type Props = {
  loading: boolean;
  metrics: MailgunAggregatedMetrics | null;
  errorText: string | null;
  emptyListMessage: string | null;
};

const SKELETON_CELLS = 10;

export function MailgunSummaryMetricsGrid({ loading, metrics, errorText, emptyListMessage }: Props) {
  if (emptyListMessage) {
    return <p className="text-sm text-muted-foreground">{emptyListMessage}</p>;
  }
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Array.from({ length: SKELETON_CELLS }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (errorText) {
    return <p className="text-sm text-muted-foreground">{errorText}</p>;
  }
  if (!metrics) {
    return <p className="text-sm text-muted-foreground">No metrics to display.</p>;
  }

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {METRICS.map((def) => (
          <Card key={def.id} className="border-sky-blue/10 bg-card/50">
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex min-w-0 items-start justify-between gap-1.5 text-[11px] text-muted-foreground leading-tight">
                <span className="line-clamp-2 pr-0.5 pt-0.5">{def.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      aria-label={`What ${def.label} means`}
                    >
                      <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-left">{def.help}</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{formatValue(metrics, def)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
