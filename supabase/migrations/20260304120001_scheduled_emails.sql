-- Central queue of all emails to be sent (one row = one recipient, one step, one scheduled time)
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_email_id UUID NOT NULL REFERENCES public.campaign_emails(id) ON DELETE CASCADE,
  campaign_recipient_id UUID NOT NULL REFERENCES public.campaign_recipients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  recurrence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, campaign_recipient_id, campaign_email_id)
);

CREATE INDEX idx_scheduled_emails_status_scheduled ON public.scheduled_emails(status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_emails_campaign ON public.scheduled_emails(campaign_id);

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS: access through campaign ownership
CREATE POLICY "Users can view scheduled_emails for their campaigns" ON public.scheduled_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = scheduled_emails.campaign_id
      AND (c.user_id = auth.uid() OR c.is_organization_campaign = true)
    )
  );

CREATE POLICY "Users can insert scheduled_emails for their campaigns" ON public.scheduled_emails
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = scheduled_emails.campaign_id
      AND (c.user_id = auth.uid() OR c.is_organization_campaign = true)
    )
  );

CREATE POLICY "Users can update scheduled_emails for their campaigns" ON public.scheduled_emails
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = scheduled_emails.campaign_id
      AND (c.user_id = auth.uid() OR c.is_organization_campaign = true)
    )
  );
