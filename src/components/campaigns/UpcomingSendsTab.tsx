"use client";

import { useScheduledEmails } from '@/hooks/useCampaigns';
import { campaignService } from '@/services/campaignService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { Mail, Calendar, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const groupByDate = (items: Array<{ scheduled_at: string; campaign_name: string; campaign_email_subject: string; campaign_id: string; campaign_email_id: string; scheduled_date: string; recipient_count: number; step_order?: number; total_steps?: number; schedule_label?: string | null; source?: 'scheduled_emails' | 'campaign' }>) => {
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCancel = async (item: { campaign_id: string; campaign_email_id: string; scheduled_date: string; source?: 'scheduled_emails' | 'campaign' }) => {
    try {
      if (item.source === 'campaign') {
        await campaignService.cancelCampaignSchedule(item.campaign_id);
      } else {
        await campaignService.cancelScheduledSend(item.campaign_id, item.campaign_email_id, item.scheduled_date);
      }
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      toast({ title: 'Send cancelled' });
    } catch {
      toast({ title: 'Failed to cancel', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const groups = groupByDate(scheduled || []);

  if (groups.length === 0) {
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

  return (
    <div className="space-y-6">
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
                <div className="flex items-center gap-2">
                  {onViewCampaign && (
                    <Button variant="outline" size="sm" onClick={() => onViewCampaign(item.campaign_id)}>
                      View
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleCancel(item)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
