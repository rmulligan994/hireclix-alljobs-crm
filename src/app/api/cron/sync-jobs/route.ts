import { NextResponse } from 'next/server';

/**
 * Cron trigger - delegates to Supabase Edge Function to avoid 504 timeout.
 * Returns 202 immediately; sync runs in Edge Function (longer timeout).
 */
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
        {
          error: 'Server not configured',
          missing: [!supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL', !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(
            Boolean
          ),
        },
        { status: 500 }
      );
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Unexpected error', detail: msg }, { status: 500 });
  }
}
