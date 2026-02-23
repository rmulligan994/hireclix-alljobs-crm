"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface QueuedRecipient {
  id: string;
  candidate_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  scheduled_at: string | null;
}

interface CampaignScheduledQueueProps {
  campaignId: string;
  scheduledAt: string | null;
  isExpanded: boolean;
}

export const CampaignScheduledQueue = ({
  campaignId,
  scheduledAt,
  isExpanded,
}: CampaignScheduledQueueProps) => {
  const [recipients, setRecipients] = useState<QueuedRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded || !campaignId) return;

    const fetchQueue = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select(`
          id,
          candidate_id,
          candidates (
            first_name,
            last_name,
            email
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('status', 'scheduled');

      if (error) {
        console.error('Error fetching scheduled queue:', error);
        setIsLoading(false);
        return;
      }

      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        candidate_id: r.candidate_id,
        first_name: r.candidates?.first_name ?? null,
        last_name: r.candidates?.last_name ?? null,
        email: r.candidates?.email ?? null,
        scheduled_at: scheduledAt,
      }));
      setRecipients(mapped);
      setIsLoading(false);
    };

    fetchQueue();
  }, [campaignId, scheduledAt, isExpanded]);

  if (!isExpanded) return null;

  const displayDate = scheduledAt ? format(new Date(scheduledAt), 'PPP p') : '—';

  return (
    <div className="mt-4 border-t pt-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        Scheduled queue · {displayDate}
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : recipients.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emails in queue</p>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 font-medium">Recipient</th>
                <th className="text-left p-2 font-medium">Email</th>
                <th className="text-left p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2">
                    {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="p-2 text-muted-foreground">{r.email || '—'}</td>
                  <td className="p-2">
                    <span className="text-sunrise font-medium">Queued</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
