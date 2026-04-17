# Campaign System — Full Email Marketing Audit

**Date:** March 2025

This audit evaluates the campaign system against true email marketing platform standards.

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Campaign creation & builder** | OK | Full flow: details, template, sequence, audience, review |
| **Drip sequences** | OK | Multi-step, 5 cadence types, scheduling |
| **Sending & scheduling** | OK | Immediate, scheduled, cron automation |
| **Tracking (opens/clicks)** | OK | Mailgun webhook, realtime stats |
| **Unsubscribe** | Partial | Per-campaign only; no global list |
| **List hygiene** | Partial | Bounce/complain filtered at send; not at audience selection |
| **Pause behavior** | OK | Drip stops when paused; resumes when campaign resumed |
| **Webhook delivered** | Bug | Can overwrite opened/clicked status |
| **CAN-SPAM** | Partial | Unsubscribe link present; no physical address in footer |

---

## 1. Campaign Builder & User Flow

### Steps (OK)

| Step | Component | Status |
|------|-----------|--------|
| Details | Name, type, goal, folder, job | OK |
| Template | TemplateLibrary, HtmlCampaignEmailEditor | OK |
| Sequence | SequenceBuilder — cadence, dates | OK |
| Audience | Talent pools, pipelines, lead status | OK |
| Review | Summary, test email, launch/schedule | OK |

### Merge Tags (OK)

- Candidate: firstName, lastName, fullName, email, company, title, skills, location, source, linkedinUrl
- Sender: senderName, senderTitle, senderCompany, senderBrand, senderEmail, senderLinkedinUrl
- Campaign: campaignName, currentDate, currentTime
- Job: jobTitle, jobDepartment, jobLocation, jobType, jobDescription, jobUrl
- Unsubscribe: {{unsubscribeLink}}

### Cadence Types (OK)

- Custom (per-step delay)
- Daily, Weekly, Monthly (recurrence + time)
- Specific dates (exact date per step)
- End-on-date for recurrence

---

## 2. Sending & Scheduling

### Flows (OK)

| Flow | Trigger | Behavior |
|------|---------|----------|
| Launch now | CampaignBuilder, Campaigns list | Step 1 sent immediately; step 2+ queued in scheduled_emails |
| Schedule for later | CampaignBuilder | Step 1 queued; cron sends at time |
| Add recipients | AddRecipientsModal | New recipients get step 1 immediately |
| Cron (hourly) | pg_cron | Processes due scheduled_emails + active campaigns with pending recipients |

### Cron Automation (OK)

- Hourly at minute 0
- Processes scheduled_emails (drip step 2+)
- Processes active campaigns with pending recipients (step 1 stragglers)
- 300ms delay between sends

---

## 3. Tracking & Analytics

### Metrics (OK)

- Recipients, pending, sent, scheduled
- Opened, clicked, responded
- Open rate, click rate, response rate
- Realtime updates via Postgres subscription

### Webhook Events (OK)

| Event | campaign_recipients update |
|-------|----------------------------|
| opened | opened_at, status → opened |
| clicked | clicked_at, status → clicked |
| complained | status → complained |
| unsubscribed | status → unsubscribed |
| permanent_fail | status → bounced |
| temporary_fail / failed | status → failed |
| rejected | status → rejected |

### Response Tracking (OK)

- mailgun-inbound parses replies
- Looks up by In-Reply-To → message_id
- Sets status → responded

---

## 4. Unsubscribe & List Hygiene

### Unsubscribe (Partial)

| Aspect | Implementation | Gap |
|--------|-----------------|-----|
| Link in email | Appended to footer | OK |
| Unsubscribe page | /unsubscribe?r={recipientId} | OK |
| Scope | Per campaign_recipient | No global "unsubscribe from all" |
| Honor at send | processScheduledEmail + sendOneEmail skip unsubscribed | OK |

**Gap:** Unsubscribing from Campaign A does not prevent being added to Campaign B. True email marketing often has a global suppression list.

### Bounce & Complain (Partial)

