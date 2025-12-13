import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplateService, CreateEmailTemplateInput, UpdateEmailTemplateInput } from '@/services/emailTemplateService';
import { useToast } from '@/hooks/use-toast';

export const useEmailTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplateService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateEmailTemplateInput) => emailTemplateService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: 'Template created',
        description: 'Your email template has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmailTemplateInput }) => 
      emailTemplateService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: 'Template updated',
        description: 'Your email template has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: 'Template deleted',
        description: 'Your email template has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useEmailTemplate = (id: string | undefined) => {
  return useQuery({
    queryKey: ['email-templates', id],
    queryFn: () => (id ? emailTemplateService.getById(id) : null),
    enabled: !!id,
  });
};
