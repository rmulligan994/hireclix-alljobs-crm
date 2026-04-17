# Campaign Scheduling — Complete Audit

**Last updated:** March 2025

This document provides a full audit of the campaign scheduling system, from UI through database to email delivery.

**Audit (March 2025):** Fixed critical bug — CampaignBuilder `handleLaunchCampaign` now invokes `send-campaign-email`. Added `scheduled` to CampaignRecipient status type. Added query invalidation for campaigns and scheduled-emails on launch/schedule.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (CampaignBuilder)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Details → Template → Editor → Sequence → Audience → Review                      │
│                                                                                  │
│  Sequence step:                                                                  │
│  • When: "Send immediately" | "Schedule for later" (date + time)                 │
│  • Cadence: Custom | Daily | Weekly | Monthly | Specific dates                   │
│  • End on date (daily/weekly/monthly only)                                       │
│  • Email steps (1 for daily/weekly/monthly; N for custom/specific_dates)         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │ Launch now          │ Schedule for later │
                    ▼                     ▼                    │
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ send-campaign-email          │  │ send-campaign-email           │
│ { campaignId }               │  │ { campaignId, scheduledAt }   │
│                              │  │                               │
│ • Send step 1 immediately    │  │ • Insert scheduled_emails     │
│ • insertNextDripStep for     │  │   (step 1, scheduled_at)      │
│   each recipient             │  │ • Update campaign_recipients  │
│ • Queue step 2+ in           │  │   → scheduled                 │
│   scheduled_emails           │  │ • Update campaigns → scheduled │
└──────────────────────────────┘  └──────────────────────────────┘
                    │                     │
                    └───────────────────┬─┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CRON (hourly, minute 0)                                  │
│  process-scheduled-emails                                                        │
│  • SELECT scheduled_emails WHERE status=pending AND scheduled_at <= now           │
│  • For each: invoke send-campaign-email { scheduledEmailId }                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  processScheduledEmail (send-campaign-email)                                      │
│  • Check recipient not unsubscribed → else cancel scheduled_email                 │
│  • sendOneEmail (Mailgun API)                                                     │
│  • Update scheduled_emails → sent                                                 │
│  • insertNextDripStep (queue next step)                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### campaigns
| Column | Type | Purpose |
|--------|------|---------|
| scheduled_at | timestamptz | When first email sends (for "schedule for later") |
| schedule_recurrence | jsonb | `{ type, dayOfWeek?, dayOfMonth?, time?, endOnDate? }` for drip timing |
| status | text | draft \| scheduled \| active \| paused \| completed |

### campaign_emails
| Column | Type | Purpose |
|--------|------|---------|
| step_order | int | 1, 2, 3... |
| delay_days | int | Used for custom cadence; daily=1, weekly=7, monthly=30 |
| delay_hours | int | Used for custom cadence |
| subject, html_content, compose_kind, form_payload | - | Email content |

### scheduled_emails
| Column | Type | Purpose |
|--------|------|---------|
| campaign_id, campaign_email_id, campaign_recipient_id | uuid | References |
| scheduled_at | timestamptz | When to send |
| status | text | pending \| sent \| failed \| cancelled |
| UNIQUE(campaign_id, campaign_recipient_id, campaign_email_id) | - | One row per recipient per step |

### campaign_recipients
| Column | Type | Purpose |
|--------|------|---------|
| status | text | pending \| scheduled \| sent \| opened \| clicked \| unsubscribed \| bounced \| etc. |

---

## 3. Scheduling Logic (insertNextDripStep)

**When:** After sending any drip step (except the last).

**Next scheduled_at computation:**

| schedule_recurrence.type | Logic |
|-------------------------|-------|
| **daily** | Tomorrow at `recurrence.time` (e.g. 09:00) |
| **weekly** | Next occurrence of `dayOfWeek` (0=Sun..6=Sat) at `recurrence.time` |
| **monthly** | Next occurrence of `dayOfMonth` (1-31) at `recurrence.time` |
| **custom** / none | `now + delay_days + delay_hours` from campaign_emails |

**endOnDate:** If set, next step is not scheduled if `scheduled_at > endOnDate`.

---

## 4. Migrations Checklist

