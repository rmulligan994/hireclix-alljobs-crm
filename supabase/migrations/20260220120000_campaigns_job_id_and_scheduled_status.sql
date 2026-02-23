-- Add job_id to campaigns for job_alert campaigns (job merge tags)
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

-- campaign_recipients.status is TEXT with no CHECK - "scheduled" is already valid
-- No migration needed for scheduled status; it works as-is