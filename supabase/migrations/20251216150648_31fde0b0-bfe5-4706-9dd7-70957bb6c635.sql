-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create candidates" ON public.candidates;

-- Create a permissive policy for authenticated users to insert candidates
CREATE POLICY "Authenticated users can create candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (true);