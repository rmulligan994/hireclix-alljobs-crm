import { supabase } from '@/integrations/supabase/client';
import type { 
  Communication, 
  CreateCommunicationData, 
  UpdateCommunicationData 
} from '@/types/Communication';
import type { Note, CreateNoteData, UpdateNoteData } from '@/types/Note';

/**
 * Communication Service
 * 
 * Handles all communication and notes-related database operations.
 * This is the ONLY place where database calls for communications should exist.
 */

const mapRowToCommunication = (row: any): Communication => ({
  id: row.id,
  candidateId: row.candidate_id,
  type: row.type,
  subject: row.subject,
  content: row.content,
  direction: row.direction,
  occurredAt: new Date(row.occurred_at),
  createdAt: new Date(row.created_at),
  createdBy: row.created_by,
});

const mapRowToNote = (row: any): Note => ({
  id: row.id,
  candidateId: row.candidate_id,
  content: row.content,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  createdBy: row.created_by,
});

export const communicationService = {
  // ==================== COMMUNICATIONS ====================

  /**
   * Get all communications for a candidate
   */
  getByCandidate: async (candidateId: string): Promise<Communication[]> => {
    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToCommunication);
  },

  /**
   * Create a new communication
   */
  createCommunication: async (data: CreateCommunicationData): Promise<Communication> => {
    const { data: user } = await supabase.auth.getUser();
    
    const { data: result, error } = await supabase
      .from('communications')
      .insert({
        candidate_id: data.candidateId,
        type: data.type,
        subject: data.subject,
        content: data.content,
        direction: data.direction,
        occurred_at: data.occurredAt?.toISOString() || new Date().toISOString(),
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToCommunication(result);
  },

  /**
   * Update a communication
   */
  updateCommunication: async (id: string, data: UpdateCommunicationData): Promise<Communication> => {
    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.direction !== undefined) updateData.direction = data.direction;
    if (data.occurredAt !== undefined) updateData.occurred_at = data.occurredAt.toISOString();

    const { data: result, error } = await supabase
      .from('communications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapRowToCommunication(result);
  },

  /**
   * Delete a communication
   */
  deleteCommunication: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('communications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==================== NOTES ====================

  /**
   * Get all notes for a candidate
   */
  getNotesByCandidate: async (candidateId: string): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToNote);
  },

  /**
   * Create a new note
   */
  createNote: async (data: CreateNoteData): Promise<Note> => {
    const { data: user } = await supabase.auth.getUser();
    
    const { data: result, error } = await supabase
      .from('notes')
      .insert({
        candidate_id: data.candidateId,
        content: data.content,
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToNote(result);
  },

  /**
   * Update a note
   */
  updateNote: async (id: string, data: UpdateNoteData): Promise<Note> => {
    const { data: result, error } = await supabase
      .from('notes')
      .update({ content: data.content })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapRowToNote(result);
  },

  /**
   * Delete a note
   */
  deleteNote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get recent activity for a candidate (notes + communications)
   */
  getRecentActivity: async (candidateId: string, limit: number = 10): Promise<Array<Communication | Note>> => {
    const [communications, notes] = await Promise.all([
      communicationService.getByCandidate(candidateId),
      communicationService.getNotesByCandidate(candidateId),
    ]);

    // Combine and sort by date
    type ActivityItem = (Communication & { activityType: 'communication' }) | (Note & { activityType: 'note'; occurredAt: Date });
    
    const allActivity: ActivityItem[] = [
      ...communications.map(c => ({ ...c, activityType: 'communication' as const })),
      ...notes.map(n => ({ ...n, activityType: 'note' as const, occurredAt: n.createdAt })),
    ].sort((a, b) => {
      const dateA = a.activityType === 'communication' ? a.occurredAt : a.createdAt;
      const dateB = b.activityType === 'communication' ? b.occurredAt : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    return allActivity.slice(0, limit);
  },
};
