import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { 
  Candidate, 
  CandidateWithPipelines, 
  CandidateListEnriched,
  CreateCandidateData, 
  UpdateCandidateData 
} from '@/types/Candidate';
import { formatLastContact, type AdvancedSearchFields, type CandidateFilters, type FilterableCandidate, type SortOption } from '@/lib/candidateSearch';
import { buildSearchCandidatesRpcArgs, mapRpcRowToFilterable } from '@/lib/searchCandidatesRpc';

/**
 * Candidate Service
 * 
 * Handles all candidate-related database operations.
 * This is the ONLY place where database calls for candidates should exist.
 */

type CandidatesEnrichedRow = Database['public']['Views']['candidates_enriched']['Row'];
type CandidatesUpdate = Database['public']['Tables']['candidates']['Update'];

type PipelineCandidateJoinRow = {
  pipeline_id: string;
  stage: string;
  added_at: string;
  pipelines: { id: string; name: string } | null;
};

type PoolCandidateJoinRow = {
  talent_pool_id: string;
  added_at: string;
  talent_pools: { id: string; name: string } | null;
};

const mapEnrichedRowToList = (row: CandidatesEnrichedRow): CandidateListEnriched => {
  if (!row.id) {
    throw new Error('candidates_enriched row missing id');
  }
  const candidate = mapRowToCandidate({ ...row, id: row.id });
  const rawAssoc = row.pipeline_associations;
  const assocList = Array.isArray(rawAssoc) ? rawAssoc : [];
  const pipelineAssociations = assocList.map((p: { id: string; name: string; stage: string }) => ({
    id: p.id,
    name: p.name,
    stage: p.stage,
  }));
  const lastContactAt = row.last_contact_at ? new Date(row.last_contact_at) : null;
  const lastActivityAt = row.last_activity_at ? new Date(row.last_activity_at) : null;
  return {
    ...candidate,
    pipelineAssociations,
    lastContactAt,
    lastActivityAt,
  };
};

const mapRowToCandidate = (row: Database['public']['Tables']['candidates']['Row'] | CandidatesEnrichedRow): Candidate => ({
  id: row.id ?? '',
  firstName: row.first_name ?? undefined,
  lastName: row.last_name ?? undefined,
  email: row.email ?? undefined,
  phone: row.phone ?? undefined,
  company: row.company ?? undefined,
  title: row.title ?? undefined,
  location: row.location ?? undefined,
  source: row.source ?? undefined,
  tags: row.tags ?? [],
  linkedinUrl: row.linkedin_url ?? undefined,
  avatarUrl: row.avatar_url ?? undefined,
  createdAt: new Date(row.created_at ?? 0),
  updatedAt: new Date(row.updated_at ?? 0),
  createdBy: row.created_by ?? undefined,
});

