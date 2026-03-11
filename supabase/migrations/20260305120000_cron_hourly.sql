-- Change scheduled emails cron from daily to hourly
-- Unschedule old daily job if it exists
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-scheduled-emails-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

-- Schedule hourly (at minute 0 of every hour)
SELECT cron.schedule(
  'process-scheduled-emails-hourly',
  '0 * * * *',
  'select public.trigger_process_scheduled_emails();'
);
