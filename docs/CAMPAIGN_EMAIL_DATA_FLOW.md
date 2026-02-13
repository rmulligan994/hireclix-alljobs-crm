# Campaign Email — Data Flow & Audit

## Overview

This document describes how campaign emails flow through the system, what data is saved where, and current gaps.

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
- Fetches recipients with `status = 'pending'` only
- Skips candidates with no email address
- **Does NOT filter**: unsubscribed users, bounced addresses, complained users

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
| Unsubscribed filtered from sends | Not implemented | ❌ Gap |
| Bounced filtered from sends | Not implemented | ❌ Gap |

---

## 4. Gaps & Recommendations

### High Priority

1. **Webhook 401** — Deploy `mailgun-webhook` with `--no-verify-jwt` so Mailgun can reach it.
2. **Unsubscribe filtering** — Before sending, exclude `campaign_recipients` where `status = 'unsubscribed'`. Requires `unsubscribed_at` on candidates or filtering by status.
3. **Bounce filtering** — Exclude `status = 'bounced'` when selecting recipients.

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
