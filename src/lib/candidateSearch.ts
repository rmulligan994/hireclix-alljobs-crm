/**
 * Candidate search and filter logic - single source of truth.
 * Pure functions for filtering, sorting, and date/contact boundaries.
 * Used by candidateService.searchPaginated (server RPC) semantics reference; pool/pipeline UIs use scoped search.
 */

import { parseBooleanSearch } from '@/utils/booleanSearchParser';
import type { SearchableCandidate } from '@/utils/booleanSearchParser';

// Re-export for consumers that need SearchableCandidate
export type { SearchableCandidate } from '@/utils/booleanSearchParser';

export type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'recently_added'
  | 'oldest_first'
  | 'last_contacted_recent'
  | 'last_contacted_oldest'
  | 'last_updated';

export interface CandidateFilters {
  skills: string[];
  locations: string[];
  pipelines: string[];
  pipelineStages: string[];
  talentPools: string[];
  sources: string[];
  companies: string[];
  experienceLevels: string[];
  dateAdded: string | null;
  lastContact: string | null;
  /** When dateAdded === 'custom' */
  dateAddedCustomFrom?: Date | null;
  dateAddedCustomTo?: Date | null;
  /** When lastContact === 'custom' */
  lastContactCustomFrom?: Date | null;
  lastContactCustomTo?: Date | null;
}

export interface AdvancedSearchFields {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  skills: string[];
  location: string;
  dateAddedFrom?: Date;
  dateAddedTo?: Date;
  lastContactedFrom?: Date;
  lastContactedTo?: Date;
}

export interface FilterableCandidate extends SearchableCandidate {
  id: string;
  pipelineAssociations: { id: string; name: string; stage: string }[];
  source: string;
  linkedinUrl: string;
  lastContact: string;
  lastContactAt: Date | null;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _searchStr: string;
}

/**
 * Format last contact date for display (used when building FilterableCandidate)
 */
export function formatLastContact(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Infer experience level from job title (AI-deduced, not 100% accurate)
 */
export function inferExperienceLevels(title: string): string[] {
  if (!title || !title.trim()) return [];
  const t = title.toLowerCase();
  const levels: string[] = [];
  if (/\b(executive|ceo|cto|cfo|coo|vp|vice president|director|head of)\b/.test(t)) levels.push('executive');
  if (/\b(lead|principal|architect)\b/.test(t)) levels.push('lead');
  if (/\b(senior|sr\.?|staff)\b/.test(t)) levels.push('senior');
  if (/\b(mid|middle|engineer|developer|analyst)\b/.test(t) && !/\b(senior|lead|principal)\b/.test(t)) levels.push('mid');
  if (/\b(junior|jr\.?|entry|intern|graduate)\b/.test(t)) levels.push('entry');
  return levels;
}

/**
 * Get start-of-day boundary for date-added presets
 */
export function getDateAddedBoundary(preset: string): Date | null {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === 'today') return start;
  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return start;
  }
  if (preset === 'this_month') {
    start.setDate(1);
    return start;
  }
  if (preset === 'last_3_months') {
    start.setMonth(now.getMonth() - 3);
    return start;
  }
  return null;
}

/**
 * Get boundary for last-contact presets
 */
export function getLastContactBoundary(preset: string): { from?: Date; never?: boolean } | null {
  if (preset === 'never') return { never: true };
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === 'today') return { from: start };
  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return { from: start };
  }
  if (preset === 'this_month') {
    start.setDate(1);
    return { from: start };
  }
  return null;
}

/**
 * Apply advanced search fields (name, email, phone, etc.)
 */
export function applyAdvanced(
  candidates: FilterableCandidate[],
  advancedFields: AdvancedSearchFields
): FilterableCandidate[] {
  let results = [...candidates];
  if (advancedFields.name) {
    const nameQuery = advancedFields.name.toLowerCase();
    results = results.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(nameQuery)
    );
  }
  if (advancedFields.email) {
    const emailQuery = advancedFields.email.toLowerCase();
    results = results.filter(c =>
      (c.email || '').toLowerCase().includes(emailQuery)
    );
  }
  if (advancedFields.phone) {
    const phoneQuery = advancedFields.phone.replace(/\D/g, '');
    results = results.filter(c =>
      (c.phone || '').replace(/\D/g, '').includes(phoneQuery)
    );
  }
  if (advancedFields.company) {
    const companyQuery = advancedFields.company.toLowerCase();
    results = results.filter(c =>
      (c.company || '').toLowerCase().includes(companyQuery)
    );
  }
  if (advancedFields.title) {
    const titleQuery = advancedFields.title.toLowerCase();
    results = results.filter(c =>
      (c.title || '').toLowerCase().includes(titleQuery)
    );
  }
  if (advancedFields.location) {
    const locationQuery = advancedFields.location.toLowerCase();
    results = results.filter(c =>
      (c.location || '').toLowerCase().includes(locationQuery)
    );
  }
  if (advancedFields.skills.length > 0) {
    results = results.filter(c =>
      advancedFields.skills.every(skill =>
        c.skills.some(s => s.toLowerCase() === skill.toLowerCase())
      )
    );
  }
  if (advancedFields.dateAddedFrom) {
    const from = new Date(advancedFields.dateAddedFrom);
    from.setHours(0, 0, 0, 0);
    results = results.filter(c => c.createdAt >= from);
  }
  if (advancedFields.dateAddedTo) {
    const to = new Date(advancedFields.dateAddedTo);
    to.setHours(23, 59, 59, 999);
    results = results.filter(c => c.createdAt <= to);
  }
  if (advancedFields.lastContactedFrom) {
    const from = new Date(advancedFields.lastContactedFrom);
    results = results.filter(c =>
      c.lastContactAt ? new Date(c.lastContactAt) >= from : false
    );
  }
  if (advancedFields.lastContactedTo) {
    const to = new Date(advancedFields.lastContactedTo);
    to.setHours(23, 59, 59, 999);
    results = results.filter(c =>
      c.lastContactAt ? new Date(c.lastContactAt) <= to : false
    );
  }
  return results;
}

