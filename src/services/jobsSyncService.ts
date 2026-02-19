import { supabase } from '@/integrations/supabase/client';
import { getApiBase } from '@/lib/api';

export interface SyncLog {
  id: string;
  status: 'running' | 'success' | 'failed';
  started_at: string;
  completed_at: string | null;
  jobs_fetched: number;
  jobs_upserted: number;
  error_message: string | null;
  error_detail: string | null;
}

export async function fetchSyncLogs(limit = 10): Promise<SyncLog[]> {
  const { data, error } = await supabase
    .from('jobs_sync_logs')
    .select('id, status, started_at, completed_at, jobs_fetched, jobs_upserted, error_message, error_detail')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SyncLog[];
}

export async function triggerSync(): Promise<{
  success: boolean;
  jobsFetched?: number;
  jobsUpserted?: number;
  error?: string;
}> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('You must be signed in to sync jobs.');
  }

  const baseUrl = getApiBase() || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = `${baseUrl}/api/jobs/sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.detail ?? body.error ?? 'Sync failed');
  }
  return body;
}
