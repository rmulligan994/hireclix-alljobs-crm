# Jobs Sync Setup

Jobs sync from Webflow CMS to Supabase every 15 minutes for faster loading and full-text search.

> **Reimplementation:** For new client deployments, see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md#jobs-sync-career-site) for the full checklist.

## App URL (Webflow Cloud)

Your app URL is the **full base URL** where your Next.js app is served, **including the mount path**:

| Scenario | App URL |
|---------|---------|
| Webflow Cloud, mount path `/app` | `https://your-site.webflow.io/app` |
| Webflow Cloud, custom domain | `https://careers.yourcompany.com/app` (if mount path is `/app`) |
| Root mount (no path) | `https://your-site.webflow.io` |

The cron endpoint is: `{APP_URL}/api/cron/sync-jobs`  
Example: `https://your-site.webflow.io/app/api/cron/sync-jobs`

## How it works

1. **Cron** runs every 15 min and POSTs to the sync endpoint (Next.js API or Edge Function)
2. **Sync** runs in a Supabase Edge Function (avoids 504 timeout from Webflow/Cloudflare)
3. **Jobs tab** reads from Supabase (falls back to live API if Supabase fails)

The Next.js API returns 202 immediately and triggers the Edge Function in the background.

## Setup

### 1. Supabase migrations

Run all pending migrations (includes `jobs`, `jobs_sync_logs`, and prerequisite `organization_settings` columns):

```bash
supabase db push
```

**Migrations applied (in order):**

| Migration | Purpose |
|-----------|---------|
| `20260219120000_add_webflow_jobs_config.sql` | `organization_settings`: webflow_collection_id, webflow_api_token, webflow_job_field_mapping |
| `20260219130000_add_career_site_base_url.sql` | `organization_settings`: career_site_base_url |
| `20260219140000_add_jobs_and_sync_logs.sql` | `jobs` table, `jobs_sync_logs` table, RLS policies |

**Verify in Supabase Dashboard:** Table Editor → `jobs` and `jobs_sync_logs` exist.

### 2. Deploy the sync Edge Function

```bash
supabase functions deploy sync-jobs
```

Set the secret (same value as CRON_SECRET):

```bash
supabase secrets set JOBS_CRON_SECRET=your-cron-secret
```

### 3. Environment variables

| Variable | Required | Where |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for sync) | Same (secret, server-side only) |
| `CRON_SECRET` | Yes (for cron) | Generate: `openssl rand -hex 32` |

Add to `.env.local` (local) and your host’s env (Vercel, etc.).

### 4. Set CRON_SECRET

```bash
openssl rand -hex 32
# Add to env: CRON_SECRET=<output>
```

### 5. Configure cron

**Vercel:** `vercel.json` already has `*/15 * * * *` → `/api/cron/sync-jobs`. Set `CRON_SECRET` in Vercel env vars. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

**Webflow Cloud (Next.js) + Supabase:** Choose one:

#### Option A: cron-job.org (external, ~5 min)

[cron-job.org](https://cron-job.org) is a free third-party cron service (15+ years, 500k+ users). Supports HTTPS, custom headers, MFA. **No SLA**—use for non-critical jobs. Free tier: 60 runs/hour.

1. Create account at [cron-job.org](https://cron-job.org)
2. Create a new cron job:
   - **URL:** `https://YOUR-APP-URL/api/cron/sync-jobs` (see [App URL](#app-url-webflow-cloud) above)
   - **Schedule:** Every 15 minutes
   - **Request method:** POST
   - **Request headers:** Add `Authorization: Bearer YOUR_CRON_SECRET`
3. Save. Done.

#### Option B: Supabase Cron (native scheduler)

Supabase has a built-in scheduler via **pg_cron** + **pg_net**. Calls the Edge Function directly (no Next.js in path).

1. **Enable extensions** in Supabase Dashboard → SQL Editor:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   ```

2. **Store secrets** in Supabase Vault (Dashboard → SQL Editor):
   ```sql
   select vault.create_secret('YOUR_CRON_SECRET', 'jobs_cron_secret');
   select vault.create_secret('https://YOUR-PROJECT.supabase.co', 'supabase_url');
   ```
   Replace `YOUR_CRON_SECRET` and `YOUR-PROJECT` (your Supabase project ref, e.g. `xvkeruwiravjnzikrtkp`).

3. **Create the cron job** (SQL Editor):
   ```sql
   create or replace function public.trigger_jobs_sync()
   returns void language plpgsql security definer as $$
   declare
     secret text;
     base_url text;
   begin
     select decrypted_secret into secret from vault.decrypted_secrets where name = 'jobs_cron_secret' limit 1;
     select decrypted_secret into base_url from vault.decrypted_secrets where name = 'supabase_url' limit 1;
     perform net.http_post(
       url := rtrim(base_url, '/') || '/functions/v1/sync-jobs',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || secret
       ),
       body := '{}'::jsonb,
       timeout_milliseconds := 5000
     );
   end;
   $$;

   select cron.schedule(
     'sync-jobs-every-15-min',
     '*/15 * * * *',
     'select public.trigger_jobs_sync();'
   );
   ```

4. **Verify:** Supabase Dashboard → Integrations → Cron. You should see the job and its runs.

### 6. Set CRON_SECRET on Webflow Cloud

Wherever your Next.js app runs (Webflow Cloud), add `CRON_SECRET` to the environment variables. Used when cron calls the Next.js API (Option A). For Option B, pg_cron calls the Edge Function directly with the same secret.

### 7. Manual sync

Users can trigger sync via "Sync now" on the Jobs tab or Settings → Career Site. Requires authentication.

## Observability

### Per-instance (built-in)

- **jobs_sync_logs** table: last 5 runs, status, counts, errors
- **Jobs tab**: shows "Last sync: X (N jobs)" with status icon
- **Settings → Career Site**: (optional) add sync status section

### Across instances (optional)

| Option | Effort | Use case |
|--------|--------|----------|
| **Sentry** | Low | Error alerting on sync failure |
| **Central webhook** | Medium | Each instance POSTs sync result to a central dashboard |
| **Supabase Dashboard** | None | Per-instance logs in each project |
| **Cron-job.org** | Low | Logs when cron runs; alerts on failures |

### Recommended: Sentry

1. Add Sentry to the project
2. Sync route already catches errors; Sentry will capture them
3. Set up alerts for sync failures

### Optional: Central status dashboard

Each instance could POST to a central endpoint on sync complete:

```json
{
  "instance_id": "project-ref",
  "status": "success",
  "jobs_count": 1500,
  "timestamp": "2026-02-19T..."
}
```

Build a simple admin dashboard that aggregates these. Requires a central service.
