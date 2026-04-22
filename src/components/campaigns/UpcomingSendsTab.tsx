"use client";

import { useState, useMemo, useEffect } from 'react';
import { useScheduledEmails } from '@/hooks/useCampaigns';
import { useAllProfiles, useCurrentUser } from '@/hooks/useAuth';
import { profileDisplayName } from '@/lib/profileDisplayName';
import type { Profile } from '@/types/User';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { Mail, Calendar } from 'lucide-react';

const groupByDate = (items: Array<{
  scheduled_at: string;
  campaign_name: string;
  campaign_email_subject: string;
  campaign_id: string;
  campaign_email_id: string;
  scheduled_date: string;
  recipient_count: number;
  step_order?: number;
  total_steps?: number;
  schedule_label?: string | null;
  source?: 'scheduled_emails' | 'campaign';
  sender_user_id: string;
}>) => {
  const today = startOfDay(new Date());
  const groups: { label: string; items: typeof items }[] = [
    { label: 'Today', items: [] },
    { label: 'Tomorrow', items: [] },
    { label: 'This week', items: [] },
    { label: 'Later', items: [] },
  ];
  for (const item of items) {
    const d = new Date(item.scheduled_at);
    const day = startOfDay(d);
    if (isToday(d)) groups[0].items.push(item);
    else if (isTomorrow(d)) groups[1].items.push(item);
    else if (day < addDays(today, 7)) groups[2].items.push(item);
    else groups[3].items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
};

export const UpcomingSendsTab = ({ onViewCampaign }: { onViewCampaign?: (campaignId: string) => void }) => {
  const { data: scheduled, isLoading } = useScheduledEmails();
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const { data: allProfiles = [] } = useAllProfiles(true);
  const [senderUserId, setSenderUserId] = useState<string>('');

  const profileByUserId = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of allProfiles) m.set(p.userId, p);
    return m;
  }, [allProfiles]);

  const senderOptions = useMemo(() => {
    const list = scheduled ?? [];
    const ids = [...new Set(list.map((s) => s.sender_user_id).filter(Boolean))] as string[];
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
  }, [scheduled, currentUserId, profileByUserId]);

  useEffect(() => {
    if (!senderUserId) return;
    if (!senderOptions.some((o) => o.id === senderUserId)) {
      setSenderUserId('');
    }
  }, [senderUserId, senderOptions]);

  const filteredScheduled = useMemo(() => {
    if (!senderUserId) return scheduled || [];
    return (scheduled || []).filter((s) => s.sender_user_id === senderUserId);
  }, [scheduled, senderUserId]);

  const senderFilterRow =
    senderOptions.length > 0 ? (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Sender</span>
        <Select value={senderUserId || 'all'} onValueChange={(v) => setSenderUserId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[min(100%,14rem)] h-9">
            <SelectValue placeholder="All senders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All senders</SelectItem>
            {senderOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const hasAnyScheduled = (scheduled || []).length > 0;
  const groups = groupByDate(filteredScheduled);

  if (!hasAnyScheduled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No upcoming sends</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            When you schedule a campaign for later (instead of launching now), it will appear here. In the Sequence step, choose &quot;Schedule for later&quot; when setting when the first email sends.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-4">
        {senderFilterRow}
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">No upcoming sends for this sender</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-4">
              Try choosing another sender or show all senders.
            </p>
            {senderUserId && (
              <Button variant="outline" size="sm" onClick={() => setSenderUserId('')}>
                Show all senders
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {senderFilterRow}
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{group.label}</h3>
          <div className="space-y-2">
            {group.items.map((item) => (
              <Card key={`${item.campaign_id}-${item.campaign_email_id}-${item.scheduled_date}`} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-sky-blue/10">
                    <Mail className="w-5 h-5 text-sky-blue" />
                  </div>
                  <div>
                    <div className="font-medium">{item.campaign_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.step_order != null && item.total_steps != null ? (
                        <>
                          Email {item.step_order} of {item.total_steps}
                          {item.schedule_label && (
                            <span className="text-muted-foreground/80"> · {item.schedule_label}</span>
                          )}
                          {!item.schedule_label && item.campaign_email_subject && (
                            <span> · {item.campaign_email_subject}</span>
                          )}
                        </>
                      ) : (
                        item.campaign_email_subject
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.scheduled_at), 'PPP p')} · {item.recipient_count} email{item.recipient_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                {onViewCampaign && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewCampaign(item.campaign_id)}>
                      View
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
