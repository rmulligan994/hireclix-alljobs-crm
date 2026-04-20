-- Allow multiple scheduled_emails rows per (campaign, recipient, email step) over time
-- so recurring sends (daily/weekly/monthly with a single campaign_email) can queue again
-- after the previous send is marked "sent".
-- Keep at most one *pending* row per (campaign_id, campaign_recipient_id, campaign_email_id).

ALTER TABLE public.scheduled_emails
  DROP CONSTRAINT IF EXISTS scheduled_emails_campaign_id_campaign_recipient_id_campaign_email_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS scheduled_emails_one_pending_per_recipient_step
  ON public.scheduled_emails (campaign_id, campaign_recipient_id, campaign_email_id)
  WHERE (status = 'pending');
