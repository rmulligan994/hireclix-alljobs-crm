import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';

export const useCampaignFolders = () => {
  return useQuery({
    queryKey: ['campaign-folders'],
    queryFn: () => campaignService.getFolders(),
  });
};

export const useCreateCampaignFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => campaignService.createFolder(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-folders'] });
    },
  });
};
