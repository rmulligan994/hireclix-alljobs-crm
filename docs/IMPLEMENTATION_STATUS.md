# Implementation Status & Plan

This document tracks partially and not-implemented features, with difficulty levels and proposed implementation plans.

---

## 1. Security Setup

| Item | Status | Difficulty | Plan |
|------|--------|------------|------|
| **Data access policies (user-scoped)** | Partial – many tables use `USING (true)` | **Medium** | Add `organization_id` or `user_id` to tables that need scoping. Update RLS policies to `auth.uid() = user_id` or `organization_id = (SELECT org_id FROM profiles WHERE user_id = auth.uid())`. Add migrations and test with multiple users. |
| **Email configuration** | Unknown | **Easy** | In Supabase Dashboard → Authentication → Email Templates, set sender domain and templates. In Mailgun, verify domain and configure DNS. |
| **API keys** | Unknown | **Easy** | In Supabase Dashboard → Project Settings → API, confirm keys. Add AI/third-party keys to Supabase Secrets or env vars. |

---

## 2. Bug Fixes

| Item | Status | Difficulty | Plan |
|------|--------|------------|------|
| **Talent pool saving** | Partial – Edit Pool not wired | **Easy** | Add `EditTalentPoolDialog` (or inline edit) that uses `useUpdateTalentPool`. Wire the "Edit Pool" button in `TalentPoolDetail.tsx` to open it. Pass `pool.name` and `pool.description` as initial values. |
| **Settings Save buttons** | Partial – Profile & Org only | **Medium** | **Notifications:** Add `notification_preferences` table and `useNotificationPreferences` hook; wire Switches to state and Save to mutation. **Pipeline:** Add `pipeline_stages` or `organization_settings.sla_config`; wire SLA inputs and Save. **Templates:** Persist custom templates to DB or keep local-only and document. **Security:** Wire password change to `supabase.auth.updateUser({ password })`. **Team:** Implement invite flow (see Team invitations below). |
| **Error handling (friendly crash screen)** | Not implemented | **Easy** | Create `ErrorBoundary.tsx` with `componentDidCatch`, render friendly message + "Try again" / "Go home". Wrap app in `main.tsx` or `layout.tsx` with `<ErrorBoundary>`. |

---

## 3. Dashboard Connections

| Item | Status | Difficulty | Plan |
|------|--------|------------|------|
| **Activity feed** | Placeholder data | **Medium** | Create `useRecentActivity()` that aggregates: new candidates, pipeline stage changes, campaign opens/clicks, notes, communications. Query `candidates`, `pipeline_candidates`, `campaign_recipients`, `notes`, `communications` with `ORDER BY created_at DESC LIMIT 20`. Map to unified activity type and render in `ActivityFeed.tsx`. |
| **Pipeline chart** | Placeholder data | **Easy** | Add `usePipelineStats()` that aggregates `pipeline_candidates` by stage (or by pipeline + stage). Return `{ stage, count }[]`. Replace hardcoded `pipelineData` in `PipelineChart.tsx` with this hook. |

---

## 4. Analytics Page

| Item | Status | Difficulty | Plan |
|------|--------|------------|------|
| **Source tracking** | ✅ Done | **Medium** | `useSourceStats()` groups candidates by `source`. `Analytics.tsx` uses real data from `analyticsService.getSourceStats()`. |
| **Conversion funnel** | ✅ Done | **Medium** | `useConversionFunnel()` aggregates `pipeline_candidates` by stage. Real data from `analyticsService.getConversionFunnel()`. |
| **Timeline charts** | ✅ Done | **Medium** | `useHiringTimeline()` groups by month (candidates created, hired from pipeline stages). Real data from `analyticsService.getHiringTimeline()`. |
| **Date filtering** | ✅ Done | **Easy** | Date preset buttons (Last 7/30/90 days, All Time). `dateRange` passed to all analytics hooks. |
| **Export reports** | Not implemented | **Medium** | Add `exportAnalytics(dateRange)` that fetches analytics data and builds CSV/Excel (e.g. via `papaparse` or `xlsx`). Trigger download from "Export Report" button. |

---

## 5. Settings and Team Features

