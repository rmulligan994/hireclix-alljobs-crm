-- Fix storage RLS for resumes bucket
-- Supabase sets owner_id from JWT on upload; policy must explicitly allow it
DROP POLICY IF EXISTS "Authenticated users can upload resumes" ON storage.objects;
CREATE POLICY "Authenticated users can upload resumes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (owner_id = auth.uid()::text OR owner_id IS NULL)
  );
