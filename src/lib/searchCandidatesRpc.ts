import {
  formatLastContact,
  getDateAddedBoundary,
  getLastContactBoundary,
  type AdvancedSearchFields,
  type CandidateFilters,
  type FilterableCandidate,
  type SortOption,
} from '@/lib/candidateSearch';
import { hasBooleanSyntax } from '@/utils/booleanSearchParser';

const ALL_FILTERED_CAP = 500;

/** Build RPC args for public.search_candidates_enriched (Supabase). */
export function buildSearchCandidatesRpcArgs(params: {
  searchQuery?: string;
  advancedFields?: AdvancedSearchFields;
  filters?: CandidateFilters;
  sortOption?: SortOption;
  excludeIds?: string[];
  limit?: number;
  offset?: number;
  scopeCandidateIds?: string[];
}): Record<string, unknown> {
  const {
    searchQuery = '',
    advancedFields,
    filters,
    sortOption = 'recently_added',
    excludeIds = [],
    limit = 50,
    offset = 0,
    scopeCandidateIds,
  } = params;

  const adv = advancedFields;
  const f = filters;

  let p_filter_date_added_from: Date | null = null;
  let p_filter_date_added_to: Date | null = null;
  if (f?.dateAdded === 'custom') {
    if (f.dateAddedCustomFrom) {
      const d = new Date(f.dateAddedCustomFrom);
      d.setHours(0, 0, 0, 0);
      p_filter_date_added_from = d;
    }
    if (f.dateAddedCustomTo) {
      const d = new Date(f.dateAddedCustomTo);
      d.setHours(23, 59, 59, 999);
      p_filter_date_added_to = d;
    }
  } else if (f?.dateAdded) {
    p_filter_date_added_from = getDateAddedBoundary(f.dateAdded);
  }

  let p_filter_last_contact_never: boolean | null = null;
  let p_filter_last_contact_from: Date | null = null;
  let p_filter_last_contact_to: Date | null = null;
  if (f?.lastContact === 'custom') {
    if (f.lastContactCustomFrom) {
      const d = new Date(f.lastContactCustomFrom);
      d.setHours(0, 0, 0, 0);
      p_filter_last_contact_from = d;
    }
    if (f.lastContactCustomTo) {
      const d = new Date(f.lastContactCustomTo);
      d.setHours(23, 59, 59, 999);
      p_filter_last_contact_to = d;
    }
  } else if (f?.lastContact) {
    const b = getLastContactBoundary(f.lastContact);
    if (b?.never) p_filter_last_contact_never = true;
    else if (b?.from) p_filter_last_contact_from = b.from;
  }

  const sq = searchQuery.trim();
  const useWebsearch = hasBooleanSyntax(sq);

  return {
    p_search: sq || null,
    p_use_websearch: useWebsearch,
    p_exclude_ids: excludeIds.length ? excludeIds : null,
    p_adv_name: adv?.name?.trim() || null,
    p_adv_email: adv?.email?.trim() || null,
    p_adv_phone: adv?.phone?.trim() || null,
    p_adv_company: adv?.company?.trim() || null,
    p_adv_title: adv?.title?.trim() || null,
    p_adv_location: adv?.location?.trim() || null,
    p_adv_skills: adv?.skills?.length ? adv.skills : null,
    p_adv_date_added_from: adv?.dateAddedFrom ?? null,
    p_adv_date_added_to: adv?.dateAddedTo ?? null,
    p_adv_last_contact_from: adv?.lastContactedFrom ?? null,
    p_adv_last_contact_to: adv?.lastContactedTo ?? null,
    p_filter_skills: f?.skills?.length ? f.skills : null,
    p_filter_locations: f?.locations?.length ? f.locations : null,
    p_filter_sources: f?.sources?.length ? f.sources : null,
    p_filter_companies: f?.companies?.length ? f.companies : null,
    p_filter_pipelines: f?.pipelines?.length ? f.pipelines : null,
    p_filter_pipeline_stages: f?.pipelineStages?.length ? f.pipelineStages : null,
    p_filter_talent_pool_names: f?.talentPools?.length ? f.talentPools : null,
    p_filter_experience_levels: f?.experienceLevels?.length ? f.experienceLevels : null,
    p_filter_date_added_from: p_filter_date_added_from,
    p_filter_date_added_to: p_filter_date_added_to,
    p_filter_last_contact_never: p_filter_last_contact_never,
    p_filter_last_contact_from: p_filter_last_contact_from,
    p_filter_last_contact_to: p_filter_last_contact_to,
    p_scope_candidate_ids: scopeCandidateIds?.length ? scopeCandidateIds : null,
    p_sort: sortOption,
    p_limit: limit,
    p_offset: offset,
    p_include_all_if_under: ALL_FILTERED_CAP,
  };
}

export function mapRpcRowToFilterable(row: Record<string, unknown>): FilterableCandidate {
  const r = row as {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    location?: string;
    tags?: string[];
    source?: string;
    linkedin_url?: string;
    created_at: string;
    updated_at: string;
    pipeline_associations?: { id: string; name: string; stage: string }[];
    last_contact_at?: string | null;
    last_activity_at?: string | null;
  };
  const pipelineAssociations = (r.pipeline_associations || []).map((p) => ({
    id: p.id,
    name: p.name,
    stage: p.stage,
  }));
  const lastContactAt = r.last_contact_at ? new Date(r.last_contact_at) : null;
  const lastActivityAt = r.last_activity_at ? new Date(r.last_activity_at) : null;
  const createdAt = new Date(r.created_at);
  const updatedAt = new Date(r.updated_at);
  const firstName = r.first_name || '';
  const lastName = r.last_name || '';
  const skills = r.tags || [];
  const _searchStr = [firstName, lastName, r.email, r.phone, r.company, r.title, r.location, ...skills]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return {
    id: r.id,
    firstName,
    lastName,
    email: r.email || '',
    phone: r.phone || '',
    title: r.title || '',
    company: r.company || '',
    location: r.location || '',
    skills,
    pipelineAssociations,
    source: r.source || '',
    linkedinUrl: r.linkedin_url || '',
    lastContact: formatLastContact(lastContactAt),
    lastContactAt,
    lastActivityAt,
    createdAt,
    updatedAt,
    _searchStr,
  };
}

export { ALL_FILTERED_CAP };
