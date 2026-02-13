import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService, type UpdateOrganizationSettingsInput } from '@/services/organizationService';

export const useOrganizationSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['organization-settings'],
    queryFn: () => organizationService.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateOrganizationSettingsInput) => organizationService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
