import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';
import { fetchWebflowLiveItems } from '@/lib/webflow';
import {
  mapWebflowItemToStandardJob,
  type WebflowFieldMapping,
} from '@/config/webflowJobMapping';

export async function GET(request: Request) {
  const token =
    request.headers.get('Authorization')?.replace('Bearer ', '') ??
    new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const authClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: orgSettings, error: settingsError } = await supabase
    .from('organization_settings')
    .select('webflow_collection_id, webflow_api_token, webflow_job_field_mapping, career_site_base_url')
    .limit(1)
    .single();

  if (settingsError || !orgSettings) {
    return NextResponse.json(
      { error: 'Organization settings not found' },
      { status: 404 }
    );
  }

  const collectionId = orgSettings.webflow_collection_id;
  const apiToken = orgSettings.webflow_api_token;

  if (!collectionId || !apiToken) {
    return NextResponse.json(
      {
        error: 'Career site not configured',
        hint: 'Add collection ID and API token in Settings → Career Site',
      },
      { status: 400 }
    );
  }

  try {
    const items = await fetchWebflowLiveItems(collectionId, apiToken, {
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
      if (baseUrl && job.slug) {
        job.viewUrl = `${baseUrl}/${job.slug}`;
      }
      return job;
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch jobs from career site';
    return NextResponse.json(
      { error: 'Career site API error', detail: message },
      { status: 502 }
    );
  }
}
