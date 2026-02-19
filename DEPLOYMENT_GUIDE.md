# HireClix CRM - Production Deployment Guide

> **Purpose**: This document outlines all requirements, fixes, and steps needed to deploy this CRM as a production-ready application on Webflow Cloud with Supabase backend.

---

## Table of Contents

1. [Quick Start Checklist](#quick-start-checklist)
2. [Environment Setup](#environment-setup)
3. [Critical Security Fixes](#critical-security-fixes)
4. [Feature Completion Tasks](#feature-completion-tasks)
5. [Infrastructure Setup](#infrastructure-setup)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment](#post-deployment)
8. [Jobs Sync (Career Site)](#jobs-sync-career-site)

---

## Quick Start Checklist

### Before You Begin
- [ ] Supabase account created
- [ ] Mailgun account created (for email)
- [ ] BeeFree account created (for email editor)
- [ ] Webflow account with Cloud hosting
- [ ] Node.js 18+ installed locally
- [ ] Supabase CLI installed (`npm install -g supabase`)

### Minimum Viable Deployment
- [ ] Create `.env` file with all variables
- [ ] Set up Supabase project and run migrations
- [ ] Configure Supabase Edge Function secrets
- [ ] Implement Row Level Security (RLS)
- [ ] Build and deploy to Webflow
- [ ] Verify email sending works

---

## Environment Setup

### Step 1: Create Environment File

Create a `.env` file in the project root:

```env
# ===========================================
# FRONTEND ENVIRONMENT VARIABLES (Required)
# ===========================================

# Supabase Configuration
# Get these from: Supabase Dashboard → Settings → API
# Use NEXT_PUBLIC_ prefix for Next.js (client-side access)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# OPTIONAL: For swapping to different backends
# ===========================================

# Firebase (if using Firebase instead)
# VITE_FIREBASE_API_KEY=
# VITE_FIREBASE_AUTH_DOMAIN=
# VITE_FIREBASE_PROJECT_ID=

# Custom API (if using custom backend)
# VITE_API_URL=
# VITE_API_KEY=
```

### Step 2: Configure Supabase Edge Function Secrets

These are set in the Supabase Dashboard (not in `.env`):

**Navigate to:** Supabase Dashboard → Edge Functions → Secrets

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `MAILGUN_API_KEY` | API key for sending emails | [Mailgun Dashboard](https://app.mailgun.com/app/account/security/api_keys) |
| `MAILGUN_DOMAIN` | Your verified sending domain (e.g. `mg.yourcompany.com`) | [Mailgun Domains](https://app.mailgun.com/app/sending/domains) |
| `MAILGUN_FROM` | (Optional) From address, e.g. `Beacon CRM <noreply@mg.yourcompany.com>` | Defaults to `noreply@{MAILGUN_DOMAIN}` |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | Webhook signing key for event verification | Mailgun → Sending → Webhooks → Signing key |
| `MAILGUN_REGION` | (Optional) Set to `EU` for EU region | Omit for US (default) |
| `APP_URL` | (Optional) Fallback for unsubscribe links if not set in Settings → Organization | e.g. `https://your-app.com` |
| `BEE_CLIENT_ID` | BeeFree email editor client ID | [BeeFree Dashboard](https://developers.beefree.io/) |
| `BEE_CLIENT_SECRET` | BeeFree email editor secret | [BeeFree Dashboard](https://developers.beefree.io/) |

> **Note**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

### Step 3: Email Domain Setup (Mailgun)

1. Go to [Mailgun Dashboard](https://app.mailgun.com/app/sending/domains)
2. Add your sending domain (e.g., `mg.yourcompany.com`)
3. Add the DNS records (SPF, DKIM) they provide
4. Wait for verification (usually 5-30 minutes)
5. Set `MAILGUN_FROM` secret if you want a custom from address (e.g. `Your CRM <noreply@mg.yourcompany.com>`)
6. Configure webhooks for analytics: Sending → Webhooks → add URL `https://YOUR_PROJECT.supabase.co/functions/v1/mailgun-webhook` for Delivered, Opened, Clicks, Permanent Failures

---

## Critical Security Fixes

### Priority 1: Row Level Security (RLS)

**⚠️ CRITICAL**: Without RLS, any authenticated user can see ALL data in the database.

Create a new migration file and add these policies:

```sql
-- File: supabase/migrations/YYYYMMDD_add_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pool_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- OPTION A: Single-tenant (all authenticated users see all data)
-- Use this for single-company deployment

CREATE POLICY "Authenticated users can view candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete candidates"
  ON candidates FOR DELETE
  TO authenticated
  USING (true);

-- Repeat for all other tables...

-- OPTION B: Multi-tenant (users only see their organization's data)
-- Requires adding organization_id to all tables first
-- See "Multi-Tenancy Setup" section below
```

### Priority 2: Add Organization/Team Support (Multi-Tenancy)

If multiple companies will use the same deployment:

```sql
-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization memberships
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Add organization_id to all data tables
ALTER TABLE candidates ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE pipelines ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE talent_pools ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE campaigns ADD COLUMN organization_id UUID REFERENCES organizations(id);
-- ... add to all tables

-- Create RLS policies that filter by organization
CREATE POLICY "Users can only see their organization's candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

### Priority 3: Add Role-Based Access Control (RBAC)

Define what each role can do:

| Role | View | Create | Edit | Delete | Manage Team |
|------|------|--------|------|--------|-------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Member | ✅ | ✅ | ✅ | Own only | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |

Implementation requires:
1. Add role checking to RLS policies
2. Add role checking in frontend UI (hide buttons, etc.)
3. Create admin panel for role management

---

## Feature Completion Tasks

### Tier 1: Critical for Launch

| Feature | Current State | Work Required | Estimated Time |
|---------|---------------|---------------|----------------|
| **RLS Policies** | ❌ Missing | Write SQL policies for all tables | 2-4 hours |
| **Fix Settings Save** | ❌ UI only | Connect forms to `userService.updateProfile()` | 1-2 hours |
| **Email Domain Setup** | ❌ Hardcoded | Update edge function + verify domain | 1 hour |
| **Error Boundaries** | ❌ Missing | Add React error boundary component | 1-2 hours |
| **Environment Documentation** | ❌ Missing | Create .env.example file | 30 min |

### Tier 2: Important for Production

| Feature | Current State | Work Required | Estimated Time |
|---------|---------------|---------------|----------------|
| **Real Analytics** | ❌ Mock data | Create database queries, update components | 4-8 hours |
| **Real Activity Feed** | ❌ Mock data | Query recent activity from DB | 2-3 hours |
| **Real Pipeline Chart** | ❌ Mock data | Aggregate pipeline_candidates data | 2-3 hours |
| **Email Tracking Webhooks** | ✅ Mailgun | Webhooks update campaign_recipients (opened/clicked) | — |
| **Unsubscribe Handling** | ❌ Missing | Create unsubscribe endpoint + page | 3-4 hours |
| **Notes in Profile** | ⚠️ Service exists | Wire up UI to `communicationService` | 1-2 hours |
| **Communications in Profile** | ⚠️ Service exists | Wire up UI to `communicationService` | 1-2 hours |

### Tier 3: Nice to Have

| Feature | Current State | Work Required | Estimated Time |
|---------|---------------|---------------|----------------|
| **AI Copilot** | ❌ Mock | Integrate OpenAI/Claude API | 8-16 hours |
| **LinkedIn Integration** | ❌ Mock | LinkedIn OAuth + API integration | 16-24 hours |
| **Resume Upload** | ❌ Mock | Supabase Storage + PDF viewer | 4-6 hours |
| **Bulk Import (CSV)** | ❌ Missing | File upload + parsing + validation | 6-8 hours |
| **Data Export** | ❌ Missing | Generate CSV/Excel downloads | 4-6 hours |
| **2FA** | ❌ Mock | Supabase Auth MFA setup | 4-6 hours |
| **Audit Logging** | ❌ Missing | Create audit_logs table + triggers | 6-8 hours |

---

## Infrastructure Setup

### Supabase Project Setup

1. **Create Project**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose region closest to your users
   - Save the generated password securely

2. **Run Database Migrations**
   ```bash
   # Install Supabase CLI if not installed
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link to your project
   supabase link --project-ref your-project-id

   # Run all migrations
   supabase db push
   ```

3. **Deploy Edge Functions**
   ```bash
   # Deploy all functions
   supabase functions deploy beefree-auth
   supabase functions deploy send-campaign-email
   ```

4. **Set Edge Function Secrets**
   ```bash
   supabase secrets set MAILGUN_API_KEY=key-xxxxx
   supabase secrets set MAILGUN_DOMAIN=mg.yourcompany.com
   supabase secrets set MAILGUN_WEBHOOK_SIGNING_KEY=your-signing-key
   supabase secrets set BEE_CLIENT_ID=your-client-id
   supabase secrets set BEE_CLIENT_SECRET=your-secret
   ```

### Mailgun Email Setup

1. Create account at [mailgun.com](https://www.mailgun.com)
2. Add and verify your sending domain in [Mailgun Domains](https://app.mailgun.com/app/sending/domains)
3. Copy API key and domain to Supabase secrets
4. Configure webhooks for analytics (Sending → Webhooks):
   - Webhook URL: `https://YOUR_PROJECT.supabase.co/functions/v1/mailgun-webhook`
   - Events: Delivered, Opened, Clicks, Permanent Failures
   - Copy the Signing key to `MAILGUN_WEBHOOK_SIGNING_KEY` secret

### BeeFree Email Editor Setup

1. Create account at [beefree.io](https://beefree.io)
2. Create an application in developer portal
3. Copy Client ID and Secret to Supabase secrets
4. Configure allowed origins for your domain

---

## Deployment Steps

### Option A: Webflow Cloud (Next.js)

This project is now a **Next.js 15** app ( migrated from Vite ) for Webflow Cloud deployment.

1. **Build the Application**
   ```bash
   npm install
   npm run build
   ```

2. **Webflow Cloud setup**
   - Connect your GitHub repo in Webflow Cloud
   - Create an environment with mount path (e.g. `/app`)
   - Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (for jobs sync)
   - For base path: `BASE_URL` and `ASSETS_PREFIX` (set by Webflow)
   - Webflow uses OpenNext + Cloudflare Workers; see `webflow.json` and `open-next.config.ts`

3. **Configure Environment**
   - Webflow doesn't support runtime env vars
   - Environment variables are baked in at build time
   - Use different `.env` files for staging/production
   - Build separately for each environment

4. **Configure CORS in Supabase**
   - Go to Supabase Dashboard → Settings → API
   - Add your Webflow domain to allowed origins:
     - `https://your-site.webflow.io`
     - `https://yourdomain.com`

### Option B: Alternative Hosting (Vercel/Netlify)

If you need server-side rendering or better env var handling:

**Vercel:**
```bash
npm install -g vercel
vercel
# Follow prompts, set environment variables in dashboard
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
# Set environment variables in Netlify dashboard
```

---

## Post-Deployment

### Verification Checklist

- [ ] Can create new user account
- [ ] Can login with existing account
- [ ] Can create/edit/delete candidates
- [ ] Can create/edit/delete pipelines
- [ ] Can create/edit/delete talent pools
- [ ] Can create campaigns
- [ ] Can open BeeFree email editor
- [ ] Can send test campaign email
- [ ] Dashboard loads with real metrics
- [ ] Settings page saves changes

### Monitoring Setup (Recommended)

1. **Supabase Dashboard**
   - Monitor database usage
   - Check Edge Function logs
   - Review API usage

2. **Error Tracking (Optional)**
   - Set up Sentry for frontend errors
   - Add to main.tsx:
   ```typescript
   import * as Sentry from "@sentry/react";
   Sentry.init({ dsn: "your-sentry-dsn" });
   ```

3. **Analytics (Optional)**
   - Add Plausible, Fathom, or Google Analytics
   - Track page views and key actions

### Backup Strategy

1. Enable Supabase Point-in-Time Recovery (Pro plan)
2. Set up daily database exports
3. Store backups in separate cloud storage

---

## Quick Reference

### Project Structure
```
/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Route pages
│   ├── hooks/          # React Query hooks
│   ├── services/       # Database service layer
│   ├── types/          # TypeScript types
│   ├── integrations/   # Supabase client
│   └── config/         # App configuration
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # Database migrations
├── public/             # Static assets
└── dist/               # Build output (gitignored)
```

### Key Files to Modify
| File | Purpose |
|------|---------|
| `.env` | Environment variables |
| `src/integrations/supabase/client.ts` | Supabase connection |
| `src/config/backend.config.ts` | Backend configuration |
| `supabase/functions/send-campaign-email/index.ts` | Email sending |
| `supabase/functions/beefree-auth/index.ts` | Email editor auth |

### Useful Commands
```bash
# Development
npm run dev              # Start dev server on port 8080

# Building
npm run build            # Production build
npm run build:dev        # Development build

# Supabase
supabase start           # Start local Supabase
supabase db push         # Push migrations
supabase functions serve # Test Edge Functions locally
supabase functions deploy # Deploy Edge Functions

# Database
supabase db reset        # Reset local database
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Jobs Sync (Career Site)

Jobs sync from the client's career site (Webflow CMS) to Supabase every 15 minutes. Full details: [docs/JOBS_SYNC_SETUP.md](docs/JOBS_SYNC_SETUP.md).

### Per-Client Checklist

| Step | Action |
|------|--------|
| 1 | Run `supabase db push` (migrations include `jobs`, `jobs_sync_logs`) |
| 2 | Generate `CRON_SECRET`: `openssl rand -hex 32` |
| 3 | Add env vars to Webflow Cloud: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` |
| 4 | Configure Career Site in app: Settings → Career Site (collection ID, API token, base URL) |
| 5 | Choose cron trigger (see below) |

### Cron Trigger Options (Webflow Cloud)

**Webflow Cloud does not run Vercel cron.** Use one of:

| Option | Description |
|--------|-------------|
| **Supabase Cron** (recommended) | Native pg_cron + pg_net. Runs in Supabase, POSTs to your app. No external service. |
| **cron-job.org** | Free third-party. 15+ years, 500k+ users. No SLA. Good for non-critical jobs. |

**App URL:** Full base URL including mount path, e.g. `https://client-site.webflow.io/app` (if mount path is `/app`). Cron endpoint: `{APP_URL}/api/cron/sync-jobs`.

**Supabase Cron setup:** See [docs/JOBS_SYNC_SETUP.md](docs/JOBS_SYNC_SETUP.md) for SQL (enable pg_cron/pg_net, store secrets in Vault, create cron job).

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Mailgun Docs**: https://documentation.mailgun.com/docs/mailgun
- **BeeFree Docs**: https://docs.beefree.io
- **React Query**: https://tanstack.com/query
- **Shadcn/UI**: https://ui.shadcn.com

---

*Last Updated: February 2026*
*Version: 1.0*



