import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';
import { fetchWebflowLiveItemsAll } from '@/lib/webflow';
import {
  mapWebflowItemToStandardJob,
  type WebflowFieldMapping,
} from '@/config/webflowJobMapping';

/** Protects cron route - set CRON_SECRET in env */
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace('Bearer ', '');
    const isValidCron =
      CRON_SECRET && (bearerToken === CRON_SECRET || request.headers.get('x-cron-secret') === CRON_SECRET);

    if (!isValidCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server not configured', missing: [!supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL', !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean) },
        { status: 500 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let logId: string | null = null;

  try {
    const { data: logRow, error: logInsertError } = await supabase
      .from('jobs_sync_logs')
      .insert({ status: 'running' })
      .select('id')
      .single();

    if (logInsertError) {
      console.error('Failed to create sync log:', logInsertError);
    } else {
      logId = logRow?.id ?? null;
    }

    const { data: orgSettings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('webflow_collection_id, webflow_api_token, webflow_job_field_mapping, career_site_base_url')
      .limit(1)
      .single();

    if (settingsError || !orgSettings) {
      try { await updateLog(supabase, logId, 'failed', 0, 0, 'Organization settings not found'); } catch { /* ignore */ }
      return NextResponse.json({ error: 'Organization settings not found', hint: settingsError?.message }, { status: 404 });
    }

    const collectionId = orgSettings.webflow_collection_id;
    const apiToken = orgSettings.webflow_api_token;

    if (!collectionId || !apiToken) {
      try { await updateLog(supabase, logId, 'failed', 0, 0, 'Career site not configured'); } catch { /* ignore */ }
      return NextResponse.json(
        { error: 'Career site not configured', skipped: true },
        { status: 200 }
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
    try {
      await updateLog(supabase, logId, 'failed', 0, 0, message, detail);
    } catch (logErr) {
      console.error('Failed to update sync log:', logErr);
    }
    return NextResponse.json(
      { error: 'Sync failed', detail: message },
      { status: 500 }
    );
  }
  } catch (outerErr) {
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    return NextResponse.json(
      { error: 'Unexpected error', detail: msg },
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
