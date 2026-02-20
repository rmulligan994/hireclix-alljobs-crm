import { supabase } from '@/integrations/supabase/client';
import type { 
  Candidate, 
  CandidateWithPipelines, 
  CandidateListEnriched,
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
   * Get all candidates. Paginates past Supabase's 1000-row default limit.
   */
  getAll: async (): Promise<Candidate[]> => {
    const rows = await candidateService._fetchAllPaginated<any>('candidates', '*');
    return rows.map(mapRowToCandidate);
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
   * Get a candidate with their pipeline and talent pool associations.
   * Resolves pipeline stage IDs to human-readable stage names.
   */
  getByIdWithAssociations: async (id: string): Promise<CandidateWithPipelines | null> => {
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (candidateError) throw candidateError;
    if (!candidate) return null;

    const [pipelineRes, poolRes, pipelinesRes] = await Promise.all([
      supabase
        .from('pipeline_candidates')
        .select('stage, added_at, pipeline_id, pipelines (id, name)')
        .eq('candidate_id', id),
      supabase
        .from('talent_pool_candidates')
        .select('added_at, talent_pool_id, talent_pools (id, name)')
        .eq('candidate_id', id),
      supabase.from('pipelines').select('id, stages'),
    ]);

    if (pipelineRes.error) throw pipelineRes.error;
    if (poolRes.error) throw poolRes.error;
    if (pipelinesRes.error) throw pipelinesRes.error;

    const stageNameMap = new Map<string, string>();
    for (const p of pipelinesRes.data || []) {
      const stages = (p.stages as { id: string; name: string }[]) || [];
      for (const s of stages) {
        if (s?.id && s?.name) stageNameMap.set(s.id, s.name);
      }
    }

    return {
      ...mapRowToCandidate(candidate),
      pipelines: (pipelineRes.data || []).map((p: any) => ({
        pipelineId: p.pipeline_id,
        pipelineName: (p.pipelines as { id: string; name: string } | null)?.name || '',
        stage: stageNameMap.get(p.stage) || p.stage,
        addedAt: new Date(p.added_at),
      })),
      talentPools: (poolRes.data || []).map((p: any) => ({
        poolId: p.talent_pool_id,
        poolName: (p.talent_pools as { id: string; name: string } | null)?.name || '',
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
   * Create multiple candidates in batches. Much faster than sequential create() for CSV imports.
   * On batch failure, falls back to row-by-row for that batch to preserve per-row error reporting.
   */
  createMany: async (
    items: CreateCandidateData[],
    options?: { batchSize?: number; onProgress?: (created: number, total: number) => void }
  ): Promise<{ created: number; failed: number; errors: string[] }> => {
    const batchSize = options?.batchSize ?? 50;
    const onProgress = options?.onProgress;
    const errors: string[] = [];
    let created = 0;
    let failed = 0;

    const { data: user } = await supabase.auth.getUser();
    const createdBy = user?.user?.id;

    const toRow = (data: CreateCandidateData) => ({
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
      created_by: createdBy,
    });

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const rows = batch.map(toRow);

      const { data, error } = await supabase
        .from('candidates')
        .insert(rows)
        .select('id');

      if (error) {
        // Batch failed - fall back to row-by-row for this batch to preserve error reporting
        for (let j = 0; j < batch.length; j++) {
          const rowIndex = i + j + 2; // +2 for 1-based + header row
          const { error: rowError } = await supabase.from('candidates').insert(toRow(batch[j]));
          if (rowError) {
            failed++;
            errors.push(`Row ${rowIndex}: ${rowError.message}`);
          } else {
            created++;
          }
        }
      } else {
        created += data?.length ?? batch.length;
      }

      onProgress?.(Math.min(i + batch.length, items.length), items.length);
    }

    return { created, failed, errors };
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
   * Merge duplicate candidate into the kept candidate, then delete the duplicate.
   * Reassigns all related records (pipelines, pools, notes, communications, etc.) to the kept candidate.
   */
  mergeCandidates: async (
    keepId: string,
    removeId: string,
    mergedData: UpdateCandidateData
  ): Promise<void> => {
    // 1. Reassign pipeline_candidates (handle unique: pipeline_id + candidate_id)
    const { data: removePipelineRows } = await supabase
      .from('pipeline_candidates')
      .select('id, pipeline_id')
      .eq('candidate_id', removeId);

    for (const row of removePipelineRows || []) {
      const { data: existing } = await supabase
        .from('pipeline_candidates')
        .select('id')
        .eq('pipeline_id', row.pipeline_id)
        .eq('candidate_id', keepId)
        .maybeSingle();

      if (existing) {
        await supabase.from('pipeline_candidates').delete().eq('id', row.id);
      } else {
        await supabase.from('pipeline_candidates').update({ candidate_id: keepId }).eq('id', row.id);
      }
    }

    // 2. Reassign talent_pool_candidates (handle unique: talent_pool_id + candidate_id)
    const { data: removePoolRows } = await supabase
      .from('talent_pool_candidates')
      .select('id, talent_pool_id')
      .eq('candidate_id', removeId);

    for (const row of removePoolRows || []) {
      const { data: existing } = await supabase
        .from('talent_pool_candidates')
        .select('id')
        .eq('talent_pool_id', row.talent_pool_id)
        .eq('candidate_id', keepId)
        .maybeSingle();

      if (existing) {
        await supabase.from('talent_pool_candidates').delete().eq('id', row.id);
      } else {
        await supabase.from('talent_pool_candidates').update({ candidate_id: keepId }).eq('id', row.id);
      }
    }

    // 3. Reassign campaign_recipients (handle unique: campaign_id + candidate_id)
    const { data: removeCampaignRows } = await supabase
      .from('campaign_recipients')
      .select('id, campaign_id')
      .eq('candidate_id', removeId);

    for (const row of removeCampaignRows || []) {
      const { data: existing } = await supabase
        .from('campaign_recipients')
        .select('id')
        .eq('campaign_id', row.campaign_id)
        .eq('candidate_id', keepId)
        .maybeSingle();

      if (existing) {
        await supabase.from('campaign_recipients').delete().eq('id', row.id);
      } else {
        await supabase.from('campaign_recipients').update({ candidate_id: keepId }).eq('id', row.id);
      }
    }

    // 4. Reassign communications and notes (no unique on candidate_id)
    await supabase.from('communications').update({ candidate_id: keepId }).eq('candidate_id', removeId);
    await supabase.from('notes').update({ candidate_id: keepId }).eq('candidate_id', removeId);

    // 5. Reassign candidate_resumes (handle primary flag - only one primary per candidate)
    const { data: removeResumes } = await supabase
      .from('candidate_resumes')
      .select('id, is_primary')
      .eq('candidate_id', removeId);

    const { data: keepPrimary } = await supabase
      .from('candidate_resumes')
      .select('id')
      .eq('candidate_id', keepId)
      .eq('is_primary', true)
      .maybeSingle();

    for (const row of removeResumes || []) {
      if (row.is_primary && keepPrimary) {
        await supabase.from('candidate_resumes').update({ candidate_id: keepId, is_primary: false }).eq('id', row.id);
      } else {
        await supabase.from('candidate_resumes').update({ candidate_id: keepId }).eq('id', row.id);
      }
    }

    // 6. Update kept candidate with merged data
    const updateData: Record<string, unknown> = {};
    if (mergedData.firstName !== undefined) updateData.first_name = mergedData.firstName;
    if (mergedData.lastName !== undefined) updateData.last_name = mergedData.lastName;
    if (mergedData.email !== undefined) updateData.email = mergedData.email;
    if (mergedData.phone !== undefined) updateData.phone = mergedData.phone;
    if (mergedData.company !== undefined) updateData.company = mergedData.company;
    if (mergedData.title !== undefined) updateData.title = mergedData.title;
    if (mergedData.location !== undefined) updateData.location = mergedData.location;
    if (mergedData.source !== undefined) updateData.source = mergedData.source;
    if (mergedData.tags !== undefined) updateData.tags = mergedData.tags;
    if (mergedData.linkedinUrl !== undefined) updateData.linkedin_url = mergedData.linkedinUrl;
    if (mergedData.avatarUrl !== undefined) updateData.avatar_url = mergedData.avatarUrl;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('id', keepId);
      if (updateError) throw updateError;
    }

    // 7. Delete the duplicate candidate (CASCADE will clean any remaining refs)
    const { error: deleteError } = await supabase.from('candidates').delete().eq('id', removeId);
    if (deleteError) throw deleteError;
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
   * Find all duplicate pairs in the database (by email or phone).
   * Returns groups where multiple candidates share the same email or phone.
   */
  findAllDuplicates: async (): Promise<{ candidate: Candidate; duplicates: Candidate[]; matchType: 'email' | 'phone' }[]> => {
    const rows = await candidateService._fetchAllPaginated<any>('candidates', '*');
    const all = rows.map(mapRowToCandidate);

    const results: { candidate: Candidate; duplicates: Candidate[]; matchType: 'email' | 'phone' }[] = [];
    const seen = new Set<string>();

    const normalizePhone = (p: string | undefined) => (p || '').replace(/\D/g, '');
    const normalizeEmail = (e: string | undefined) => (e || '').trim().toLowerCase();

    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      if (seen.has(c.id)) continue;

      const email = normalizeEmail(c.email);
      const phone = normalizePhone(c.phone);

      const dups: Candidate[] = [];
      let matchType: 'email' | 'phone' | null = null;

      for (let j = i + 1; j < all.length; j++) {
        const other = all[j];
        if (seen.has(other.id)) continue;

        const isEmailMatch = email && email === normalizeEmail(other.email);
        const isPhoneMatch = phone && phone.length > 6 && phone === normalizePhone(other.phone);

        if (isEmailMatch || isPhoneMatch) {
          dups.push(other);
          seen.add(other.id);
          if (!matchType) matchType = isEmailMatch ? 'email' : 'phone';
        }
      }

      if (dups.length > 0) {
        seen.add(c.id);
        results.push({ candidate: c, duplicates: dups, matchType: matchType! });
      }
    }

    return results;
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

  /**
   * Fetch all rows from a query, paginating past Supabase's 1000-row default limit.
   */
  async _fetchAllPaginated<T>(
    table: 'candidates' | 'pipeline_candidates' | 'communications' | 'campaign_recipients',
    select: string,
    orderBy = 'created_at',
    ascending = false,
    extraFilter?: (q: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>
  ): Promise<T[]> {
    const PAGE_SIZE = 1000;
    const all: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from(table).select(select).order(orderBy, { ascending });
      if (extraFilter) query = extraFilter(query);
      const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data || []) as T[];
      all.push(...rows);
      hasMore = rows.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }
    return all;
  },

  /**
   * Get all candidates with pipeline associations (stage names) and last contact date.
   * Last contact = most recent of: communications.occurred_at, campaign_recipients.sent_at
   * Paginates past Supabase's 1000-row default limit.
   */
  getListWithEnrichment: async (): Promise<CandidateListEnriched[]> => {
    const svc = candidateService;
    const [candidatesData, pipelineData, pipelinesRes, commsData, campaignData] = await Promise.all([
      svc._fetchAllPaginated<any>('candidates', '*'),
      svc._fetchAllPaginated<any>(
        'pipeline_candidates',
        'candidate_id, pipeline_id, stage, pipelines(id, name)',
        'candidate_id'
      ),
      supabase.from('pipelines').select('id, stages'),
      svc._fetchAllPaginated<any>('communications', 'candidate_id, occurred_at', 'occurred_at', false),
      svc._fetchAllPaginated<any>(
        'campaign_recipients',
        'candidate_id, sent_at',
        'sent_at',
        false,
        (q) => q.not('sent_at', 'is', null)
      ),
    ]);

    if (pipelinesRes.error) throw pipelinesRes.error;

    const candidates = candidatesData.map(mapRowToCandidate);

    const stageNameMap = new Map<string, string>();
    for (const p of pipelinesRes.data || []) {
      const stages = (p.stages as { id: string; name: string }[]) || [];
      for (const s of stages) {
        if (s?.id && s?.name) stageNameMap.set(s.id, s.name);
      }
    }

    const pipelineByCandidate = new Map<string, { id: string; name: string; stage: string }[]>();
    for (const pc of pipelineData || []) {
      const stageName = stageNameMap.get(pc.stage) || pc.stage;
      const pipelineName = (pc.pipelines as { id: string; name: string } | null)?.name || pc.pipeline_id;
      const list = pipelineByCandidate.get(pc.candidate_id) || [];
      list.push({
        id: pc.pipeline_id,
        name: pipelineName,
        stage: stageName,
      });
      pipelineByCandidate.set(pc.candidate_id, list);
    }

    const lastContactByCandidate = new Map<string, Date>();
    for (const c of commsData || []) {
      const at = new Date(c.occurred_at);
      const existing = lastContactByCandidate.get(c.candidate_id);
      if (!existing || at > existing) lastContactByCandidate.set(c.candidate_id, at);
    }
    for (const r of campaignData || []) {
      const at = new Date(r.sent_at!);
      const existing = lastContactByCandidate.get(r.candidate_id);
      if (!existing || at > existing) lastContactByCandidate.set(r.candidate_id, at);
    }

    return candidates.map((c) => ({
      ...c,
      pipelineAssociations: pipelineByCandidate.get(c.id) || [],
      lastContactAt: lastContactByCandidate.get(c.id) || null,
    }));
  },
};