| Aspect | Implementation | Gap |
|--------|-----------------|-----|
| At send | Skip unsubscribed, bounced, complained | OK |
| At audience selection | getFilteredCandidates does NOT exclude | Candidates who bounced/complained in other campaigns can be added |
| scheduled_emails | processScheduledEmail cancels row if recipient unsubscribed/bounced/complained | OK |

**Gap:** When building audience for a new campaign, we don't exclude candidates who have unsubscribed, bounced, or complained in any previous campaign.

---

## 5. Critical Bugs

### Bug 1: Pause does not stop drip sends (High) — FIXED

**Location:** `send-campaign-email/index.ts` in `processScheduledEmail`

**Fix applied:** Before sending, fetch campaign and check status. If `campaign.status === 'paused'`, return early without sending. The `scheduled_email` stays pending and will be sent when the campaign is resumed.

### Bug 2: Webhook "delivered" overwrites opened/clicked (Medium)

**Location:** `supabase/functions/mailgun-webhook/index.ts` lines 137–142

**Issue:** For `delivered` events, we always set `status = 'sent'`. If `delivered` arrives after `opened` or `clicked`, it overwrites the more valuable status.

**Fix:** Only update status to `sent` when current status is `scheduled` or `pending`. If status is already `opened`, `clicked`, or `responded`, skip the status update (still update `sent_at` if not set).

---

## 6. Compliance & Best Practices

### CAN-SPAM

| Requirement | Status | Notes |
|-------------|--------|-------|
| Unsubscribe link | OK | In footer |
| Honor unsubscribes | OK | Skipped at send |
| Physical address | Missing | No company address in email footer |
| Clear identification | OK | From name, sender merge tags |

**Recommendation:** Add `organization_settings.physical_address` and include in email footer for CAN-SPAM compliance.

### GDPR (if applicable)

- Unsubscribe is one-click
- No explicit consent tracking in current schema
- Consider adding consent/opt-in fields if targeting EU

---

## 7. Feature Gaps vs. Full Email Marketing Platforms

| Feature | Status | Notes |
|---------|--------|-------|
| A/B testing | Missing | No subject/body variants |
| Send time optimization | Missing | No "best time to send" |
| Campaign analytics page | Partial | Stats in Campaigns view; no charts/time series |
| Global unsubscribe list | Missing | Per-campaign only |
| Suppression at audience selection | Missing | Don't exclude unsubscribed/bounced from other campaigns |
| Physical address in footer | Missing | CAN-SPAM |
| Pause stops drip | Bug | See Bug 1 |
| Delivered vs opened/clicked | Bug | See Bug 2 |

---

## 8. Recommended Fixes (Priority Order)

1. ~~**Pause stops drip**~~ — Fixed: `processScheduledEmail` checks campaign status, skips if paused
2. **Webhook delivered** — Only set status=sent when current status is scheduled/pending (user notes delivered typically comes first)
3. **Global suppression** — Exclude candidates with any campaign_recipient status in (unsubscribed, bounced, complained) when building audience for new campaigns
4. **Physical address** — Add to org settings and email footer for CAN-SPAM
5. **Campaign analytics** — Add charts (sends over time, open/click rates) to Analytics page

---

## 9. Verification Checklist

| Scenario | Expected | Status |
|----------|----------|--------|
| Launch → step 1 sent | Immediate | OK |
| Launch → step 2+ queued | scheduled_emails | OK |
| Cron sends step 2+ | At scheduled time | OK |
| Schedule for later | Queued, cron sends | OK |
| Pause campaign | Drip stops | OK |
| Unsubscribe link | Works, marks unsubscribed | OK |
| Unsubscribed at send | Skipped | OK |
| Bounced at send | Skipped | OK |
| Add recipients to active | Step 1 sent | OK |
| Open/click tracking | Webhook updates | OK (delivered bug) |
| Response tracking | Inbound → responded | OK |
| Cancel scheduled send | scheduled_emails cancelled | OK |
| Cancel campaign schedule | All cancelled | OK (fixed) |
| Reschedule | Recipients found | OK (fixed) |
