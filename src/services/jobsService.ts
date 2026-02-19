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

/**
 * Fetches jobs from Supabase (synced table). Used when sync is enabled.
 */
export async function fetchJobsFromSupabase(
  page = 1
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

  const { data: rows, error, count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .order('last_updated', { ascending: false, nullsFirst: false })
    .range(from, to);

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

import { getApiBase } from '@/lib/api';

/**
 * Fetches jobs from live API (Webflow). Used when sync is disabled or as fallback.
 */
export async function fetchJobsFromApi(page = 1): Promise<JobsResponse> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('You must be signed in to view jobs.');
  }

  const baseUrl = getApiBase() || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = `${baseUrl}/api/jobs?page=${page}&limit=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.detail ?? body.error ?? res.statusText;
    if (res.status === 400 && body.hint) {
      throw new Error(`${body.error}: ${body.hint}`);
    }
    throw new Error(msg || `Failed to fetch jobs (${res.status})`);
  }

  return (await res.json()) as JobsResponse;
}

/**
 * Fetches jobs. Uses Supabase (synced) by default; falls back to API if Supabase fails.
 */
export async function fetchJobs(page = 1): Promise<JobsResponse> {
  try {
    return await fetchJobsFromSupabase(page);
  } catch {
    return fetchJobsFromApi(page);
  }
}
