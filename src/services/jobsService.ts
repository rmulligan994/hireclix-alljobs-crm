import { supabase } from '@/integrations/supabase/client';
import type { StandardJob } from '@/config/webflowJobMapping';

export interface JobsResponse {
  jobs: StandardJob[];
}

/** App route segments - when first path segment is one of these, we're at origin (no base path). */
const APP_ROUTE_SEGMENTS = new Set([
  'talent', 'talent-pools', 'pipelines', 'campaigns', 'analytics', 'integrations', 'settings',
  'candidates', 'dashboard', 'jobs', 'reports',
]);

/** Base URL for API routes (origin + basePath). Works with base path deployments (e.g. /crm). */
function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  let base = process.env.NEXT_PUBLIC_BASE_URL || '';
  if (!base && typeof window !== 'undefined') {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const first = segments[0];
    if (first && !APP_ROUTE_SEGMENTS.has(first) && first !== 'api') {
      base = `/${first}`;
    }
  }
  return `${window.location.origin}${base.startsWith('/') ? base : base ? `/${base}` : ''}`;
}

export async function fetchJobs(): Promise<StandardJob[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('You must be signed in to view jobs.');
  }

  const baseUrl = getApiBase() || window.location.origin;
  const url = `${baseUrl}/api/jobs`;
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

  const data = (await res.json()) as JobsResponse;
  return data.jobs;
}
