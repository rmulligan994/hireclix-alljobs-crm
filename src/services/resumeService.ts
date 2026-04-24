import { supabase } from '@/integrations/supabase/client';
import { getApiBase } from '@/lib/api';
import type { CandidateResume } from '@/types/Resume';

const BUCKET = 'resumes';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/** If legacy rows include the bucket name in the path, strip it so storage API resolves correctly. */
function normalizeStorageFilePath(filePath: string): string {
  let p = filePath.trim();
  if (p.startsWith('/')) p = p.slice(1);
  if (p.startsWith(`${BUCKET}/`)) p = p.slice(BUCKET.length + 1);
  return p;
}

/**
 * Next API routes for this app live under the Webflow mount, e.g. `.../crm/api/...`.
 * `getApiBase()` is sometimes origin-only; this ensures a single `/crm` segment before `/api/...` (idempotent).
 * Remove or rely on `NEXT_PUBLIC_BASE_URL=/crm` once env is set everywhere.
 */
function crmAppApiBaseForResumeRoutes(): string {
  const b = getApiBase();
  if (!b) return '';
  try {
    const { pathname, origin } = new URL(b);
    const p = pathname.replace(/\/$/, '') || '/';
    if (p === '/crm' || p.startsWith('/crm/')) {
      return b;
    }
    return `${origin}/crm`;
  } catch {
    return /\/crm(\/|$)/.test(b) ? b : `${b.replace(/\/$/, '')}/crm`;
  }
}

/**
 * Supabase storage errors are often class instances: JSON.stringify(err) is "{}" and
 * message can be empty. Unpack what we can for logs and toasts.
 */
function formatStorageError(err: unknown): string {
  if (err == null) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    if (err.message?.trim()) return err.message.trim();
  }
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const bits: string[] = [];
    for (const k of ['message', 'error', 'status', 'statusCode', 'code', 'name', 'details', 'hint'] as const) {
      if (k in o && o[k] != null && String(o[k]).length > 0) {
        bits.push(`${k}=${String(o[k])}`);
      }
    }
    if (bits.length) return bits.join(' · ');
    try {
      const plain: Record<string, unknown> = {};
      for (const k of Object.getOwnPropertyNames(err)) {
        const v = (o as Record<string, unknown>)[k];
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          plain[k] = v;
        }
      }
      const s = JSON.stringify(plain);
      if (s !== '{}') return s;
    } catch {
      /* ignore */
    }
    const ctorName = (o.constructor as { name?: string } | undefined)?.name;
    if (ctorName && ctorName !== 'Object') return ctorName;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return 'Storage request failed';
  }
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

    const path = normalizeStorageFilePath(resume.file_path);

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);

    if (!signError && signed?.signedUrl) {
      return signed.signedUrl;
    }

    // Same session as upload — works if createSignedUrl fails but the object is readable.
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(path);
    if (downloadError) {
      const fromSign = formatStorageError(signError);
      const fromDownload = formatStorageError(downloadError);
      const detail = fromDownload || fromSign || 'Object not found';
      // Pass raw error objects as extra args so DevTools shows full properties (stringify is often "{}" for SDK classes)
      console.error(
        '[resumeService] storage read failed',
        { resumeId, path, detail },
        { createSignedUrlError: signError, downloadError }
      );
      const hint =
        detail.includes('not found') || detail.includes('Not found')
          ? ' If this is a new upload, open Supabase → Storage → resumes and confirm a file exists at this path, and that the row in public.candidate_resumes matches.'
          : '';
      throw new Error(
        `Could not open this resume (${detail}).${hint} Also confirm .env.local uses the same project URL and anon key as the dashboard, then restart the dev server.`
      );
    }
    if (!blob) throw new Error('Empty file from storage');
    return URL.createObjectURL(blob);
  },

  /**
   * Get URL for viewing in an iframe or new tab. Prefer the same-origin `/api/resumes` route
   * so the server can stream the file (and use a service-role fallback when the browser
   * cannot read storage with the user JWT—same project as the dashboard, without exposing
   * the service key to the client).
   */
  getResumeUrl: async (resumeId: string): Promise<string> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to view resumes. Please refresh the page and try again.');
    }
    if (typeof window !== 'undefined' && getApiBase()) {
      const token = encodeURIComponent(session.access_token);
      return `${crmAppApiBaseForResumeRoutes()}/api/resumes/${resumeId}?token=${token}`;
    }
    return resumeService.getSignedUrl(resumeId);
  },

  /**
   * Get file as blob for download.
   */
  getFileBlob: async (resumeId: string): Promise<Blob> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to download resumes. Please refresh the page and try again.');
    }
    if (typeof window !== 'undefined' && getApiBase()) {
      const res = await fetch(
        `${crmAppApiBaseForResumeRoutes()}/api/resumes/${resumeId}?token=${encodeURIComponent(session.access_token)}`
      );
      if (res.ok) return res.blob();
    }
    const url = await resumeService.getSignedUrl(resumeId);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to load file: ${res.status}`);
    }
    return res.blob();
  },

  /**
   * AI-suggested tags from resume PDF text (gpt-4o-mini via `parse-resume` edge function, tags_only mode).
   * Pass `excludeTags` so repeat requests ask the model for different labels (not in candidate or pending list).
   */
  suggestTagsFromResume: async (
    resumeId: string,
    options?: { excludeTags?: string[] },
  ): Promise<string[]> => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to use resume tag suggestions. Please refresh and try again.');
    }
    if (typeof window === 'undefined' || !getApiBase()) {
      throw new Error('Tag suggestions are only available in the app.');
    }
    const excludeTags = (options?.excludeTags ?? [])
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch(`${crmAppApiBaseForResumeRoutes()}/api/resumes/${resumeId}/suggest-tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ excludeTags }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      tags?: unknown;
      error?: string;
      detail?: string;
    };
    if (!res.ok) {
      const msg = [data.error, data.detail]
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .join(' — ');
      throw new Error(msg || 'Could not suggest tags from resume');
    }
    return Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
      : [];
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

    await supabase.storage
      .from(BUCKET)
      .remove([normalizeStorageFilePath(resume.file_path)]);

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
