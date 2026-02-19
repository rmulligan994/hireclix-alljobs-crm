import { supabase } from '@/integrations/supabase/client';
import type { CandidateResume } from '@/types/Resume';

const BUCKET = 'resumes';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/** App route segments - when first path segment is one of these, we're at origin (no base path). */
const APP_ROUTE_SEGMENTS = new Set([
  'talent', 'talent-pools', 'pipelines', 'campaigns', 'analytics', 'integrations', 'settings',
  'candidates', 'dashboard', 'jobs', 'reports',
]);

/** Base URL for API routes (origin + basePath). Works with Webflow basePath. */
function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  let base = process.env.NEXT_PUBLIC_BASE_URL || '';
  // Fallback: derive base path from current URL (e.g. /crm from .../crm/candidates/123)
  if (!base && typeof window !== 'undefined') {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const first = segments[0];
    // If first segment is an app route, we're at origin (no base path like /crm)
    if (first && !APP_ROUTE_SEGMENTS.has(first) && first !== 'api') {
      base = `/${first}`;
    }
  }
  return `${window.location.origin}${base.startsWith('/') ? base : base ? `/${base}` : ''}`;
}

const mapRowToResume = (row: any): CandidateResume => ({
  id: row.id,
  candidateId: row.candidate_id,
  filePath: row.file_path,
  fileName: row.file_name,
  fileSize: row.file_size,
  mimeType: row.mime_type || 'application/pdf',
  version: row.version ?? 1,
  isPrimary: row.is_primary ?? false,
  uploadedAt: new Date(row.uploaded_at),
  uploadedBy: row.uploaded_by,
});

export const resumeService = {
  /**
   * List all resumes for a candidate, newest first (version order)
   */
  listByCandidate: async (candidateId: string): Promise<CandidateResume[]> => {
    const { data, error } = await supabase
      .from('candidate_resumes')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('version', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToResume);
  },

  /**
   * Upload a new resume version
   */
  upload: async (candidateId: string, file: File): Promise<CandidateResume> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('You must be signed in to upload resumes. Please refresh the page and try again.');
    }
    const user = session.user;
    // Refresh session if close to expiry so storage RLS has valid JWT
    await supabase.auth.refreshSession();
    const ext = file.name.split('.').pop() || 'pdf';
    const filePath = `${candidateId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      const msg = uploadError.message?.toLowerCase() ?? '';
      if (msg.includes('bucket') || msg.includes('not found')) {
        throw new Error(
          'Resumes bucket not found. Run the database migration (supabase db push) to create it, or create a "resumes" bucket in Supabase Dashboard → Storage.'
        );
      }
      if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy')) {
        throw new Error(
          'Upload denied by storage permissions. Ensure you are signed in and the database migration has been applied (supabase db push).'
        );
      }
      throw new Error(uploadError.message || 'Storage upload failed');
    }

    const { data: existing } = await supabase
      .from('candidate_resumes')
      .select('version')
      .eq('candidate_id', candidateId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (existing?.version ?? 0) + 1;

    // Newly uploaded resumes are always primary; clear primary from others first
    await supabase
      .from('candidate_resumes')
      .update({ is_primary: false })
      .eq('candidate_id', candidateId);

    const { data: row, error: insertError } = await supabase
      .from('candidate_resumes')
      .insert({
        candidate_id: candidateId,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
        version: nextVersion,
        is_primary: true,
        uploaded_by: user?.id,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message || 'Failed to save resume record');
    return mapRowToResume(row);
  },

  /**
   * Get a signed URL for viewing/downloading (Supabase storage).
   * Used as fallback when API route is unavailable (e.g. server-side).
   */
  getSignedUrl: async (resumeId: string, expiresIn = SIGNED_URL_EXPIRY): Promise<string> => {
    const { data: resume, error: fetchError } = await supabase
      .from('candidate_resumes')
      .select('file_path')
      .eq('id', resumeId)
      .single();

    if (fetchError || !resume) throw new Error('Resume not found');

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(resume.file_path, expiresIn);

    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Failed to create signed URL');
    return data.signedUrl;
  },

  /**
   * Get URL for viewing/downloading. Uses the app's API route (avoids CORS issues
   * when hosted on Webflow) with the session token for auth.
   */
  getResumeUrl: async (resumeId: string): Promise<string> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to view resumes. Please refresh the page and try again.');
    }
    const base = getApiBase();
    if (!base) {
      // Fallback to signed URL when base not available (e.g. SSR)
      return resumeService.getSignedUrl(resumeId);
    }
    const token = encodeURIComponent(session.access_token);
    return `${base}/api/resumes/${resumeId}?token=${token}`;
  },

  /**
   * Get file as blob for download.
   */
  getFileBlob: async (resumeId: string): Promise<Blob> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to download resumes. Please refresh the page and try again.');
    }
    const base = getApiBase();
    const url = base
      ? `${base}/api/resumes/${resumeId}?token=${encodeURIComponent(session.access_token)}`
      : await resumeService.getSignedUrl(resumeId);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to load file: ${res.status}`);
    }
    return res.blob();
  },

  /**
   * Set a resume as the primary (display) version
   */
  setPrimary: async (resumeId: string): Promise<void> => {
    const { data: resume, error: fetchError } = await supabase
      .from('candidate_resumes')
      .select('candidate_id')
      .eq('id', resumeId)
      .single();

    if (fetchError || !resume) throw new Error('Resume not found');

    await supabase
      .from('candidate_resumes')
      .update({ is_primary: false })
      .eq('candidate_id', resume.candidate_id);

    const { error: updateError } = await supabase
      .from('candidate_resumes')
      .update({ is_primary: true })
      .eq('id', resumeId);

    if (updateError) throw updateError;
  },

  /**
   * Delete a resume (file + DB record)
   */
  delete: async (resumeId: string): Promise<void> => {
    const { data: resume, error: fetchError } = await supabase
      .from('candidate_resumes')
      .select('file_path, candidate_id, is_primary')
      .eq('id', resumeId)
      .single();

    if (fetchError || !resume) throw new Error('Resume not found');

    await supabase.storage.from(BUCKET).remove([resume.file_path]);

    const { error: deleteError } = await supabase
      .from('candidate_resumes')
      .delete()
      .eq('id', resumeId);

    if (deleteError) throw deleteError;

    if (resume.is_primary) {
      const { data: next } = await supabase
        .from('candidate_resumes')
        .select('id')
        .eq('candidate_id', resume.candidate_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (next) {
        await supabase
          .from('candidate_resumes')
          .update({ is_primary: true })
          .eq('id', next.id);
      }
    }
  },
};
