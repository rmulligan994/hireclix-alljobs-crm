# Campaign Scheduled Emails — Cron Setup

The campaign drip system uses an **hourly** cron job to process `scheduled_emails` and send emails via the `process-scheduled-emails` edge function.

## Prerequisites

1. **pg_cron** — Enable in Supabase Dashboard: Database → Extensions → enable `pg_cron`
2. **pg_net** — Enable in Supabase Dashboard: Database → Extensions → enable `pg_net`
3. **Vault secret** — Store your project's anon key for authenticated requests to the edge function

## Vault Secret

The cron job invokes the edge function with the anon key for authorization. Create the secret:

```sql
-- Replace YOUR_ANON_KEY with your project's anon key from Settings → API
SELECT vault.create_secret('YOUR_ANON_KEY', 'supabase_anon_key');
```

You can find the anon key in Supabase Dashboard → Settings → API → Project API keys → `anon` `public`.

## Migrations

1. **20260304120004_process_scheduled_emails_cron.sql** — Creates `trigger_process_scheduled_emails()` and initial daily schedule.
2. **20260305120000_cron_hourly.sql** — Unschedule daily job; schedule **hourly** (`0 * * * *` = every hour at minute 0).

## Verify

After running migrations:

```sql
-- Check the job is scheduled
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-emails-hourly';

-- Manually trigger (optional)
SELECT public.trigger_process_scheduled_emails();
```

## Troubleshooting

- **"Vault secret supabase_anon_key not found"** — Run the `vault.create_secret` statement above
- **pg_cron not available** — Enable the extension in the Dashboard
- **pg_net not available** — Enable the extension in the Dashboard
- **Edge function 401** — Ensure the anon key in vault matches your project's anon key
