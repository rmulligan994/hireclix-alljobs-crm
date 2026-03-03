-- Backfill created_by for campaign communications that were inserted without it
-- (campaign sends from send-campaign-email edge function before the fix)
UPDATE public.communications c
SET created_by = camp.user_id
FROM public.campaign_recipients cr
JOIN public.campaigns camp ON camp.id = cr.campaign_id
WHERE c.campaign_recipient_id = cr.id
  AND c.created_by IS NULL;
