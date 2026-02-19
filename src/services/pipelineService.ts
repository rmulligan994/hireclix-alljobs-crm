import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { 
  Pipeline, 
  PipelineWithCandidates, 
  CreatePipelineData, 
  UpdatePipelineData,
  PipelineStage,
  PipelineCandidate
} from '@/types/Pipeline';

/**
 * Pipeline Service
 * 
 * Handles all pipeline-related database operations.
 * This is the ONLY place where database calls for pipelines should exist.
 */

const defaultStages: PipelineStage[] = [
  { id: '1', name: 'New', order: 0, color: '#54A3DA' },
  { id: '2', name: 'Screening', order: 1, color: '#FAA21B' },
  { id: '3', name: 'Interview', order: 2, color: '#0B3555' },
  { id: '4', name: 'Offer', order: 3, color: '#22C55E' },
  { id: '5', name: 'Hired', order: 4, color: '#10B981' },
];

const mapRowToPipeline = (row: any): Pipeline => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status as 'active' | 'archived',
  stages: (row.stages as PipelineStage[]) || defaultStages,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  createdBy: row.created_by,
});

export const pipelineService = {
  /**
   * Get all pipelines
   */
  getAll: async (): Promise<Pipeline[]> => {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToPipeline);
  },

  /**
   * Get active pipelines only
   */
  getActive: async (): Promise<Pipeline[]> => {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToPipeline);
  },

  /**
   * Get archived pipelines only
   */
  getArchived: async (): Promise<Pipeline[]> => {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToPipeline);
  },

  /**
   * Get a pipeline by ID
   */
  getById: async (id: string): Promise<Pipeline | null> => {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToPipeline(data) : null;
  },

  /**
   * Get a pipeline with candidate count
   */
  getByIdWithCandidates: async (id: string): Promise<PipelineWithCandidates | null> => {
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (pipelineError) throw pipelineError;
    if (!pipeline) return null;

    const { data: candidates, error: candidatesError } = await supabase
      .from('pipeline_candidates')
      .select('candidate_id, stage, added_at')
      .eq('pipeline_id', id);

    if (candidatesError) throw candidatesError;

    return {
      ...mapRowToPipeline(pipeline),
      candidateCount: candidates?.length || 0,
      candidates: (candidates || []).map((c: any) => ({
        candidateId: c.candidate_id,
        stage: c.stage,
        addedAt: new Date(c.added_at),
      })),
    };
  },

  /**
   * Create a new pipeline
   */
  create: async (data: CreatePipelineData): Promise<Pipeline> => {
    const { data: user } = await supabase.auth.getUser();
    
    const stagesToInsert = (data.stages || defaultStages) as unknown as Json;
    
    const { data: result, error } = await supabase
      .from('pipelines')
      .insert([{
        name: data.name,
        description: data.description,
        stages: stagesToInsert,
        status: 'active',
        created_by: user?.user?.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return mapRowToPipeline(result);
  },

  /**
   * Update a pipeline
   */
  update: async (id: string, data: UpdatePipelineData): Promise<Pipeline> => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.stages !== undefined) updateData.stages = data.stages;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: result, error } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapRowToPipeline(result);
  },

  /**
   * Archive a pipeline
   */
  archive: async (id: string): Promise<Pipeline> => {
    return pipelineService.update(id, { status: 'archived' });
  },

  /**
   * Unarchive a pipeline
   */
  unarchive: async (id: string): Promise<Pipeline> => {
    return pipelineService.update(id, { status: 'active' });
  },

  /**
   * Delete a pipeline
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Add multiple candidates to a pipeline (bulk)
   */
  addCandidates: async (pipelineId: string, candidateIds: string[]): Promise<void> => {
    if (candidateIds.length === 0) return;
    const pipeline = await pipelineService.getById(pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');
    const firstStage = pipeline.stages?.[0];
    const stage = firstStage?.id ?? firstStage?.name ?? '1';

    const rows = candidateIds.map((candidateId) => ({
      pipeline_id: pipelineId,
      candidate_id: candidateId,
      stage,
    }));

    const { error } = await supabase.from('pipeline_candidates').insert(rows);
    if (error) throw error;
  },

  /**
   * Add a candidate to a pipeline
   */
  addCandidate: async (pipelineId: string, candidateId: string, stage: string): Promise<PipelineCandidate> => {
    const { data, error } = await supabase
      .from('pipeline_candidates')
      .insert({
        pipeline_id: pipelineId,
        candidate_id: candidateId,
        stage,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      pipelineId: data.pipeline_id,
      candidateId: data.candidate_id,
      stage: data.stage,
      addedAt: new Date(data.added_at),
      updatedAt: new Date(data.updated_at),
    };
  },

  /**
   * Remove a candidate from a pipeline
   */
  removeCandidate: async (pipelineId: string, candidateId: string): Promise<void> => {
    const { error } = await supabase
      .from('pipeline_candidates')
      .delete()
      .eq('pipeline_id', pipelineId)
      .eq('candidate_id', candidateId);

    if (error) throw error;
  },

  /**
   * Update a candidate's stage in a pipeline
   */
  updateCandidateStage: async (pipelineId: string, candidateId: string, stage: string): Promise<void> => {
    const { error } = await supabase
      .from('pipeline_candidates')
      .update({ stage })
      .eq('pipeline_id', pipelineId)
      .eq('candidate_id', candidateId);

    if (error) throw error;
  },

  /**
   * Get candidates in a pipeline
   */
  getCandidates: async (pipelineId: string): Promise<PipelineCandidate[]> => {
    const { data, error } = await supabase
      .from('pipeline_candidates')
      .select('*')
      .eq('pipeline_id', pipelineId);

    if (error) throw error;
    return (data || []).map((c: any) => ({
      id: c.id,
      pipelineId: c.pipeline_id,
      candidateId: c.candidate_id,
      stage: c.stage,
      addedAt: new Date(c.added_at),
      updatedAt: new Date(c.updated_at),
    }));
  },

  /**
   * Get count of active pipelines
   */
  getActiveCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (error) throw error;
    return count || 0;
  },
};
