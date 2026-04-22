import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import type { Database } from '@/integrations/supabase/types';

export const maxDuration = 60;

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

function isPdfMime(mime: string | null | undefined, fileName: string): boolean {
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf')) return true;
  return fileName.toLowerCase().endsWith('.pdf');
}

/**
 * POST — extract text from the candidate's resume PDF and ask OpenAI (edge `parse-resume`, mode tags_only) for ~5 tag suggestions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: resumeId } = await params;
  if (!resumeId) {
    return NextResponse.json({ error: 'Resume ID required' }, { status: 400 });
  }

  const token =
    request.headers.get('Authorization')?.replace('Bearer ', '') ?? undefined;
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let excludeTags: string[] = [];
  try {
    const body = (await request.json()) as { excludeTags?: unknown };
    if (body && Array.isArray(body.excludeTags)) {
      excludeTags = body.excludeTags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  } catch {
    /* optional body */
  }
  {
    const seen = new Set<string>();
    excludeTags = excludeTags
      .filter((t) => {
        const k = t.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 80);
  }

  const { supabaseUrl, anonKey } = getSupabasePublicEnv();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server not configured', detail: 'SUPABASE_SERVICE_ROLE_KEY is required for AI tag suggestions.' },
      { status: 500 },
    );
  }

  const supabase = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
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

  if (!isPdfMime(resume.mime_type, resume.file_name)) {
    return NextResponse.json(
      { error: 'Only PDF resumes support AI tag suggestions' },
      { status: 400 },
    );
  }

  const filePath = normalizeStorageObjectPath(resume.file_path);
  let blob: Blob | null = null;
  const { data: userDl, error: dlErr } = await supabase.storage.from(BUCKET).download(filePath);
  if (!dlErr && userDl) {
    blob = userDl;
  } else {
    const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: adminBlob, error: adminErr } = await admin.storage.from(BUCKET).download(filePath);
    if (!adminErr && adminBlob) blob = adminBlob;
  }

  if (!blob) {
    return NextResponse.json({ error: 'Could not read resume file' }, { status: 502 });
  }

  const bytes = await blob.arrayBuffer();
  const buffer = new Uint8Array(bytes);
  let text: string;
  try {
    const pdf = await getDocumentProxy(buffer);
    const { text: extracted } = await extractText(pdf, { mergePages: true });
    text = extracted || '';
  } catch {
    return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
  }

  if (!text || text.length < 50) {
    return NextResponse.json(
      { error: 'Resume text too short to suggest tags' },
      { status: 400 },
    );
  }

  const edgeUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/parse-resume`;
  const res = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, mode: 'tags_only', excludeTags }),
  });

  const data = (await res.json().catch(() => ({}))) as { tags?: unknown; error?: string; detail?: string };
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error || data.detail || `Tag suggestion failed (${res.status})` },
      { status: res.status >= 500 ? 502 : res.status },
    );
  }

  const tags = Array.isArray(data.tags)
    ? data.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
    : [];

  return NextResponse.json({ tags });
}
