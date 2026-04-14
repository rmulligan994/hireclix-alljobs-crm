import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { candidateService } from './candidateService';

/**
 * Escape `%` and `_` for Postgres ILIKE patterns (fallback path).
 */
function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export type GlobalSearchCandidateHit = {
  id: string;
  label: string;
  subtitle?: string;
};

export type GlobalSearchNamedHit = {
  id: string;
  label: string;
};

export interface GlobalSearchResults {
  candidates: GlobalSearchCandidateHit[];
  pipelines: GlobalSearchNamedHit[];
  campaigns: GlobalSearchNamedHit[];
}

const EMPTY: GlobalSearchResults = {
  candidates: [],
  pipelines: [],
  campaigns: [],
};

/** Min chars before suggestions run */
const SUGGESTION_MIN_CHARS = 2;

/** Prefer pipelines/campaigns: more top slots than candidates */
const CANDIDATE_LIMIT = 4;
const PIPELINE_LIMIT = 6;
const CAMPAIGN_LIMIT = 6;

type FuzzyRpcRow = { id: string; name: string };

function isFuzzyRow(v: unknown): v is FuzzyRpcRow {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string';
}

function parseFuzzyRpcPayload(raw: Json): { pipelines: GlobalSearchNamedHit[]; campaigns: GlobalSearchNamedHit[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { pipelines: [], campaigns: [] };
  }
  const o = raw as Record<string, unknown>;
  const pipelinesRaw = o.pipelines;
  const campaignsRaw = o.campaigns;

  const mapRows = (arr: unknown): GlobalSearchNamedHit[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(isFuzzyRow).map((r) => ({ id: r.id, label: r.name }));
  };

  return {
    pipelines: mapRows(pipelinesRaw),
    campaigns: mapRows(campaignsRaw),
  };
}

async function rpcPipelinesCampaignsFuzzy(q: string): Promise<{
  pipelines: GlobalSearchNamedHit[];
  campaigns: GlobalSearchNamedHit[];
}> {
  const { data, error } = await supabase.rpc('search_pipelines_campaigns_fuzzy', {
    p_query: q,
    p_pipeline_limit: PIPELINE_LIMIT,
    p_campaign_limit: CAMPAIGN_LIMIT,
  });

  if (error) throw error;
  return parseFuzzyRpcPayload(data as Json);
}

/** Fallback when RPC is unavailable (migration not applied). */
async function fallbackIlikePipelinesCampaigns(q: string): Promise<{
  pipelines: GlobalSearchNamedHit[];
  campaigns: GlobalSearchNamedHit[];
}> {
  const pattern = `%${escapeIlikePattern(q)}%`;

  const [pipelineRes, campaignRes] = await Promise.all([
    supabase
      .from('pipelines')
      .select('id, name')
      .ilike('name', pattern)
      .order('updated_at', { ascending: false })
      .limit(PIPELINE_LIMIT),
    supabase
      .from('campaigns')
      .select('id, name')
      .ilike('name', pattern)
      .order('updated_at', { ascending: false })
      .limit(CAMPAIGN_LIMIT),
  ]);

  if (pipelineRes.error) throw pipelineRes.error;
  if (campaignRes.error) throw campaignRes.error;

  return {
    pipelines: (pipelineRes.data ?? []).map((r: { id: string; name: string }) => ({
      id: r.id,
      label: r.name,
    })),
    campaigns: (campaignRes.data ?? []).map((r: { id: string; name: string }) => ({
      id: r.id,
      label: r.name,
    })),
  };
}

/**
 * Parallel search: candidates (FTS RPC), pipelines + campaigns (pg_trgm fuzzy RPC).
 * RLS applies per table. Pipelines/campaigns get higher caps and UI order preference in TopBar.
 */
export async function searchGlobalSuggestions(query: string): Promise<GlobalSearchResults> {
  const q = query.trim();
  if (q.length < SUGGESTION_MIN_CHARS) return EMPTY;

  const [candidateResult, entityResult] = await Promise.all([
    candidateService
      .searchPaginated({ searchQuery: q, limit: CANDIDATE_LIMIT, offset: 0 })
      .then((r) => ({ ok: true as const, data: r.data }))
      .catch(() => ({ ok: false as const, data: [] })),
    rpcPipelinesCampaignsFuzzy(q).catch(() => fallbackIlikePipelinesCampaigns(q)),
  ]);

  const candidates = (candidateResult.ok ? candidateResult.data : []).map((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
    const label = name || c.email || 'Candidate';
    const subtitle = [c.title, c.company].filter(Boolean).join(' · ') || c.email || undefined;
    return { id: c.id, label, subtitle };
  });

  return {
    candidates,
    pipelines: entityResult.pipelines,
    campaigns: entityResult.campaigns,
  };
}

export { SUGGESTION_MIN_CHARS };