| Item | Status | Difficulty | Plan |
|------|--------|------------|------|
| **Team invitations** | Not implemented | **Hard** | Add `invitations` table (email, role, token, expires_at, invited_by). Create `invite-user` edge function that sends invite email with magic link or token. Add "Invite Team Member" flow: form → edge function → email. Add invite-accept page that creates user + profile. |
| **Notification preferences** | Not implemented | **Medium** | Add `notification_preferences` table (user_id, email_notifications, campaign_updates, pipeline_alerts, ai_recommendations). Add `useNotificationPreferences` hook. Wire Settings switches to this hook and Save button to mutation. |
| **Pipeline deadlines (SLA)** | Not implemented | **Medium** | Add `sla_days` (or similar) to pipeline stages or `organization_settings`. Add UI in Settings → Pipeline to edit SLA per stage. Persist via `updateOrgSettings` or a new `updatePipelineStages` mutation. Use for alerts (optional). |

---

## 6. Deployment and Testing

| Item | Status | Difficulty | Plan |
|------|--------|------------|------|
| **Build verification** | Unknown | **Easy** | Run `npm run build` (or `pnpm build`) and fix any errors. Add to CI if applicable. |
| **Environment setup** | Partial | **Easy** | Document required env vars in `DEPLOYMENT_GUIDE.md`. Use `.env.example` and ensure production env is set in Webflow/Supabase. |
| **Webflow deployment** | Unknown | **Easy** | Follow Webflow Cloud docs: connect repo, set build command and output dir, configure env vars. |
| **Supabase production** | Unknown | **Easy** | Run migrations on production DB. Deploy edge functions. Verify RLS and functions in production. |
| **E2E testing** | Not implemented | **Medium** | Add Playwright or Cypress. Write flows for: sign-in, add candidate, create campaign, unsubscribe. Run in CI. |
| **Performance check** | Unknown | **Easy** | Use Lighthouse or similar. Fix critical issues (e.g. large bundles, slow queries). |

---

## 7. Miscellaneous

| Item | Status | Difficulty | Plan |
|------|--------|------------|------|
| **Password reset page** | Not implemented | **Easy** | Add `src/app/reset-password/page.tsx` that reads token from URL, shows new-password form, calls `supabase.auth.updateUser({ password })`. Handle success/error and redirect. |
| **Input validation on Auth forms** | Minimal | **Easy** | Add zod (or similar) schema for sign-up: email format, password length (e.g. 8+), strength rules. Validate on submit and show field-level errors. |
| **Supabase client init error handling** | Partial | **Easy** | In `client.ts`, if `NEXT_PUBLIC_SUPABASE_URL` is placeholder in production, throw or log a clear error. Optionally show a banner when using placeholder config. |
| **Console.log cleanup** | Not done | **Easy** | Search for `console.log`/`console.warn`/`console.error` in `src` and edge functions. Remove or replace with a logger that is no-op in production. |
| **Branding inconsistency** | Mixed | **Easy** | Choose one brand (e.g. "Project Beacon" or "HireClix CRM"). Replace all references in Auth, Sidebar, layout, docs, and email defaults. Update `noreply@` fallback in `send-campaign-email` to match. |

---

## Summary by Difficulty

| Difficulty | Count | Items |
|------------|-------|-------|
| **Easy** | 14 | Email config, API keys, talent pool edit, ErrorBoundary, pipeline chart, date filtering, build verification, env setup, Webflow deploy, Supabase prod, performance, password reset page, auth validation, Supabase init, console cleanup, branding |
| **Medium** | 12 | Data access policies, Settings Save buttons, activity feed, source tracking, conversion funnel, timeline charts, export reports, notification preferences, pipeline deadlines, E2E testing |
| **Hard** | 1 | Team invitations |

---

## Suggested Implementation Order

1. **Quick wins (Easy, ~1–2 days):** ErrorBoundary, password reset page, pipeline chart, talent pool edit, auth validation, console cleanup, branding, build verification.
2. **Settings and data (Medium, ~3–5 days):** Notification preferences, pipeline deadlines, Settings Save buttons, activity feed, source tracking, conversion funnel, timeline charts, date filtering, export.
3. **Security and deployment (Easy–Medium, ~2–3 days):** Data access policies, email/API config, env setup, Webflow/Supabase deployment, performance.
4. **Advanced (Hard, ~4–6 hours):** Team invitations.
5. **Quality (Medium, ongoing):** E2E tests, Supabase init handling.
