# Supabase Setup Checklist for Clarity CRM

Use this checklist to ensure your Supabase project is fully configured for the Clarity CRM app on Webflow Cloud.

---

## Supabase vs Webflow Cloud Storage

**Recommendation: Use Supabase.** For this app, Supabase is the better choice because:

| Feature | Supabase | Webflow Cloud Storage |
|--------|----------|------------------------|
| **Auth** | Built-in (sign up, sign in, password reset, sessions) | Not included — you'd need another auth provider |
| **Database** | PostgreSQL (relational, RLS, triggers) | SQLite (simpler, D1) |
| **Edge Functions** | Yes — Beefree auth, send-campaign-email, mailgun-webhook | No serverless functions |
| **File storage** | Yes (avatars, resumes) | Yes (Object storage) |
| **App integration** | Already built — all services use Supabase | Would require full rewrite of backend |
| **Multi-tenant** | Yes — one project per client via `instances.yaml` | Single environment per project |

Webflow Cloud storage is useful for new apps or when you want everything in one place. This CRM is already built on Supabase; migrating would mean rewriting auth, all services, and Edge Functions.

---

## Checklist

### 1. Supabase Project

- [ ] Project created at [supabase.com/dashboard](https://supabase.com/dashboard)
- [ ] Project ref noted (Settings → General → Reference ID) — used in `deployments/instances.yaml`

### 2. Database Migrations

Run migrations so all tables, RLS policies, and triggers exist:

```bash
# From project root
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or deploy to all instances:

```bash
./scripts/deploy-all.sh
```

**Tables expected after migrations:**
- `profiles` — user profiles (linked to `auth.users`)
- `candidates` — candidate records
- `pipelines` — pipeline definitions
- `pipeline_candidates` — junction table
- `talent_pools` — talent pool definitions
- `talent_pool_candidates` — junction table
- `notes` — candidate notes
- `communications` — candidate communications
- `email_templates` — BeeFree email templates
- `campaigns` — email campaigns
- `campaign_emails` — campaign email templates
- `campaign_recipients` — campaign recipients

### 3. Auth Configuration

- [ ] **Email auth** — enabled by default
- [ ] **Site URL** — Auth → URL Configuration → set to your Webflow Cloud URL (e.g. `https://your-app.webflow.io`)
- [ ] **Redirect URLs** — add your production URL for email confirmations and password reset

### 4. Edge Function Secrets

Supabase Dashboard → Edge Functions → Secrets. Add:

| Secret | Description | Where to get |
|--------|-------------|--------------|
| `MAILGUN_API_KEY` | Sending emails | [Mailgun API Keys](https://app.mailgun.com/app/account/security/api_keys) |
| `MAILGUN_DOMAIN` | Verified sending domain | [Mailgun Domains](https://app.mailgun.com/app/sending/domains) |
| `MAILGUN_FROM` | (Optional) From address | Defaults to `noreply@{domain}` |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | Webhook signature verification | Mailgun → Sending → Webhooks |
| `BEE_CLIENT_ID` | BeeFree email editor | [BeeFree Developers](https://developers.beefree.io/) |
| `BEE_CLIENT_SECRET` | BeeFree email editor | BeeFree Developers |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

### 5. Deploy Edge Functions

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy
```

Functions:
- `beefree-auth` — fetches BeeFree auth token for the email editor
- `send-campaign-email` — sends campaign emails via Mailgun
- `mailgun-webhook` — receives Mailgun events (delivered, opened, clicked) for analytics

### 6. Email Domain (Mailgun)

For campaign emails to work:

- [ ] Add sending domain in [Mailgun Domains](https://app.mailgun.com/app/sending/domains)
- [ ] Add DNS records (SPF, DKIM) as instructed
- [ ] Set `MAILGUN_DOMAIN` and `MAILGUN_FROM` secrets
- [ ] Configure webhooks: add `https://YOUR_PROJECT.supabase.co/functions/v1/mailgun-webhook` for Delivered, Opened, Clicks, Permanent Failures

### 7. Webflow Cloud Environment Variables

In Webflow Cloud → Project → Environment Variables (for the environment you deploy to):

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | From Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your anon/public key | Same place — use the **anon** key, not the service role key |

### 8. Optional: Supabase Storage

If the app stores avatars or resumes, ensure a storage bucket exists:

- [ ] Storage → Create bucket (e.g. `avatars`, `resumes`)
- [ ] Set RLS policies for the bucket
- [ ] Update `avatar_url` / file upload logic if needed

### 9. Verify

- [ ] Sign up / sign in works on the deployed app
- [ ] Candidates, pipelines, talent pools load
- [ ] Email editor (BeeFree) loads when creating campaigns
- [ ] Campaign emails send successfully (test with a small campaign)

---

## Quick Deploy (Single Instance)

```bash
# 1. Link and push migrations
supabase link --project-ref xvkeruwiravjnzikrtkp  # or your project ref
supabase db push

# 2. Deploy edge functions
supabase functions deploy

# 3. Set secrets in Dashboard (Edge Functions → Secrets)
# 4. Set env vars in Webflow Cloud
# 5. Redeploy from Webflow
```

---

## Multi-Instance (Multiple Clients)

Each client gets a separate Supabase project. Edit `deployments/instances.yaml` and run:

```bash
./scripts/deploy-all.sh
```

For each project, configure Auth redirect URLs, secrets, and Webflow env vars separately.
