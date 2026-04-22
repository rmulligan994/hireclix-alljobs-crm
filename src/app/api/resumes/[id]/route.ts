import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';

const BUCKET = 'resumes';

function normalizeStorageObjectPath(filePath: string): string {
  let p = filePath.trim();
  if (p.startsWith('/')) p = p.slice(1);
  if (p.startsWith(`${BUCKET}/`)) p = p.slice(BUCKET.length + 1);
  return p;
}

function getSupabasePublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { supabaseUrl, anonKey };
}

/** Supabase storage often returns error.message as JSON: {"url":"https://.../object/..."} */
function formatStorageDetailMessage(raw: string | undefined): string {
  if (!raw) return 'Unknown storage error';
  try {
    const p = JSON.parse(raw) as { message?: string; error?: string; url?: string };
    if (typeof p.message === 'string' && p.message) return p.message;
    if (typeof p.error === 'string' && p.error) return p.error;
    if (typeof p.url === 'string' && p.url) {
      return `Storage could not return this object (404 or access). Requested: ${p.url}`;
    }
  } catch {
    /* use raw */
  }
  return raw;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: resumeId } = await params;
  if (!resumeId) {
    return NextResponse.json({ error: 'Resume ID required' }, { status: 400 });
  }

  const token =
    request.headers.get('Authorization')?.replace('Bearer ', '') ??
    new URL(request.url).searchParams.get('token');
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
        detail: `Missing environment variables: ${missing.join(', ')}. Add them to your hosting env (same values the app uses for Supabase).`,
      },
      { status: 500 }
    );
  }

  // User-scoped client: RLS on candidate_resumes + storage (no service role required).
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

  const { data: resume, error: fetchError } = await supabase
    .from('candidate_resumes')
    .select('file_path, file_name, mime_type')
    .eq('id', resumeId)
    .single();

  if (fetchError || !resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  const filePath = normalizeStorageObjectPath(resume.file_path);

  // Prefer a short-lived signed URL: storage auth in server routes is finicky; this matches
  // what the browser client uses for createSignedUrl and works reliably in iframes (302 to CDN).
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 300);
  if (!signError && signed?.signedUrl) {
    return NextResponse.redirect(signed.signedUrl, 302);
  }

  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

  const fileHeaders = () => {
    const h = new Headers();
    h.set('Content-Disposition', `inline; filename="${encodeURIComponent(resume.file_name)}"`);
    h.set('Content-Type', resume.mime_type || 'application/pdf');
    h.set('Cache-Control', 'private, max-age=3600');
    return h;
  };

  if (!error && data) {
    return new NextResponse(data, { headers: fileHeaders() });
  }

  // User JWT can fail to read storage even when the file exists (Dashboard works because it
  // can use a privileged path). After we confirmed the user can read this resume row, we
  // may read the object with the service role (server only — not exposed to the browser).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) {
    const admin = createClient<Database>(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: adminBlob, error: adminDlErr } = await admin.storage
      .from(BUCKET)
      .download(filePath);
    if (!adminDlErr && adminBlob) {
      return new NextResponse(adminBlob, { headers: fileHeaders() });
    }
    const { data: adminSigned, error: adminSignErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 300);
    if (!adminSignErr && adminSigned?.signedUrl) {
      return NextResponse.redirect(adminSigned.signedUrl, 302);
    }
  }

  const msg = signError?.message || error?.message || 'File not found in storage';
  const detail = formatStorageDetailMessage(msg);

  return NextResponse.json(
    {
      error: 'File not found in storage',
      detail,
      hint: serviceKey
        ? 'User and service-role reads both failed. In Dashboard → Storage, confirm the object path matches candidate_resumes.file_path for this resume (same project: xvkeruwiravjnzikrtkp).'
        : 'The Next server has no SUPABASE_SERVICE_ROLE_KEY. In the repo root .env.local add: SUPABASE_SERVICE_ROLE_KEY=<service_role from Supabase Dashboard → Project Settings → API> (use the service_role value, not anon). Restart npm run dev completely. This does not change or replace your anon key.',
    },
    { status: 404 }
  );
}
