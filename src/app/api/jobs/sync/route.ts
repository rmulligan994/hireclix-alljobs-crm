import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';
import { fetchWebflowLiveItemsAll } from '@/lib/webflow';
import {
  mapWebflowItemToStandardJob,
  type WebflowFieldMapping,
} from '@/config/webflowJobMapping';

/**
 * Manual sync trigger - requires authenticated user.
 * Same logic as cron; use for "Sync now" button.
 */
export async function POST(request: Request) {
  const token =
    request.headers.get('Authorization')?.replace('Bearer ', '') ??
    new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const authClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let logId: string | null = null;

  try {
    const { data: logRow } = await supabase
      .from('jobs_sync_logs')
      .insert({ status: 'running' })
      .select('id')
      .single();
    logId = logRow?.id ?? null;

    const { data: orgSettings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('webflow_collection_id, webflow_api_token, webflow_job_field_mapping, career_site_base_url')
      .limit(1)
      .single();

    if (settingsError || !orgSettings) {
      await updateLog(supabase, logId, 'failed', 0, 0, 'Organization settings not found');
      return NextResponse.json({ error: 'Organization settings not found' }, { status: 404 });
    }

    const collectionId = orgSettings.webflow_collection_id;
    const apiToken = orgSettings.webflow_api_token;

    if (!collectionId || !apiToken) {
      await updateLog(supabase, logId, 'failed', 0, 0, 'Career site not configured');
      return NextResponse.json(
        { error: 'Career site not configured', hint: 'Configure in Settings → Career Site' },
        { status: 400 }
      );
    }

    const items = await fetchWebflowLiveItemsAll(collectionId, apiToken, {
      sortBy: 'lastPublished',
      sortOrder: 'desc',
    });

    const mapping = orgSettings.webflow_job_field_mapping as
      | WebflowFieldMapping
      | null
      | undefined;

    let baseUrl = (orgSettings.career_site_base_url ?? '').trim().replace(/\/+$/, '');
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `https://${baseUrl}`;
    }

    const jobs = items.map((item) => {
      const job = mapWebflowItemToStandardJob(item, mapping);
      return {
        webflow_item_id: item.id,
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        description: job.description,
        url: job.url,
        slug: job.slug,
        req_id: job.reqId,
        view_url: baseUrl && job.slug ? `${baseUrl}/${job.slug}` : null,
        posted_date: job.postedDate ? new Date(job.postedDate).toISOString() : null,
        last_updated: job.lastUpdated ? new Date(job.lastUpdated).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
    });

    let upserted = 0;
    const BATCH = 100;
    for (let i = 0; i < jobs.length; i += BATCH) {
      const batch = jobs.slice(i, i + BATCH);
      const { error: upsertError } = await supabase.from('jobs').upsert(batch, {
        onConflict: 'webflow_item_id',
        ignoreDuplicates: false,
      });
      if (upsertError) throw upsertError;
      upserted += batch.length;
    }

    await updateLog(supabase, logId, 'success', items.length, upserted);

    return NextResponse.json({
      success: true,
      jobsFetched: items.length,
      jobsUpserted: upserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const detail = err instanceof Error ? err.stack : undefined;
    console.error('Jobs sync failed:', err);
    await updateLog(supabase, logId, 'failed', 0, 0, message, detail);
    return NextResponse.json(
      { error: 'Sync failed', detail: message },
      { status: 500 }
    );
  }
}

async function updateLog(
  supabase: ReturnType<typeof createClient>,
  logId: string | null,
  status: 'success' | 'failed',
  jobsFetched: number,
  jobsUpserted: number,
  errorMessage?: string,
  errorDetail?: string
) {
  if (!logId) return;
  await supabase
    .from('jobs_sync_logs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      jobs_fetched: jobsFetched,
      jobs_upserted: jobsUpserted,
      error_message: errorMessage ?? null,
      error_detail: errorDetail ?? null,
    })
    .eq('id', logId);
}