| Migration | Purpose |
|-----------|---------|
| 20260304120001_scheduled_emails.sql | Creates scheduled_emails table, RLS |
| 20260304120004_process_scheduled_emails_cron.sql | trigger_process_scheduled_emails(), pg_cron job |
| 20260305120000_cron_hourly.sql | Changes cron from daily to hourly |
| 20260306120000_campaign_schedule_recurrence.sql | Adds schedule_recurrence JSONB to campaigns |

**Required setup:**
- pg_cron, pg_net extensions enabled
- Vault secret: `supabase_anon_key` (anon key for edge function auth)

---

## 5. Edge Functions

| Function | Invoked by | Purpose |
|----------|------------|---------|
| send-campaign-email | CampaignBuilder (Launch/Schedule), process-scheduled-emails (cron) | Send emails, queue drip steps |
| process-scheduled-emails | pg_cron (hourly) | Fetch due scheduled_emails, invoke send-campaign-email per row |
| send-campaign-test-email | CampaignBuilder (Send test) | Send test email to current user |
| mailgun-webhook | Mailgun | Update campaign_recipients on open/click/unsubscribe/bounce |
| unsubscribe | User click | Mark campaign_recipient unsubscribed |

---

## 6. Service Layer (campaignService)

| Method | Purpose |
|--------|---------|
| create / update | Campaign CRUD; schedule_recurrence only included when provided |
| getScheduledEmails | Pending scheduled_emails + fallback for campaigns with status=scheduled |
| cancelScheduledSend | Mark scheduled_emails cancelled for campaign+email+date |
| cancelCampaignSchedule | Set campaign status=draft, scheduled_at=null |

---

## 7. Verification Checklist

### Launch now
- [x] Campaign created with status active
- [x] campaign_emails saved
- [x] campaign_recipients added with status pending
- [x] Step 1 sent immediately via Mailgun (CampaignBuilder invokes send-campaign-email)
- [x] Step 2+ inserted into scheduled_emails with correct scheduled_at
- [x] For daily/weekly/monthly: scheduled_at aligns to recurrence time

### Schedule for later
- [ ] Campaign created/updated with status scheduled, scheduled_at set
- [ ] schedule_recurrence saved when provided
- [ ] One scheduled_emails row per recipient (step 1) with scheduled_at
- [ ] campaign_recipients updated to status scheduled
- [ ] Cron picks up at scheduled time and sends
- [ ] insertNextDripStep queues step 2 (if multi-step)

### Upcoming Sends
- [ ] Shows scheduled_emails with status pending, scheduled_at >= startOfToday
- [ ] Fallback shows campaigns with status=scheduled when no scheduled_emails
- [ ] Displays "Email N of M", schedule_label when schedule_recurrence present
- [ ] Cancel works for both queued and campaign-level items

### Unsubscribe / Bounced / endOnDate
- [ ] processScheduledEmail skips unsubscribed/bounced/complained, marks scheduled_email cancelled
- [ ] sendOneEmail returns error if recipient unsubscribed/bounced/complained
- [ ] insertNextDripStep does not schedule past endOnDate

---

## 8. Known Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Bounced/complained filtered | ✅ | processScheduledEmail and sendOneEmail now skip these |
| schedule_recurrence column may not exist | Low | Migration must run; create/update omits it when undefined |
| Cron runs at minute 0 | Info | Sends scheduled for 9:15 process at 10:00 |
| Mailgun webhook 401 | High | Deploy mailgun-webhook with --no-verify-jwt |

---

## 9. Testing Commands

```bash
# Apply migrations
supabase db push

# Deploy edge functions
supabase functions deploy send-campaign-email
supabase functions deploy process-scheduled-emails

# Manually trigger cron (for testing)
# In Supabase SQL editor:
SELECT public.trigger_process_scheduled_emails();
```

---

## 10. Data Flow Summary

| User Action | DB Changes | Edge Function |
|-------------|------------|---------------|
| Launch now | campaign (active), campaign_emails, campaign_recipients (pending→sent), scheduled_emails (step 2+) | send-campaign-email |
| Schedule for later | campaign (scheduled, scheduled_at), campaign_recipients (scheduled), scheduled_emails (step 1) | send-campaign-email |
| Cron runs | scheduled_emails (pending→sent), campaign_recipients (sent), communications, scheduled_emails (step 2+) | process-scheduled-emails → send-campaign-email |
| Cancel send | scheduled_emails (cancelled) or campaign (draft) | campaignService |
