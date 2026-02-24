-- Fix RLS for talent_pool_candidates and pipeline_candidates
-- 
-- Issue: "new row violates row-level security policy (USING expression) for table talent_pool_candidates"
-- 
-- Root cause: talent_pool_candidates uses upsert (INSERT ... ON CONFLICT DO UPDATE). When a conflict
-- occurs, the UPDATE path is taken. Without an UPDATE policy, the operation fails.
-- 
-- Fix: Add UPDATE policy for talent_pool_candidates. pipeline_candidates already has one.

-- Add UPDATE policy for talent_pool_candidates (required for upsert ON CONFLICT DO UPDATE path)
CREATE POLICY "Authenticated users can update pool candidates" 
  ON public.talent_pool_candidates 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
