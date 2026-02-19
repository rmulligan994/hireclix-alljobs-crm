-- Jobs table: synced from Webflow CMS (read-only display)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webflow_item_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  type TEXT,
  description TEXT,
  url TEXT,
  slug TEXT,
  req_id TEXT,
  view_url TEXT,
  posted_date TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_webflow_item_id ON public.jobs(webflow_item_id);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON public.jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_req_id ON public.jobs(req_id);

-- Sync logs: observability for jobs sync
CREATE TABLE IF NOT EXISTS public.jobs_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  jobs_fetched INTEGER DEFAULT 0,
  jobs_upserted INTEGER DEFAULT 0,
  error_message TEXT,
  error_detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_sync_logs_started_at ON public.jobs_sync_logs(started_at DESC);

-- RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view jobs"
  ON public.jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage jobs"
  ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view sync logs"
  ON public.jobs_sync_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert sync logs"
  ON public.jobs_sync_logs FOR INSERT TO service_role WITH CHECK (true);
