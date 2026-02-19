import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';

/**
 * Manual sync trigger - requires authenticated user.
 * Delegates to Supabase Edge Function to avoid 504 timeout.
 * Returns 202 immediately; UI polls jobs_sync_logs for status.
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

  const edgeUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/sync-jobs`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.warn('Edge Function trigger timed out (may still be processing)');
    } else {
      console.error('Failed to trigger sync-jobs Edge Function:', err);
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return NextResponse.json({ accepted: true, message: 'Sync started' }, { status: 202 });
}
