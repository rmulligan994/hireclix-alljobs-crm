# Campaigns Tab — Remaining Implementation Plan

This plan addresses the gaps identified in the campaign email implementation audit.

---

## Issue 1: Campaigns View Not Updated

**Status:** Not implemented  
**Priority:** High

The Campaigns view ([`src/views/Campaigns.tsx`](src/views/Campaigns.tsx)) still uses the old layout. The following need to be added:

### 1.1 Primary Tabs (My / Organization / Upcoming Sends / Archived)

| Tab | Data Source | Notes |
|-----|-------------|-------|
| **My Campaigns** | `campaignService.getMyCampaigns()` or filter `useCampaigns` by `user_id === auth.uid()` | Exclude archived |
| **Organization** | `campaignService.getOrgCampaigns()` or filter by `is_organization_campaign === true` | Exclude archived |
| **Upcoming Sends** | `campaignService.getScheduledEmails()` | New tab, new component |
| **Archived** | Filter campaigns where `archived_at !== null` | Add to `getAll` or new query |

**Implementation:**
- Add `scopeTab` state: `'my' | 'org' | 'upcoming' | 'archived'`
- Create `useMyCampaigns`, `useOrgCampaigns`, `useScheduledEmails` hooks (or extend `useCampaigns` with scope param)
- Render different content per tab; keep secondary status tabs (All, Active, etc.) within My/Org

### 1.2 Search Bar

- **Component:** `CampaignSearchBar` or inline `Input` with debounce
- **Placement:** Above campaign list, below primary tabs
- **Logic:** Client-side filter on `name`, `type`, `goal` (e.g. `campaigns.filter(c => searchRegex.test(c.name) || ...)`)
- **Debounce:** 300ms

### 1.3 Type Filter Chips

- **Options:** All types | Nurture | Job Alert | Event | Re-engagement | Newsletter
- **Logic:** `campaigns.filter(c => selectedType === 'all' || c.type === selectedType)`
- **Placement:** Below search bar, horizontal chips

### 1.4 Sort Dropdown

- **Options:** Name A–Z, Name Z–A, Newest, Oldest, Last sent, Open rate, Click rate
- **Logic:** Client-side sort on `filteredCampaigns` using `statsMap` for rates
- **Last sent:** Derive from `campaign_recipients.sent_at` max or `scheduled_emails` — may need `useCampaignStats` to expose `lastSentAt`

### 1.5 Folder Sidebar

- **Component:** `CampaignFolderSidebar`
- **Data:** `campaignService.getFolders()` via `useCampaignFolders`
- **Options:** All | Uncategorized | [Folder 1] | [Folder 2] | + New folder
- **Filter:** `campaigns.filter(c => selectedFolderId === 'all' || (selectedFolderId === 'uncategorized' ? !c.folder_id : c.folder_id === selectedFolderId))`
- **Create folder:** `campaignService.createFolder(name)` + invalidate folders query

### 1.6 Campaign Card Actions

| Button | When Shown | Action |
|--------|------------|--------|
| **Duplicate** | draft, paused, completed | `campaignService.duplicate(id, name)` → open builder or toast + refetch |
| **Add recipients** | active, scheduled | Open `AddRecipientsModal` |
| **Archive** | completed, paused | `updateCampaign({ archived_at: new Date().toISOString() })` |
| **Unarchive** | In Archived tab | `updateCampaign({ archived_at: null })` |

### 1.7 AddRecipientsModal Component

- **Props:** `campaignId`, `open`, `onOpenChange`, `onSuccess`
- **Content:** Same audience selector as CampaignBuilder (talent pools, pipelines, tags)
- **Exclude:** Candidates already in `campaign_recipients` for this campaign
- **On confirm:** `addRecipients` + insert step 1 into `scheduled_emails` with `scheduled_at = now()` (or call `send-campaign-email` with campaignId only to send immediately)

### 1.8 UpcomingSendsTab Component

- **Data:** `campaignService.getScheduledEmails()`
- **Display:** Group by date (Today, Tomorrow, This week, Later); list campaign name, subject, recipient count, time
- **Actions:** View campaign, Cancel (update `scheduled_emails.status = 'cancelled'`)

---

## Issue 2: getRecipientValidation with New Campaigns

**Status:** Bug  
**Priority:** High  
**File:** [`src/services/campaignService.ts`](src/services/campaignService.ts)

