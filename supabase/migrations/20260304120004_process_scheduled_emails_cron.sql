-- pg_cron job to process scheduled emails daily at 6:00 AM UTC
-- Requires pg_cron and pg_net extensions (enable in Dashboard if not already)
-- Requires vault secret 'supabase_anon_key' (same as sync-jobs setup)

create or replace function public.trigger_process_scheduled_emails()
returns void language plpgsql security definer as $$
declare
  anon_key text;
  edge_url text;
begin
  select decrypted_secret into anon_key from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;
  if anon_key is null then
    raise exception 'Vault secret supabase_anon_key not found. Run: select vault.create_secret(''YOUR_ANON_KEY'', ''supabase_anon_key'');';
  end if;
  edge_url := 'https://xvkeruwiravjnzikrtkp.supabase.co/functions/v1/process-scheduled-emails';
  perform net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

-- Schedule daily at 6:00 AM UTC
select cron.schedule(
  'process-scheduled-emails-daily',
  '0 6 * * *',
  'select public.trigger_process_scheduled_emails();'
);
