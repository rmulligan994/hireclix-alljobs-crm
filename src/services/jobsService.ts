import { supabase } from '@/integrations/supabase/client';
import type { StandardJob } from '@/config/webflowJobMapping';

export interface JobsResponse {
  jobs: StandardJob[];
}

export async function fetchJobs(): Promise<StandardJob[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('You must be signed in to view jobs.');
  }

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || '';
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
