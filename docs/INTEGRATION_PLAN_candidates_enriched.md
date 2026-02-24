# Integration Plan: Candidates Enriched View + StaleTime

**Created:** Feb 24, 2025  
**Scope:** Database view for enriched candidates + React Query staleTime for instant tab navigation

---

## Overview

| Change | Effort | Impact | Risk |
|--------|--------|--------|------|
| staleTime on candidate queries | ~5 min | High (instant back-navigation) | None |
| `candidates_enriched` DB view | 2–4 hrs | Very high (payload, latency, maintainability) | Low |

**Recommended order:** Phase 1 (staleTime) → Phase 2 (DB view)

---

## Phase 1: StaleTime (Quick Win)

### 1.1 Scope

Add `staleTime` to candidate-related React Query hooks so cached data is shown immediately when returning to the candidates tab, with background refetch.

### 1.2 Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useCandidates.ts` | Add `staleTime` to `useCandidates` and `useCandidatesWithEnrichment` |

### 1.3 Implementation

```ts
// useCandidates
return useQuery({
  queryKey: ['candidates'],
  queryFn: candidateService.getAll,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// useCandidatesWithEnrichment
return useQuery({
  queryKey: ['candidates', 'enriched'],
  queryFn: candidateService.getListWithEnrichment,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Optional:** Add to `useCandidateStats` for consistency (stats change less frequently).

### 1.4 Validation

- [ ] Navigate to Candidates tab → wait for load
- [ ] Navigate away (e.g. Pipelines)
- [ ] Navigate back to Candidates → cached data appears immediately (no spinner)
- [ ] Background refetch runs; UI updates if data changed

### 1.5 Rollback

Remove `staleTime` lines. No other changes required.

---

## Phase 2: Database View (`candidates_enriched`)

### 2.1 Current State

- **5 parallel queries:** candidates, pipeline_candidates, pipelines, communications, campaign_recipients
- **Client-side merge:** JS stitches pipeline associations + last contact
- **Pagination:** `_fetchAllPaginated` loops 1000 rows at a time per table
- **Pipeline stages:** `pipelines.stages` is JSONB `[{id, name}]`; `pipeline_candidates.stage` stores stage id

### 2.2 Target State

- **1 query:** `SELECT * FROM candidates_enriched` (or via RPC)
- **Server-side join:** Postgres returns enriched shape
- **Single payload:** ~20k rows instead of 100k+ across 5 tables

### 2.3 Schema Considerations

| Table | RLS | Notes |
|-------|-----|-------|
| candidates | `authenticated` can view all | Simple |
| pipeline_candidates | `authenticated` can view all | Simple |
| pipelines | `authenticated` can view all | Simple |
| communications | `authenticated` can view all | Simple |
| campaign_recipients | User-scoped via `campaigns.user_id` | Must join through `campaigns` for RLS |

**RLS on views:** Postgres applies RLS to underlying tables when a view is queried. `campaign_recipients` RLS checks `campaigns.user_id = auth.uid()`—no explicit join needed in the view; RLS filters automatically.

### 2.4 View Design

**Output shape (must match `CandidateListEnriched`):**

- All `candidates` columns (snake_case → client maps to camelCase)
- `pipeline_associations`: JSONB array `[{id, name, stage}]`
- `last_contact_at`: TIMESTAMPTZ (greatest of `communications.occurred_at`, `campaign_recipients.sent_at`)

**Stage name resolution:** `pipeline_candidates.stage` holds a stage ID. Resolve via:

```sql
-- pipelines.stages is JSONB: [{"id": "uuid", "name": "Applied"}, ...]
-- Use jsonb_array_elements + filter by stage id
```

### 2.5 Migration Steps

#### Step 1: Create migration file

```
supabase/migrations/YYYYMMDDHHMMSS_add_candidates_enriched_view.sql
```

#### Step 2: View SQL (pseudocode)

```sql
-- Resolve stage name from pipelines.stages JSONB
-- pipeline_candidates.stage = stage id in pipelines.stages

CREATE OR REPLACE VIEW public.candidates_enriched AS
SELECT
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company,
  c.title,
  c.location,
  c.source,
  c.tags,
  c.linkedin_url,
  c.avatar_url,
  c.created_at,
  c.updated_at,
  c.created_by,
  -- Pipeline associations as JSONB array
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'stage', COALESCE(
          (SELECT (s->>'name') FROM jsonb_array_elements(p.stages) AS s WHERE (s->>'id') = pc.stage),
          pc.stage
        )
      )
    )
    FROM pipeline_candidates pc
    JOIN pipelines p ON p.id = pc.pipeline_id
    WHERE pc.candidate_id = c.id),
    '[]'::jsonb
  ) AS pipeline_associations,
  -- Last contact: max of communications.occurred_at, campaign_recipients.sent_at
  -- RLS on campaign_recipients filters by campaigns.user_id automatically
  GREATEST(
    (SELECT MAX(comm.occurred_at) FROM communications comm WHERE comm.candidate_id = c.id),
    (SELECT MAX(cr.sent_at) FROM campaign_recipients cr WHERE cr.candidate_id = c.id AND cr.sent_at IS NOT NULL)
  ) AS last_contact_at
