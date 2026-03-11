# Campaign Email — Data Flow & Audit

## Overview

This document describes how campaign emails flow through the system, what data is saved where, and current gaps.

**See also:** [CAMPAIGN_SCHEDULING_AUDIT.md](./CAMPAIGN_SCHEDULING_AUDIT.md) for a complete scheduling system audit.

---

## 0. Scheduled Emails & Cron

**scheduled_emails** — Queue of emails to send. One row per (campaign, recipient, step). Rows have `scheduled_at` (when to send) and `status` (pending/sent/failed/cancelled). Unique on (campaign_id, campaign_recipient_id, campaign_email_id).

**Cron** — Runs **hourly** (at minute 0). Calls `process-scheduled-emails` edge function, which:
1. Fetches pending `scheduled_emails` where `scheduled_at <= now` (limit 100 per run); for each, invokes `send-campaign-email` with `scheduledEmailId`
2. Finds active campaigns with `campaign_recipients` status `pending` (step 1 not yet sent); for each, invokes `send-campaign-email` with `campaignId` to send step 1
3. `processScheduledEmail` sends via Mailgun, updates status to sent/failed, then calls `insertNextDripStep` for multi-step campaigns

**Backend flow (schedule for later)**:
1. User clicks "Schedule Campaign" → CampaignBuilder invokes `send-campaign-email` with `{ campaignId, scheduledAt }`
2. `processCampaignSend` inserts one `scheduled_emails` row per recipient (step 1) with `scheduled_at`
3. Updates `campaign_recipients` to `status: 'scheduled'`, `campaigns` to `status: 'scheduled'`
4. Cron picks up due rows; `processScheduledEmail` sends each, then `insertNextDripStep` queues step 2 (respects `schedule_recurrence.endOnDate`)

**Backend flow (launch now)**:
1. User clicks "Launch" → invokes `send-campaign-email` with `{ campaignId }` (no scheduledAt)
2. `processCampaignSend` immediately sends step 1 to each recipient, calls `insertNextDripStep` for each
3. Step 2+ are queued in `scheduled_emails`. For daily/weekly/monthly, `scheduled_at` aligns to recurrence (e.g. next Wednesday 9am). For custom, uses `delay_days`/`delay_hours`.

**Upcoming Sends** — Shows pending rows with `scheduled_at >= startOfToday`, plus fallback for campaigns with `status='scheduled'` and future `scheduled_at` (in case edge function insert failed). See `campaignService.getScheduledEmails()`.

---

## 1. Campaign Send Flow

```
User clicks "Launch" → send-campaign-email invoked → Mailgun API → Emails sent
                                    ↓
                    campaign_recipients updated (status, sent_at, message_id)
                    communications inserted (activity log)
```

### Filtering for Sending

**Current behavior** (`send-campaign-email/index.ts`):
- Fetches recipients with `status = 'pending'` only (immediate send)
- Skips candidates with no email address
- **Unsubscribed/Bounced/Complained**: Before sending, checks `campaign_recipients.status`; if unsubscribed, bounced, or complained, marks scheduled_email as cancelled and skips. `sendOneEmail` also checks and returns error.

**Recipient selection** happens at campaign creation/scheduling:
- `CampaignBuilder` uses `audience_filter` (talent pools, pipelines, tags, locations, sources)
- `campaignService.getFilteredCandidates()` applies the filter
- `addRecipients` inserts into `campaign_recipients` with `status: 'pending'`

### Data Saved on Send

| Table | Fields Updated/Inserted |
|-------|-------------------------|
| `campaign_recipients` | `status` → "sent", `sent_at`, `message_id` (Mailgun ID) |
| `communications` | New row: `candidate_id`, `type`, `subject`, `content`, `direction`, `occurred_at`, `campaign_recipient_id`, `external_message_id` |
| `campaigns` | `status` → "active" (if was draft/scheduled) |

---

## 2. Mailgun Webhook Flow

```
Mailgun event (opened/clicked/etc) → POST to mailgun-webhook → campaign_recipients updated
```

### Webhook URL

```
https://xvkeruwiravjnzikrtkp.supabase.co/functions/v1/mailgun-webhook
```

### 401 "Missing authorization header"

Mailgun does **not** send an `Authorization` header. Supabase's gateway returns 401 before the request reaches the function if JWT verification is enabled.

**Fix:** Deploy with `--no-verify-jwt` explicitly:

```bash
supabase functions deploy mailgun-webhook --no-verify-jwt
```

If the function was previously deployed with JWT enabled, the config may not apply on update. Delete the function in the Supabase Dashboard and redeploy, or redeploy with the flag.

### Webhook Security

- **MAILGUN_WEBHOOK_SIGNING_KEY** must be set (from Mailgun → Sending → Webhooks)
- The function verifies the HMAC-SHA256 signature before processing
- Without the key, verification is skipped (less secure)

### Event → Database Updates

| Mailgun Event | campaign_recipients Update |
|---------------|---------------------------|
| opened | `opened_at`, `status` → "opened" |
| clicked | `clicked_at`, `status` → "clicked" |
| complained | `status` → "complained" |
| unsubscribed | `status` → "unsubscribed" |
| permanent_fail | `status` → "bounced" |
| temporary_fail / failed | `status` → "failed" |
| rejected | `status` → "rejected" |
| accepted, delivered | No update |

### Correlation (finding the recipient)

1. **Primary:** `v:recipient_id` custom variable (we pass this when sending)
2. **Fallback:** `message_id` lookup in `campaign_recipients` (from Mailgun response)

---

## 3. Data Alignment Check

| Expectation | Implementation | Status |
|-------------|-----------------|--------|
| Campaign sends only to pending | `.eq("status", "pending")` in query | ✅ |
| Communications logged for sends | Insert to `communications` on send | ✅ |
| Opened/clicked tracked | Webhook updates `opened_at`, `clicked_at` | ✅ (when webhook works) |
| Campaign stats reflect opens | `useCampaignStats` counts status in (opened, clicked, responded) | ✅ |
| Unsubscribed/bounced/complained filtered | `processScheduledEmail` + `sendOneEmail` check status | ✅ |

---

## 4. Gaps & Recommendations

### High Priority

1. **Webhook 401** — Deploy `mailgun-webhook` with `--no-verify-jwt` so Mailgun can reach it.
2. **Unsubscribe filtering** — ✅ Implemented. `processScheduledEmail` and `sendOneEmail` check recipient status; unsubscribed are skipped/cancelled.
3. **Bounce filtering** — ✅ Implemented. processScheduledEmail and sendOneEmail skip bounced/complained.

### Medium Priority

4. **Complained filtering** — Exclude `status = 'complained'` from sends.
5. **Unsubscribe link** — Add `{{unsubscribeLink}}` to templates; implement unsubscribe page/endpoint.

### Merge Tags (Template Data)

| Tag | Source |
|-----|--------|
| firstName, lastName, fullName, email, company, title, skills, location, source, linkedinUrl | Candidate |
| campaignName, currentDate, currentTime | Campaign / System |
| senderName, senderEmail | Campaign owner's profile |
| senderCompany, senderBrand | Organization settings |
| unsubscribeLink | base_url + /unsubscribe?r={recipientId} |

Set **Base URL** in Settings → Organization for unsubscribe links to work.

### Schema Notes

- `campaign_recipients.message_id` — Used for webhook fallback lookup
- `communications.campaign_recipient_id` — Links activity to campaign send
- `communications.external_message_id` — Mailgun message-id for reference