export const candidateService = {
  /**
   * Get all candidates. Paginates past Supabase's 1000-row default limit.
   */
  getAll: async (): Promise<Candidate[]> => {
    const rows = await candidateService._fetchAllPaginated<Database['public']['Tables']['candidates']['Row']>(
      'candidates',
      '*'
    );
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
      pipelines: (pipelineRes.data || []).map((p: PipelineCandidateJoinRow) => ({
        pipelineId: p.pipeline_id,
        pipelineName: p.pipelines?.name || '',
        stage: stageNameMap.get(p.stage) || p.stage,
        addedAt: new Date(p.added_at),
      })),
      talentPools: (poolRes.data || []).map((p: PoolCandidateJoinRow) => ({
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
    const updateData: CandidatesUpdate = {};
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
    const updateData: CandidatesUpdate = {};
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
   * Find all duplicate pairs in the database (by email or phone).
   * Returns groups where multiple candidates share the same email or phone.
   */
  findAllDuplicates: async (): Promise<{ candidate: Candidate; duplicates: Candidate[]; matchType: 'email' | 'phone' }[]> => {
    const { data, error } = await supabase.rpc('get_candidate_duplicate_groups');
    if (error) throw error;
    const groups = (Array.isArray(data) ? data : []) as { matchType: 'email' | 'phone'; ids: string[] }[];
    if (groups.length === 0) return [];

    const allIds = [...new Set(groups.flatMap((g) => g.ids))];
    const byId = new Map((await candidateService.getCandidatesByIds(allIds)).map((c) => [c.id, c]));

    const results: { candidate: Candidate; duplicates: Candidate[]; matchType: 'email' | 'phone' }[] = [];
    for (const g of groups) {
      const primary = byId.get(g.ids[0]);
      if (!primary) continue;
      const duplicates = g.ids.slice(1).map((id) => byId.get(id)).filter(Boolean) as Candidate[];
      if (duplicates.length === 0) continue;
      results.push({ candidate: primary, duplicates, matchType: g.matchType });
    }
    return results;
  },

  /**
   * Fetch candidates by id (batches of 200). Used for duplicate resolution and bulk lookups.
   */
  getCandidatesByIds: async (ids: string[]): Promise<Candidate[]> => {
    if (ids.length === 0) return [];
    const BATCH = 200;
    const out: Candidate[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const { data, error } = await supabase.from('candidates').select('*').in('id', batch);
      if (error) throw error;
      out.push(...(data || []).map(mapRowToCandidate));
    }
    return out;
  },

  /**
   * Enriched rows from candidates_enriched for a bounded set of ids (no full-table fetch).
   */
  getEnrichedByIds: async (ids: string[]): Promise<CandidateListEnriched[]> => {
    if (ids.length === 0) return [];
    const BATCH = 200;
    const all: CandidatesEnrichedRow[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const { data, error } = await supabase.from('candidates_enriched').select('*').in('id', batch);
      if (error) throw error;
      all.push(...((data ?? []) as CandidatesEnrichedRow[]));
    }
    return all.map(mapEnrichedRowToList);
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
   * Get count of candidates in active pipelines
   */
  getInPipelinesCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('pipeline_candidates')
      .select('candidate_id', { count: 'exact', head: true });

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
    ascending = false
  ): Promise<T[]> {
    const PAGE_SIZE = 1000;
    const all: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const query = supabase.from(table).select(select).order(orderBy, { ascending });
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
   * Search and filter candidates with pagination (Postgres RPC on candidates_enriched).
   */
  searchPaginated: async (params: {
    searchQuery?: string;
    advancedFields?: AdvancedSearchFields;
    filters?: CandidateFilters;
    sortOption?: SortOption;
    excludeIds?: string[];
    limit?: number;
    offset?: number;
    scopeCandidateIds?: string[];
  }): Promise<{ data: FilterableCandidate[]; total: number; nextOffset: number; allFiltered?: FilterableCandidate[] }> => {
    const { limit = 50, offset = 0 } = params;

    type SearchArgs = Database['public']['Functions']['search_candidates_enriched']['Args'];
    const rpcArgs = buildSearchCandidatesRpcArgs(params) as unknown as SearchArgs;
    const { data, error } = await supabase.rpc('search_candidates_enriched', rpcArgs);

    if (error) throw error;

    const payload = data as {
      total: number;
      rows: Record<string, unknown>[];
      all_rows: Record<string, unknown>[] | null;
    };

    const rows = payload?.rows ?? [];
    const mapped = rows.map((r) => mapRpcRowToFilterable(r));

    let allFiltered: FilterableCandidate[] | undefined;
    if (offset === 0 && payload?.all_rows != null && Array.isArray(payload.all_rows)) {
      allFiltered = payload.all_rows.map((r) => mapRpcRowToFilterable(r));
    }

    return {
      data: mapped,
      total: Number(payload?.total ?? 0),
      nextOffset: offset + limit,
      allFiltered,
    };
  },

  /**
   * Get all candidates with pipeline associations (stage names) and last contact date.
   * Uses candidates_enriched view - single query, server-side join.
   * Paginates past Supabase's 1000-row default limit.
   */
  getListWithEnrichment: async (): Promise<CandidateListEnriched[]> => {
    const PAGE_SIZE = 5000; // Larger pages = fewer round trips (25k candidates: 5 requests vs 25)
    const all: CandidatesEnrichedRow[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('candidates_enriched')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      const rows = (data ?? []) as CandidatesEnrichedRow[];
      all.push(...rows);
      hasMore = rows.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    return all.map(mapEnrichedRowToList);
  },
};
