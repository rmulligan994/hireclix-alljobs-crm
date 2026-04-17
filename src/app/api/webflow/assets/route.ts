import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';
import { fetchWebflowSiteAssetsPage } from '@/lib/webflowAssets';

/** Public URL + anon key only. Uses the caller's JWT so RLS applies (no service role on the host). */
function getSupabasePublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { supabaseUrl, anonKey };
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { supabaseUrl, anonKey } = getSupabasePublicEnv();
  if (!supabaseUrl || !anonKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return NextResponse.json(
      {
        error: 'Server configuration error',
        detail: `Missing environment variables: ${missing.join(', ')}. Add them to your hosting env (same values the app already uses for Supabase).`,
      },
      { status: 500 },
    );
  }

  const supabase = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

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