**Problem:** For new campaigns, `campaignId` is `''`. Querying `campaign_recipients` with `.eq('campaign_id', '')` can fail (UUID vs empty string).

**Fix:**
```typescript
async getRecipientValidation(campaignId: string, candidateIds: string[]): Promise<...> {
  if (candidateIds.length === 0) return { valid: 0, noEmail: 0, unsubscribed: 0 };
  
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, email')
    .in('id', candidateIds);

  let unsubscribed = 0;
  if (campaignId) {
    const { data: existing } = await supabase
      .from('campaign_recipients')
      .select('candidate_id, status')
      .eq('campaign_id', campaignId)
      .in('candidate_id', candidateIds);
    unsubscribed = (existing || []).filter(r => r.status === 'unsubscribed').length;
  }

  let noEmail = (candidates || []).filter(c => !c.email?.trim()).length;
  const valid = (candidates?.length || 0) - noEmail - unsubscribed;
  return { valid, noEmail, unsubscribed };
}
```

---

## Issue 3: Cron Migration Dependencies

**Status:** May fail on fresh deploy  
**Priority:** Medium  
**File:** [`supabase/migrations/20260304120004_process_scheduled_emails_cron.sql`](supabase/migrations/20260304120004_process_scheduled_emails_cron.sql)

**Problem:** Migration assumes `pg_cron`, `pg_net`, and vault secret `supabase_anon_key` exist.

**Options:**

**A. Split migration (recommended)**  
- Move cron setup to a separate migration that runs only if extensions exist
- Or document as manual step in `docs/CAMPAIGN_CRON_SETUP.md`

**B. Conditional migration**  
- Use `DO $$ ... EXCEPTION WHEN ... $$` to skip if extensions/vault not ready
- More complex, harder to maintain

**C. Document only**  
- Add `docs/CAMPAIGN_CRON_SETUP.md` with steps (enable pg_cron, pg_net, create vault secret, run cron SQL)
- Remove cron from migrations; user runs manually after first deploy

---

## Issue 4: Supabase Types Out of Date

**Status:** Types may not match schema  
**Priority:** Medium

**Fix:** After migrations:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```
Or with linked project:
```bash
supabase gen types typescript --project-id xvkeruwiravjnzikrtkp > src/integrations/supabase/types.ts
```

**Add to:** Deployment checklist or `package.json` script.

---

## Issue 5: Schedule Date Picker Disables Today

**Status:** Bug  
**Priority:** Medium  
**File:** [`src/components/campaigns/CampaignBuilder.tsx`](src/components/campaigns/CampaignBuilder.tsx)

**Problem:** `disabled={(date) => date < new Date()}` disables today because calendar dates are midnight.

**Fix:** Compare dates only (ignore time):
```tsx
disabled={(date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}}
```

---

## Implementation Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Fix getRecipientValidation (Issue 2) | 5 min |
| 2 | Fix schedule date picker (Issue 5) | 5 min |
| 3 | Add useMyCampaigns, useOrgCampaigns, useScheduledEmails, useCampaignFolders hooks | 30 min |
| 4 | Campaigns view: primary tabs (My, Org, Upcoming, Archived) | 1 hr |
| 5 | CampaignSearchBar + type filter + sort | 45 min |
| 6 | CampaignFolderSidebar | 45 min |
| 7 | UpcomingSendsTab component | 45 min |
| 8 | AddRecipientsModal component | 1 hr |
| 9 | Campaign card: Duplicate, Add recipients, Archive buttons | 45 min |
| 10 | Cron setup doc or migration split (Issue 3) | 30 min |
| 11 | Regenerate Supabase types (Issue 4) | 5 min |

**Total:** ~6–7 hours

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/campaignService.ts` | Fix getRecipientValidation |
| `src/components/campaigns/CampaignBuilder.tsx` | Fix date picker disabled logic |
| `src/views/Campaigns.tsx` | Add tabs, search, filters, sort, folder sidebar, card actions |
| `src/components/campaigns/CampaignSearchBar.tsx` | New |
| `src/components/campaigns/CampaignFolderSidebar.tsx` | New |
| `src/components/campaigns/UpcomingSendsTab.tsx` | New |
| `src/components/campaigns/AddRecipientsModal.tsx` | New |
| `src/hooks/useCampaigns.ts` | Add useMyCampaigns, useOrgCampaigns, useScheduledEmails |
| `src/hooks/useCampaignFolders.ts` | New |
| `docs/CAMPAIGN_CRON_SETUP.md` | New (optional) |
