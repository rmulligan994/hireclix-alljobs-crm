import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';
import { fetchWebflowSiteAssetsPage } from '@/lib/webflowAssets';

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
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

  const { data: orgSettings, error: settingsError } = await supabase
    .from('organization_settings')
    .select('webflow_site_id, webflow_api_token')
    .limit(1)
    .single();

  if (settingsError || !orgSettings) {
    return NextResponse.json({ error: 'Organization settings not found' }, { status: 404 });
  }

  const siteId = orgSettings.webflow_site_id?.trim();
  const apiToken = orgSettings.webflow_api_token?.trim();
  if (!siteId || !apiToken) {
    return NextResponse.json(
      {
        error: 'Webflow not configured',
        hint: 'Add Career Site ID and API token in Settings → Career Site. The token needs assets:read scope.',
      },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '100', 10) || 100));

  try {
    const { assets, total } = await fetchWebflowSiteAssetsPage(siteId, apiToken, { offset, limit });
    return NextResponse.json({ assets, pagination: { offset, limit, total } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webflow request failed';
    return NextResponse.json({ error: 'Webflow assets API error', detail: message }, { status: 502 });
  }
}
