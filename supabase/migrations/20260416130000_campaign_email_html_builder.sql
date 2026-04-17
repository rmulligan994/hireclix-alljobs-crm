-- HTML email builder (replaces BeeFree-only JSON): structured form + raw HTML
ALTER TABLE public.campaign_emails
  ADD COLUMN IF NOT EXISTS compose_kind TEXT,
  ADD COLUMN IF NOT EXISTS form_payload JSONB;

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS compose_kind TEXT,
  ADD COLUMN IF NOT EXISTS form_payload JSONB;

COMMENT ON COLUMN public.campaign_emails.compose_kind IS 'announcement_form | raw_html — mirrors client email builder';
COMMENT ON COLUMN public.campaign_emails.form_payload IS 'AnnouncementForm JSON when compose_kind is announcement_form';
