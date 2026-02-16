import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';

const BUCKET = 'resumes';

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: resume, error: fetchError } = await supabase
    .from('candidate_resumes')
    .select('file_path, file_name, mime_type')
    .eq('id', resumeId)
    .single();

  if (fetchError || !resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(resume.file_path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'File not found in storage' },
      { status: 404 }
    );
  }

  const headers = new Headers();
  headers.set(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(resume.file_name)}"`
  );
  headers.set('Content-Type', resume.mime_type || 'application/pdf');
  headers.set('Cache-Control', 'private, max-age=3600');

  return new NextResponse(data, { headers });
}
