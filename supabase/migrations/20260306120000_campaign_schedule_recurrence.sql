-- Store schedule recurrence metadata for display in Upcoming Sends
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS schedule_recurrence JSONB DEFAULT NULL;

COMMENT ON COLUMN public.campaigns.schedule_recurrence IS 'Schedule metadata: { type, dayOfWeek?, time?, dayOfMonth? } for display in Upcoming Sends';