FROM candidates c;
```

**Note:** `GREATEST(NULL, NULL)` returns NULL in Postgres—no sentinel needed for "no contact."

#### Step 3: RLS on view

Views don't have their own RLS; underlying tables' RLS applies. When the view is queried, Postgres applies each underlying table's RLS. `campaign_recipients` RLS will filter to the current user's campaigns automatically.

### 2.6 Alternative: RPC Instead of View

If the view + `auth.uid()` in subqueries causes RLS issues, use an RPC:

```sql
CREATE OR REPLACE FUNCTION public.get_candidates_enriched()
RETURNS TABLE (
  id uuid,
  first_name text,
  -- ... all candidate columns ...
  pipeline_associations jsonb,
  last_contact_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Same SELECT logic as view, but we control execution context
  -- Filter campaign_recipients by campaigns where user_id = auth.uid()
$$;
```

**RPC pros:** Explicit control over RLS, can add pagination params later.  
**RPC cons:** Client calls `supabase.rpc('get_candidates_enriched')` instead of `from('candidates_enriched')`.

### 2.7 Client Changes

| File | Change |
|-----|--------|
| `src/services/candidateService.ts` | Replace `getListWithEnrichment` implementation |
| `src/types/Candidate.ts` | No change (shape stays same) |

**New `getListWithEnrichment` logic:**

```ts
getListWithEnrichment: async (): Promise<CandidateListEnriched[]> => {
  const { data, error } = await supabase
    .from('candidates_enriched')  // or .rpc('get_candidates_enriched')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...mapRowToCandidate(row),
    pipelineAssociations: (row.pipeline_associations || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      stage: p.stage,
    })),
    lastContactAt: row.last_contact_at ? new Date(row.last_contact_at) : null,
  }));
},
```

**Pagination:** If the view returns >1000 rows, Supabase will still paginate. Options:

- A) Use `_fetchAllPaginated` but point it at the view (tricky—`_fetchAllPaginated` is table-specific)
- B) Create `_fetchViewPaginated` that paginates `candidates_enriched`
- C) Increase Supabase row limit in project settings and fetch in one call (if under new limit)

### 2.8 Cleanup (After View Works)

| Item | Action |
|------|--------|
| `_fetchAllPaginated` | Keep for `getAll`, `findAllDuplicates`, etc. Or extract shared pagination helper. |
| Merge logic in `getListWithEnrichment` | Remove (replaced by view) |
| `pipelines` fetch in `getListWithEnrichment` | Remove |

### 2.9 Indexes (Optional, Pre-emptive)

```sql
-- If view is slow, add indexes on join/filter columns
CREATE INDEX IF NOT EXISTS idx_pipeline_candidates_candidate_id ON pipeline_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_communications_candidate_occurred ON communications(candidate_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_candidate_sent ON campaign_recipients(candidate_id, sent_at DESC) WHERE sent_at IS NOT NULL;
```

### 2.10 Validation Checklist

- [ ] Migration runs without errors
- [ ] `SELECT * FROM candidates_enriched LIMIT 5` returns expected shape
- [ ] `pipeline_associations` has correct stage names (not raw IDs)
- [ ] `last_contact_at` matches previous client logic
- [ ] RLS: users only see their campaign_recipients data (if multi-tenant)
- [ ] TalentPool view loads with no regressions
- [ ] Filtering, search, sort still work (client-side logic unchanged)
- [ ] TalentPoolDetail pool candidates still load correctly

### 2.11 Rollback Plan

1. Revert `candidateService.getListWithEnrichment` to previous implementation
2. Add migration to drop view: `DROP VIEW IF EXISTS candidates_enriched;`

---

## Implementation Order

```
Phase 1 (Day 1)
├── 1. Add staleTime to useCandidates + useCandidatesWithEnrichment
├── 2. Manual test: tab navigation
└── 3. Commit

Phase 2 (Day 2–3)
├── 1. Create migration with view (or RPC)
├── 2. Run migration locally: supabase db reset (or push)
├── 3. Test view/RPC in SQL editor
├── 4. Update candidateService.getListWithEnrichment
├── 5. Handle pagination if >1000 rows
├── 6. Test full flow in app
├── 7. Add indexes if needed (measure first)
└── 8. Commit
```

---

## Open Questions

1. **View vs RPC:** Start with view; switch to RPC if `auth.uid()` in view subqueries causes RLS problems.
2. **Pagination:** Confirm row count at scale. If consistently <5000, consider increasing Supabase limit. If >10k, implement `_fetchViewPaginated` or cursor-based RPC.
3. **`last_contact_at`:** Return NULL from DB when no contact exists; client handles natively.

---

## References

- Current implementation: `src/services/candidateService.ts` lines 508–576
- Consumer: `src/views/TalentPool.tsx` via `useCandidatesWithEnrichment`
- Type: `src/types/Candidate.ts` → `CandidateListEnriched`
- RLS: `campaign_recipients` via `campaigns.user_id` (supabase/migrations/20251213174605)

---

## QA: Test Options & Edge Case Scenarios

### Manual Test Options

| Test | Steps | Expected |
|------|-------|----------|
| **StaleTime: Back-navigation** | 1. Go to Candidates tab, wait for load<br>2. Navigate to Pipelines or another tab<br>3. Navigate back to Candidates | Cached data appears immediately; no loading spinner. Background refetch may update data. |
| **StaleTime: Fresh after 5 min** | 1. Load Candidates, navigate away<br>2. Wait 5+ minutes<br>3. Return to Candidates | Data refetches (stale); loading state may briefly appear. |
| **View: Initial load** | 1. Open Candidates tab (cold load) | Table populates with candidates; pipeline badges and last contact show correctly. |
| **View: Search/filter** | 1. Type in search bar<br>2. Apply filters (skills, pipeline, etc.)<br>3. Change sort | Results filter/sort correctly; no errors. |
| **View: Talent pool detail** | 1. Open a talent pool with candidates | Pool candidates load; names, titles, companies display. |
| **View: Empty states** | 1. Create new org with no candidates | Empty state shows; no errors. |

### Edge Case Scenarios

| Scenario | Setup | Verification |
|----------|-------|---------------|
| **Candidate with no pipelines** | Candidate exists but has no `pipeline_candidates` rows | `pipelineAssociations` = `[]`; no pipeline badges; no errors. |
| **Candidate with no communications or campaigns** | Candidate has never been contacted | `lastContactAt` = `null`; "Never" or equivalent in Last Contact column. |
| **Candidate with both communications and campaign sends** | Candidate has `communications.occurred_at` and `campaign_recipients.sent_at` | `lastContactAt` = most recent of the two. |
| **Pipeline stage ID not in stages JSON** | `pipeline_candidates.stage` references a stage ID removed from `pipelines.stages` | Stage falls back to raw ID (or empty); no crash. |
| **Pipeline with empty/null stages** | `pipelines.stages` = `[]` or `null` | Stage shows raw ID; no JSON parse error. |
| **>1000 candidates** | Database has 1000+ candidates | All candidates load; pagination loop fetches all pages; no truncation. |
| **Campaign RLS (multi-user)** | User A has campaigns; User B does not | User B sees `last_contact_at` only from communications (campaign_recipients filtered by RLS). |
| **New candidate added** | Add candidate via Add Candidate or Import | After mutation invalidates cache, new candidate appears in list. |
| **Candidate removed from pipeline** | Remove candidate from pipeline | Pipeline badge disappears; list updates after refetch. |
| **Rapid tab switching** | Switch Candidates ↔ Pipelines quickly 3–4 times | No duplicate requests; cached data shows; no race conditions. |

### Regression Checks

| Area | Check |
|------|-------|
| **Export CSV** | Export candidates; CSV includes pipeline and last contact data. |
| **Bulk add to pipeline** | Select candidates, bulk add to pipeline; list updates. |
| **Bulk add to talent pool** | Select candidates, add to pool; works as before. |
| **Find duplicates** | Find duplicates flow unaffected. |
| **Candidate profile** | Open candidate profile from list; associations and last contact match list view. |

### Performance Checks (Optional)

| Check | How |
|-------|-----|
| **Network payload** | DevTools Network: single request to `candidates_enriched` vs 5+ requests. |
| **Load time** | Time from tab load to table render; compare before/after if baseline exists. |
| **Scroll performance** | Scroll through 500+ candidates; virtualization keeps scroll smooth. |

### Automated Test Ideas (Future)

- Unit test: `mapRowToCandidate` + enrichment mapping with mock view row
- Integration: Mock Supabase `from('candidates_enriched')`; assert `getListWithEnrichment` returns correct shape
- E2E: Playwright—navigate to Candidates, assert table visible, navigate away and back, assert no loading spinner on return
