-- Process scheduled emails every 5 minutes (was hourly at :00).
-- Unschedule the hourly job if present, then register */5 * * * * for process-scheduled-emails.

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-scheduled-emails-hourly' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

-- Avoid duplicate if migration re-run
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-scheduled-emails-5min' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'process-scheduled-emails-5min',
  '*/5 * * * *',
  'select public.trigger_process_scheduled_emails();'
);
