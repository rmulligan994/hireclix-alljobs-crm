-- Drop existing restrictive policies on candidates table
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can delete candidates" ON public.candidates;

-- Create PERMISSIVE policies for all authenticated users
CREATE POLICY "Authenticated users can view candidates"
ON public.candidates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete candidates"
ON public.candidates
FOR DELETE
TO authenticated
USING (true);