/**
 * Apply search query (boolean syntax or simple substring).
 * For FilterableCandidate with _searchStr.
 */
export function applySearch(
  candidates: FilterableCandidate[],
  query: string
): FilterableCandidate[] {
  if (!query.trim()) return candidates;
  const matcher = parseBooleanSearch(query.trim());
  if (matcher) {
    return candidates.filter(c => matcher(c));
  }
  const q = query.toLowerCase();
  return candidates.filter(c => c._searchStr.includes(q));
}

/**
 * Apply search with custom toSearchable mapper for non-FilterableCandidate shapes.
 * Used by TalentPoolDetail and PipelineDetail for pool/pipeline candidate lists.
 */
export function applySearchWithMapper<T>(
  candidates: T[],
  query: string,
  toSearchable: (c: T) => SearchableCandidate
): T[] {
  if (!query.trim()) return candidates;
  const matcher = parseBooleanSearch(query.trim());
  if (matcher) {
    return candidates.filter(c => matcher(toSearchable(c)));
  }
  const q = query.toLowerCase();
  return candidates.filter(c => {
    const s = toSearchable(c);
    const searchStr = [
      s.firstName,
      s.lastName,
      s.email,
      s.phone,
      s.company,
      s.title,
      s.location,
      ...(s.skills || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchStr.includes(q);
  });
}

/**
 * Apply filter panel selections (skills, locations, pipelines, etc.)
 */
export function applyFilters(
  candidates: FilterableCandidate[],
  filters: CandidateFilters
): FilterableCandidate[] {
  let results = [...candidates];
  if (filters.skills.length > 0) {
    results = results.filter(c =>
      filters.skills.some(skill => c.skills.includes(skill))
    );
  }
  if (filters.locations.length > 0) {
    results = results.filter(c =>
      filters.locations.includes(c.location || '')
    );
  }
  if (filters.pipelines.length > 0) {
    if (filters.pipelines.includes('none')) {
      results = results.filter(c => c.pipelineAssociations.length === 0);
    } else {
      results = results.filter(c =>
        c.pipelineAssociations.some(p => filters.pipelines.includes(p.name))
      );
    }
  }
  if (filters.pipelineStages.length > 0) {
    results = results.filter(c =>
      c.pipelineAssociations.some(p => filters.pipelineStages.includes(p.stage))
    );
  }
  if (filters.sources.length > 0) {
    results = results.filter(c =>
      filters.sources.includes(c.source || '')
    );
  }
  if (filters.companies.length > 0) {
    results = results.filter(c =>
      filters.companies.includes(c.company || '')
    );
  }
  if (filters.experienceLevels.length > 0) {
    results = results.filter(c => {
      const levels = inferExperienceLevels(c.title);
      return filters.experienceLevels.some(l => levels.includes(l));
    });
  }
  if (filters.dateAdded === 'custom') {
    if (filters.dateAddedCustomFrom) {
      const from = new Date(filters.dateAddedCustomFrom);
      from.setHours(0, 0, 0, 0);
      results = results.filter(c => c.createdAt >= from);
    }
    if (filters.dateAddedCustomTo) {
      const to = new Date(filters.dateAddedCustomTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(c => c.createdAt <= to);
    }
  } else if (filters.dateAdded) {
    const from = getDateAddedBoundary(filters.dateAdded);
    if (from) {
      results = results.filter(c => c.createdAt >= from);
    }
  }
  if (filters.lastContact === 'custom') {
    if (filters.lastContactCustomFrom) {
      const from = new Date(filters.lastContactCustomFrom);
      results = results.filter(c =>
        c.lastContactAt ? new Date(c.lastContactAt) >= from : false
      );
    }
    if (filters.lastContactCustomTo) {
      const to = new Date(filters.lastContactCustomTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(c =>
        c.lastContactAt ? new Date(c.lastContactAt) <= to : false
      );
    }
  } else if (filters.lastContact) {
    const boundary = getLastContactBoundary(filters.lastContact);
    if (boundary?.never) {
      results = results.filter(c => !c.lastContactAt);
    } else if (boundary?.from) {
      results = results.filter(c =>
        c.lastContactAt ? new Date(c.lastContactAt) >= boundary.from! : false
      );
    }
  }
  return results;
}

/**
 * Apply sort option
 */
export function applySort(
  candidates: FilterableCandidate[],
  sortOption: string
): FilterableCandidate[] {
  const arr = [...candidates];
  switch (sortOption) {
    case 'name_asc':
      arr.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      break;
    case 'name_desc':
      arr.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
      break;
    case 'recently_added':
      arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case 'oldest_first':
      arr.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'last_contacted_recent':
      arr.sort((a, b) => {
        const aTime = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
        const bTime = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
        return bTime - aTime;
      });
      break;
    case 'last_contacted_oldest':
      arr.sort((a, b) => {
        const aTime = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
        const bTime = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
        return aTime - bTime;
      });
      break;
    case 'last_updated':
      arr.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      break;
    default:
      break;
  }
  return arr;
}
