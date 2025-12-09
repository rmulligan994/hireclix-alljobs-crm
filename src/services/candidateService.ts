import { supabase } from '@/integrations/supabase/client';
import type { 
  Candidate, 
  CandidateWithPipelines, 
  CreateCandidateData, 
  UpdateCandidateData 
} from '@/types/Candidate';

/**
 * Candidate Service
 * 
 * Handles all candidate-related database operations.
 * This is the ONLY place where database calls for candidates should exist.
 */

const mapRowToCandidate = (row: any): Candidate => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  company: row.company,
  title: row.title,
  location: row.location,
  source: row.source,
  tags: row.tags || [],
  linkedinUrl: row.linkedin_url,
  avatarUrl: row.avatar_url,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  createdBy: row.created_by,
});

export const candidateService = {
  /**
   * Get all candidates
   */
  getAll: async (): Promise<Candidate[]> => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToCandidate);
  },

  /**
   * Get a candidate by ID
   */
  getById: async (id: string): Promise<Candidate | null> => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToCandidate(data) : null;
  },

  /**
   * Get a candidate with their pipeline and talent pool associations
   */
  getByIdWithAssociations: async (id: string): Promise<CandidateWithPipelines | null> => {
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (candidateError) throw candidateError;
    if (!candidate) return null;

    // Get pipeline associations
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('pipeline_candidates')
      .select(`
        stage,
        added_at,
        pipeline_id,
        pipelines (id, name)
      `)
      .eq('candidate_id', id);

    if (pipelineError) throw pipelineError;

    // Get talent pool associations
    const { data: poolData, error: poolError } = await supabase
      .from('talent_pool_candidates')
      .select(`
        added_at,
        talent_pool_id,
        talent_pools (id, name)
      `)
      .eq('candidate_id', id);

    if (poolError) throw poolError;

    return {
      ...mapRowToCandidate(candidate),
      pipelines: (pipelineData || []).map((p: any) => ({
        pipelineId: p.pipeline_id,
        pipelineName: p.pipelines?.name || '',
        stage: p.stage,
        addedAt: new Date(p.added_at),
      })),
      talentPools: (poolData || []).map((p: any) => ({
        poolId: p.talent_pool_id,
        poolName: p.talent_pools?.name || '',
        addedAt: new Date(p.added_at),
      })),
    };
  },

  /**
   * Create a new candidate
   */
  create: async (data: CreateCandidateData): Promise<Candidate> => {
    const { data: user } = await supabase.auth.getUser();
    
    const { data: result, error } = await supabase
      .from('candidates')
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        title: data.title,
        location: data.location,
        source: data.source,
        tags: data.tags || [],
        linkedin_url: data.linkedinUrl,
        avatar_url: data.avatarUrl,
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToCandidate(result);
  },

  /**
   * Update a candidate
   */
  update: async (id: string, data: UpdateCandidateData): Promise<Candidate> => {
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.linkedinUrl !== undefined) updateData.linkedin_url = data.linkedinUrl;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

    const { data: result, error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapRowToCandidate(result);
  },

  /**
   * Delete a candidate
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Search candidates by query
   */
  search: async (query: string): Promise<Candidate[]> => {
    const searchTerm = `%${query}%`;
    
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm},title.ilike.${searchTerm}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToCandidate);
  },

  /**
   * Find potential duplicates by email or phone
   */
  findDuplicates: async (email?: string, phone?: string): Promise<Candidate[]> => {
    if (!email && !phone) return [];

    let query = supabase.from('candidates').select('*');
    
    if (email && phone) {
      query = query.or(`email.eq.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapRowToCandidate);
  },

  /**
   * Get candidates count
   */
  getCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get candidates added this week
   */
  getNewThisWeek: async (): Promise<number> => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count, error } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString());

    if (error) throw error;
    return count || 0;
  },
};
