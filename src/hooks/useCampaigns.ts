import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import type { 
  CreateCampaignInput, 
  UpdateCampaignInput,
  CreateCampaignEmailInput,
  UpdateCampaignEmailInput,
  AudienceFilter
} from '@/types/Campaign';

export const useCampaigns = () => {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.getAll(),
  });
};

export const useCampaign = (id: string) => {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignService.getById(id),
    enabled: !!id,
  });
};

export const useCampaignEmails = (campaignId: string) => {
  return useQuery({
    queryKey: ['campaign-emails', campaignId],
    queryFn: () => campaignService.getEmails(campaignId),
    enabled: !!campaignId,
  });
};

export const useCampaignRecipients = (campaignId: string) => {
  return useQuery({
    queryKey: ['campaign-recipients', campaignId],
    queryFn: () => campaignService.getRecipients(campaignId),
    enabled: !!campaignId,
  });
};

export const useFilteredCandidates = (filter: AudienceFilter) => {
  return useQuery({
    queryKey: ['filtered-candidates', filter],
    queryFn: () => campaignService.getFilteredCandidates(filter),
    enabled: Object.keys(filter).length > 0,
  });
};

export const useRecipientCount = (filter: AudienceFilter) => {
  return useQuery({
    queryKey: ['recipient-count', filter],
    queryFn: () => campaignService.getRecipientCount(filter),
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignInput) => campaignService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCampaignInput }) =>
      campaignService.update(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

export const useCreateCampaignEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignEmailInput) => campaignService.createEmail(input),
    onSuccess: (_, { campaign_id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-emails', campaign_id] });
    },
  });
};

export const useUpdateCampaignEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, campaignId, input }: { id: string; campaignId: string; input: UpdateCampaignEmailInput }) =>
      campaignService.updateEmail(id, input),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-emails', campaignId] });
    },
  });
};

export const useDeleteCampaignEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, campaignId }: { id: string; campaignId: string }) => 
      campaignService.deleteEmail(id),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-emails', campaignId] });
    },
  });
};

export const useAddCampaignRecipients = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, candidateIds }: { campaignId: string; candidateIds: string[] }) =>
      campaignService.addRecipients(campaignId, candidateIds),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-recipients', campaignId] });
    },
  });
};

export const useRemoveCampaignRecipient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, candidateId }: { campaignId: string; candidateId: string }) =>
      campaignService.removeRecipient(campaignId, candidateId),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-recipients', campaignId] });
    },
  });
};
