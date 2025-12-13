-- Drop existing RESTRICTIVE policies and recreate as PERMISSIVE

-- Candidates
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can delete candidates" ON public.candidates;

CREATE POLICY "Authenticated users can view candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update candidates" ON public.candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete candidates" ON public.candidates FOR DELETE TO authenticated USING (true);

-- Talent Pools
DROP POLICY IF EXISTS "Authenticated users can view talent pools" ON public.talent_pools;
DROP POLICY IF EXISTS "Authenticated users can create talent pools" ON public.talent_pools;
DROP POLICY IF EXISTS "Authenticated users can update talent pools" ON public.talent_pools;
DROP POLICY IF EXISTS "Authenticated users can delete talent pools" ON public.talent_pools;

CREATE POLICY "Authenticated users can view talent pools" ON public.talent_pools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create talent pools" ON public.talent_pools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update talent pools" ON public.talent_pools FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete talent pools" ON public.talent_pools FOR DELETE TO authenticated USING (true);

-- Pipelines
DROP POLICY IF EXISTS "Authenticated users can view pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Authenticated users can create pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Authenticated users can update pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Authenticated users can delete pipelines" ON public.pipelines;

CREATE POLICY "Authenticated users can view pipelines" ON public.pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create pipelines" ON public.pipelines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pipelines" ON public.pipelines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pipelines" ON public.pipelines FOR DELETE TO authenticated USING (true);

-- Talent Pool Candidates
DROP POLICY IF EXISTS "Authenticated users can view pool candidates" ON public.talent_pool_candidates;
DROP POLICY IF EXISTS "Authenticated users can add pool candidates" ON public.talent_pool_candidates;
DROP POLICY IF EXISTS "Authenticated users can remove pool candidates" ON public.talent_pool_candidates;

CREATE POLICY "Authenticated users can view pool candidates" ON public.talent_pool_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add pool candidates" ON public.talent_pool_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can remove pool candidates" ON public.talent_pool_candidates FOR DELETE TO authenticated USING (true);

-- Pipeline Candidates
DROP POLICY IF EXISTS "Authenticated users can view pipeline candidates" ON public.pipeline_candidates;
DROP POLICY IF EXISTS "Authenticated users can add pipeline candidates" ON public.pipeline_candidates;
DROP POLICY IF EXISTS "Authenticated users can update pipeline candidates" ON public.pipeline_candidates;
DROP POLICY IF EXISTS "Authenticated users can remove pipeline candidates" ON public.pipeline_candidates;

CREATE POLICY "Authenticated users can view pipeline candidates" ON public.pipeline_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add pipeline candidates" ON public.pipeline_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pipeline candidates" ON public.pipeline_candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can remove pipeline candidates" ON public.pipeline_candidates FOR DELETE TO authenticated USING (true);