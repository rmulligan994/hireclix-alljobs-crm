import { supabase } from '@/integrations/supabase/client';
import type { 
  TalentPool, 
  TalentPoolWithCandidates, 
  CreateTalentPoolData, 
  UpdateTalentPoolData,
  TalentPoolCandidate
} from '@/types/TalentPool';

/**
 * Talent Pool Service
 * 
 * Handles all talent pool-related database operations.
 * This is the ONLY place where database calls for talent pools should exist.
 */

const FETCH_LIMIT = 5000;

const mapRowToTalentPool = (row: any): TalentPool => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  createdBy: row.created_by,
});

export const talentPoolService = {
  /**
   * Get all talent pools
   */
  getAll: async (): Promise<TalentPool[]> => {
    const { data, error } = await supabase
      .from('talent_pools')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT);

    if (error) throw error;
    return (data || []).map(mapRowToTalentPool);
  },

  /**
   * Get all talent pools with candidate counts
   */
  getAllWithCounts: async (): Promise<TalentPoolWithCandidates[]> => {
    const { data: pools, error: poolsError } = await supabase
      .from('talent_pools')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT);

    if (poolsError) throw poolsError;

    const poolsWithCounts = await Promise.all(
      (pools || []).map(async (pool) => {
        const { data: candidates, error: candidatesError } = await supabase
          .from('talent_pool_candidates')
          .select('candidate_id, added_at')
          .eq('talent_pool_id', pool.id)
          .limit(FETCH_LIMIT);

        if (candidatesError) throw candidatesError;

        return {
          ...mapRowToTalentPool(pool),
          candidateCount: candidates?.length || 0,
          candidates: (candidates || []).map((c: any) => ({
            candidateId: c.candidate_id,
            addedAt: new Date(c.added_at),
          })),
        };
      })
    );

    return poolsWithCounts;
  },

  /**
   * Get a talent pool by ID
   */
  getById: async (id: string): Promise<TalentPool | null> => {
    const { data, error } = await supabase
      .from('talent_pools')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToTalentPool(data) : null;
  },

  /**
   * Get a talent pool with candidates
   */
  getByIdWithCandidates: async (id: string): Promise<TalentPoolWithCandidates | null> => {
    const { data: pool, error: poolError } = await supabase
      .from('talent_pools')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (poolError) throw poolError;
    if (!pool) return null;

    const { data: candidates, error: candidatesError } = await supabase
      .from('talent_pool_candidates')
      .select('candidate_id, added_at')
      .eq('talent_pool_id', id)
      .limit(FETCH_LIMIT);

    if (candidatesError) throw candidatesError;

    return {
      ...mapRowToTalentPool(pool),
      candidateCount: candidates?.length || 0,
      candidates: (candidates || []).map((c: any) => ({
        candidateId: c.candidate_id,
        addedAt: new Date(c.added_at),
      })),
    };
  },

  /**
   * Create a new talent pool
   */
  create: async (data: CreateTalentPoolData): Promise<TalentPool> => {
    const { data: user } = await supabase.auth.getUser();
    
    const { data: result, error } = await supabase
      .from('talent_pools')
      .insert({
        name: data.name,
        description: data.description,
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToTalentPool(result);
  },

  /**
   * Update a talent pool
   */
  update: async (id: string, data: UpdateTalentPoolData): Promise<TalentPool> => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: result, error } = await supabase
      .from('talent_pools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapRowToTalentPool(result);
  },

  /**
   * Delete a talent pool
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('talent_pools')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Add a candidate to a talent pool
   */
  addCandidate: async (poolId: string, candidateId: string): Promise<TalentPoolCandidate> => {
    const { data, error } = await supabase
      .from('talent_pool_candidates')
      .insert({
        talent_pool_id: poolId,
        candidate_id: candidateId,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      talentPoolId: data.talent_pool_id,
      candidateId: data.candidate_id,
      addedAt: new Date(data.added_at),
    };
  },

  /**
   * Add multiple candidates to a talent pool.
   * Returns counts so the UI can show how many were added vs already in pool.
   */
  addCandidates: async (poolId: string, candidateIds: string[]): Promise<{ added: number; skipped: number }> => {
    if (candidateIds.length === 0) return { added: 0, skipped: 0 };

    // Find which candidates are already in the pool
    const { data: existing } = await supabase
      .from('talent_pool_candidates')
      .select('candidate_id')
      .eq('talent_pool_id', poolId)
      .in('candidate_id', candidateIds);

    const existingIds = new Set((existing ?? []).map((r) => r.candidate_id));
    const toAdd = candidateIds.filter((id) => !existingIds.has(id));

    if (toAdd.length === 0) {
      return { added: 0, skipped: candidateIds.length };
    }

    const inserts = toAdd.map((candidateId) => ({
      talent_pool_id: poolId,
      candidate_id: candidateId,
    }));

    const { error } = await supabase
      .from('talent_pool_candidates')
      .insert(inserts);

    if (error) throw error;
    return { added: toAdd.length, skipped: existingIds.size };
  },

  /**
   * Remove a candidate from a talent pool
   */
  removeCandidate: async (poolId: string, candidateId: string): Promise<void> => {
    const { error } = await supabase
      .from('talent_pool_candidates')
      .delete()
      .eq('talent_pool_id', poolId)
      .eq('candidate_id', candidateId);

    if (error) throw error;
  },

  /**
   * Remove multiple candidates from a talent pool
   */
  removeCandidates: async (poolId: string, candidateIds: string[]): Promise<void> => {
    const { error } = await supabase
      .from('talent_pool_candidates')
      .delete()
      .eq('talent_pool_id', poolId)
      .in('candidate_id', candidateIds);

    if (error) throw error;
  },

  /**
   * Get candidates in a talent pool
   */
  getCandidates: async (poolId: string): Promise<TalentPoolCandidate[]> => {
    const { data, error } = await supabase
      .from('talent_pool_candidates')
      .select('*')
      .eq('talent_pool_id', poolId)
      .limit(FETCH_LIMIT);

    if (error) throw error;
    return (data || []).map((c: any) => ({
      id: c.id,
      talentPoolId: c.talent_pool_id,
      candidateId: c.candidate_id,
      addedAt: new Date(c.added_at),
    }));
  },

  /**
   * Get count of talent pools
   */
  getCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('talent_pools')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },
};
