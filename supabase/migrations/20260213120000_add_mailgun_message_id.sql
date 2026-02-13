-- Add message_id to campaign_recipients for Mailgun webhook correlation
-- Mailgun returns message-id in send response; webhooks include it for event correlation
ALTER TABLE public.campaign_recipients
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Add campaign_recipient_id to communications for linking campaign sends to activity log
-- Enables tracking which communications came from campaigns vs manual logs
ALTER TABLE public.communications
ADD COLUMN IF NOT EXISTS campaign_recipient_id UUID REFERENCES public.campaign_recipients(id) ON DELETE SET NULL;

-- Add external_message_id for Mailgun message-id (useful for webhook lookups)
ALTER TABLE public.communications
ADD COLUMN IF NOT EXISTS external_message_id TEXT;
