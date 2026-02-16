-- Create candidate_resumes table for resume uploads with versioning
CREATE TABLE public.candidate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  version INTEGER NOT NULL DEFAULT 1,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Version is per-candidate; each new upload increments
CREATE INDEX idx_candidate_resumes_candidate ON public.candidate_resumes(candidate_id);
CREATE INDEX idx_candidate_resumes_uploaded ON public.candidate_resumes(uploaded_at DESC);

-- Only one primary per candidate
CREATE UNIQUE INDEX idx_candidate_resumes_primary ON public.candidate_resumes(candidate_id) WHERE is_primary = true;

-- RLS
ALTER TABLE public.candidate_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view candidate resumes"
  ON public.candidate_resumes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert candidate resumes"
  ON public.candidate_resumes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidate resumes"
  ON public.candidate_resumes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete candidate resumes"
  ON public.candidate_resumes FOR DELETE TO authenticated USING (true);

-- Note: Create the 'resumes' storage bucket via Supabase Dashboard (Storage > New bucket)
-- or run: supabase.storage.createBucket('resumes', { public: false, fileSizeLimit: 10485760 })
