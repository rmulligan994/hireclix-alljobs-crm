import { supabase } from '@/integrations/supabase/client';
import type { StandardJob } from '@/config/webflowJobMapping';

export interface JobsResponse {
  jobs: StandardJob[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_SIZE = 500;

/** Row from Supabase jobs table */
interface JobRow {
  id: string;
  webflow_item_id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string | null;
  description: string | null;
  url: string | null;
  slug: string | null;
  req_id: string | null;
  view_url: string | null;
  posted_date: string | null;
  last_updated: string | null;
}

function rowToStandardJob(row: JobRow): StandardJob {
  return {
    id: row.webflow_item_id,
    title: row.title,
    department: row.department,
    location: row.location,
    type: row.type,
    description: row.description,
    url: row.url,
    postedDate: row.posted_date,
    reqId: row.req_id,
    slug: row.slug,
    lastUpdated: row.last_updated,
    viewUrl: row.view_url,
  };
}

/** Escape LIKE special chars for safe ilike pattern */
function escapeLike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Fetches jobs from Supabase (synced table). Used when sync is enabled.
 * When search is provided, searches across all jobs (title, req_id) in DB.
 */
export async function fetchJobsFromSupabase(
  page = 1,
  search?: string
): Promise<JobsResponse> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('You must be signed in to view jobs.');
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .order('last_updated', { ascending: false, nullsFirst: false });

  if (search && search.trim()) {
    const q = escapeLike(search.trim());
    const pattern = `%${q}%`;
    query = query.or(`title.ilike.${pattern},req_id.ilike.${pattern}`);
  }

  const { data: rows, error, count } = await query.range(from, to);

  if (error) throw error;

  const total = count ?? 0;
  const jobs = (rows ?? []).map((r) => rowToStandardJob(r as JobRow));

  return {
    jobs,
    pagination: {
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    },
  };
}

/**
 * Fetches jobs from Supabase (synced table). Jobs are synced from the career site every 15 minutes.
 */
export async function fetchJobs(page = 1, search?: string): Promise<JobsResponse> {
  return fetchJobsFromSupabase(page, search);
}

/** Job with UUID for campaign job_id FK */
export interface CampaignJobOption {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
}

/**
 * Fetches jobs for campaign job selector (returns UUID for FK).
 */
export async function fetchJobsForCampaign(search?: string): Promise<CampaignJobOption[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('You must be signed in to view jobs.');
  }

  let query = supabase
    .from('jobs')
    .select('id, title, department, location')
    .order('last_updated', { ascending: false });

  if (search && search.trim()) {
    const q = escapeLike(search.trim());
    const pattern = `%${q}%`;
    query = query.or(`title.ilike.${pattern},req_id.ilike.${pattern}`);
  }

  const { data, error } = await query.limit(50);

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    department: r.department,
    location: r.location,
  }));
}

/** Job details for merge panel (actual values to copy) */
export interface JobForMergePanel {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string | null;
  description: string | null;
  url: string | null;
  view_url: string | null;
}

export async function fetchJobById(jobId: string): Promise<JobForMergePanel | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) return null;

  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, department, location, type, description, url, view_url')
    .eq('id', jobId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title ?? '',
    department: data.department,
    location: data.location,
    type: data.type,
    description: data.description,
    url: data.url,
    view_url: data.view_url,
  };
}
