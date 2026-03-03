import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationService } from '@/services';
import type { CreateCommunicationData, UpdateCommunicationData } from '@/types/Communication';
import type { CreateNoteData, UpdateNoteData } from '@/types/Note';
import { toast } from 'sonner';

/**
 * React Query hooks for communications and notes
 */

// ==================== COMMUNICATIONS ====================

export const useCommunications = (candidateId: string) => {
  return useQuery({
    queryKey: ['communications', candidateId],
    queryFn: () => communicationService.getByCandidate(candidateId),
    enabled: !!candidateId,
  });
};

export const useCreateCommunication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommunicationData) => communicationService.createCommunication(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communications', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['activity', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['myActivity'] });
      toast.success('Communication logged');
    },
    onError: (error: Error) => {
      toast.error(`Failed to log communication: ${error.message}`);
    },
  });
};

export const useUpdateCommunication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, candidateId }: { id: string; data: UpdateCommunicationData; candidateId: string }) => 
      communicationService.updateCommunication(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communications', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['activity', variables.candidateId] });
      toast.success('Communication updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update communication: ${error.message}`);
    },
  });
};

export const useDeleteCommunication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, candidateId }: { id: string; candidateId: string }) => 
      communicationService.deleteCommunication(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communications', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['activity', variables.candidateId] });
      toast.success('Communication deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete communication: ${error.message}`);
    },
  });
};

// ==================== NOTES ====================

export const useNotes = (candidateId: string) => {
  return useQuery({
    queryKey: ['notes', candidateId],
    queryFn: () => communicationService.getNotesByCandidate(candidateId),
    enabled: !!candidateId,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNoteData) => communicationService.createNote(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['activity', variables.candidateId] });
      toast.success('Note added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, candidateId }: { id: string; data: UpdateNoteData; candidateId: string }) => 
      communicationService.updateNote(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['activity', variables.candidateId] });
      toast.success('Note updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update note: ${error.message}`);
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, candidateId }: { id: string; candidateId: string }) => 
      communicationService.deleteNote(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['activity', variables.candidateId] });
      toast.success('Note deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete note: ${error.message}`);
    },
  });
};

// ==================== ACTIVITY ====================

export const useRecentActivity = (candidateId: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['activity', candidateId, limit],
    queryFn: () => communicationService.getRecentActivity(candidateId, limit),
    enabled: !!candidateId,
  });
};
