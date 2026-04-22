"use client";

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Loader2 } from 'lucide-react';
import { useTalentPools } from '@/hooks/useTalentPools';
import { usePipelines } from '@/hooks/usePipelines';
import { useFilteredCandidates, useAddCampaignRecipients, useCampaign, useCampaignRecipients } from '@/hooks/useCampaigns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { AudienceFilter, LeadStatus } from '@/types/Campaign';
import { LeadUsageIndicator } from '@/components/candidates/LeadUsageIndicator';

interface AddRecipientsModalProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddRecipientsModal = ({
  campaignId,
  open,
  onOpenChange,
  onSuccess,
}: AddRecipientsModalProps) => {
  const queryClient = useQueryClient();
  const [selectedTalentPools, setSelectedTalentPools] = useState<string[]>([]);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<LeadStatus[]>([]);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const { toast } = useToast();
  const { data: talentPools } = useTalentPools();
  const { data: pipelines } = usePipelines();
  const { data: filteredCandidates, isLoading: isLoadingCandidates } = useFilteredCandidates(audienceFilter);
  const { data: existingRecipients } = useCampaignRecipients(campaignId);
  const { data: campaign, isLoading: isLoadingCampaign } = useCampaign(campaignId);
  const addRecipients = useAddCampaignRecipients();

  const existingIds = new Set((existingRecipients || []).map((r) => r.candidate_id));
  const newCandidates = (filteredCandidates || []).filter((c) => !existingIds.has(c.id));

  useEffect(() => {
    setAudienceFilter({
      talentPoolIds: selectedTalentPools.length ? selectedTalentPools : undefined,
      pipelineIds: selectedPipelines.length ? selectedPipelines : undefined,
      leadStatus: selectedLeadStatus.length ? selectedLeadStatus : undefined,
    });
  }, [selectedTalentPools, selectedPipelines, selectedLeadStatus]);

  const toggleTalentPool = (id: string) => {
    setSelectedTalentPools((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const togglePipeline = (id: string) => {
    setSelectedPipelines((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const toggleLeadStatus = (status: LeadStatus) => {
    setSelectedLeadStatus((p) =>
      p.includes(status) ? p.filter((s) => s !== status) : [...p, status]
    );
  };

  const handleAdd = async () => {
    if (newCandidates.length === 0) {
      toast({ title: 'No new recipients to add', variant: 'destructive' });
      return;
    }
    const queueForScheduledSend =
      campaign?.status === 'scheduled' &&
      campaign.scheduled_at != null &&
      new Date(campaign.scheduled_at).getTime() > Date.now();
    try {
      await addRecipients.mutateAsync({
        campaignId,
        candidateIds: newCandidates.map((c) => c.id),
      });
      const body = queueForScheduledSend
        ? { campaignId, scheduledAt: campaign!.scheduled_at! }
        : { campaignId };
      const { data, error } = await supabase.functions.invoke('send-campaign-email', { body });
      if (error) throw error;
      if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
        throw new Error(String((data as { error: string }).error));
      }
      const n = newCandidates.length;
      toast(
        queueForScheduledSend
          ? {
              title: 'Recipients added',
              description: `Added ${n} recipient${n === 1 ? '' : 's'}. Their first email is queued for your campaign’s scheduled time.`,
            }
          : {
              title: 'Recipients added',
              description: `Added ${n} recipient${n === 1 ? '' : 's'}. First email sent.`,
            },
      );
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-recipients', campaignId] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast({ title: 'Failed to add recipients', description: (err as Error)?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add recipients</DialogTitle>
          <DialogDescription>
            Select talent pools or pipelines. New candidates are added to the campaign; the first message sends when the
            campaign runs (immediately for active campaigns, or at the scheduled time for scheduled campaigns).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Talent Pools</Label>
            <ScrollArea className="h-24 border rounded-md p-2 mt-1">
              {talentPools?.map((pool) => (
                <div key={pool.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`add-pool-${pool.id}`}
                    checked={selectedTalentPools.includes(pool.id)}
                    onCheckedChange={() => toggleTalentPool(pool.id)}
                  />
                  <label htmlFor={`add-pool-${pool.id}`} className="text-sm cursor-pointer">
                    {pool.name}
                  </label>
                </div>
              ))}
              {(!talentPools || talentPools.length === 0) && (
                <p className="text-sm text-muted-foreground py-2">No talent pools</p>
              )}
            </ScrollArea>
          </div>
          <div>
            <Label>Pipelines</Label>
            <ScrollArea className="h-24 border rounded-md p-2 mt-1">
              {pipelines?.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`add-pipeline-${pipeline.id}`}
                    checked={selectedPipelines.includes(pipeline.id)}
                    onCheckedChange={() => togglePipeline(pipeline.id)}
                  />
                  <label htmlFor={`add-pipeline-${pipeline.id}`} className="text-sm cursor-pointer">
                    {pipeline.name}
                  </label>
                </div>
              ))}
              {(!pipelines || pipelines.length === 0) && (
                <p className="text-sm text-muted-foreground py-2">No pipelines</p>
              )}
            </ScrollArea>
          </div>

          <div>
            <Label>Filter by lead status</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="add-lead-red"
                  checked={selectedLeadStatus.includes("red")}
                  onCheckedChange={() => toggleLeadStatus("red")}
                  className="border-muted-foreground data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  Recently contacted
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="add-lead-yellow"
                  checked={selectedLeadStatus.includes("yellow")}
                  onCheckedChange={() => toggleLeadStatus("yellow")}
                  className="border-muted-foreground data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  Contacted 2–8 weeks ago
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="add-lead-green"
                  checked={selectedLeadStatus.includes("green")}
                  onCheckedChange={() => toggleLeadStatus("green")}
                  className="border-muted-foreground data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  No contact in 2+ months
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-blue" />
              <span className="font-medium">New recipients to add</span>
            </div>
            <span className="text-xl font-bold text-sky-blue">
              {isLoadingCandidates ? <Loader2 className="w-5 h-5 animate-spin" /> : newCandidates.length}
            </span>
          </div>

          {newCandidates.length > 0 && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <ScrollArea className="h-24 border rounded-md p-2">
                <div className="space-y-1">
                  {newCandidates.slice(0, 8).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <LeadUsageIndicator
                        lastActivityAt={c.last_activity_at ? new Date(c.last_activity_at) : null}
                      />
                      <span>
                        {c.first_name} {c.last_name} {c.email ? `- ${c.email}` : ""}
                      </span>
                    </div>
                  ))}
                  {newCandidates.length > 8 && (
                    <div className="text-sm text-muted-foreground">
                      And {newCandidates.length - 8} more...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={newCandidates.length === 0 || addRecipients.isPending || isLoadingCampaign}
            >
              {addRecipients.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {campaign?.status === 'scheduled' &&
              campaign.scheduled_at &&
              new Date(campaign.scheduled_at).getTime() > Date.now()
                ? 'Add & queue for scheduled send'
                : 'Add & send first email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
