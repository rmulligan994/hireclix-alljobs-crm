# Add Candidates Modal Optimization Plan

**Status:** ✅ Implemented (Feb 2025)

**Context:** The main Candidates tab is fast (enriched view, virtualization, staleTime). The "Add Candidates" modals in Talent Pool Detail and Pipeline Detail feel slow and clunky by comparison.

**Scope:** `AddCandidatesToPoolDialog` and `AddCandidatesToPipelineDialog`

---

## Current State Analysis

### Data Flow

| Component | Data Hook | What It Fetches | Cache Key |
|-----------|-----------|-----------------|------------|
| **Main TalentPool** | `useCandidatesWithEnrichment` | Single query via `candidates_enriched` view | `['candidates', 'enriched']` |
| **TalentPoolDetail** | `useCandidates` | `candidateService.getAll()` (raw candidates) | `['candidates']` |
| **PipelineDetail** | `useCandidates` | Same as above | `['candidates']` |
| **AddCandidatesToPoolDialog** | `useCandidates` | Same | `['candidates']` |
| **AddCandidatesToPipelineDialog** | `useCandidates` | Same | `['candidates']` |

**Problem:** When you open "Add Candidates" from the **main Candidates tab**, the enriched data is already cached—but the dialogs use `useCandidates`, a **different query**. They trigger a fresh `getAll()` fetch. That’s a separate network round-trip and client-side processing.

### Rendering

| Component | List Rendering | DOM Nodes |
|-----------|----------------|-----------|
| **Main TalentPool** | `TableVirtuoso` (virtualized) | ~25–30 visible rows |
| **AddCandidatesToPoolDialog** | `.map()` over all filtered candidates | All rows (e.g. 500+ DOM nodes) |
| **AddCandidatesToPipelineDialog** | Same | Same |

**Problem:** With 500+ candidates, the dialogs render every row. No virtualization → heavy initial render and scroll lag.

### Filter Options

| Dialog | Filters | Pipeline/Stage Filters |
|--------|---------|------------------------|
| **AddCandidatesToPoolDialog** | Skills, locations, companies, sources | Empty (no pipeline data) |
| **AddCandidatesToPipelineDialog** | Search only | None |

**Observation:** Pool dialog has a filters panel but pipeline/stage options are empty because `useCandidates` doesn’t include pipeline associations.

---

## Root Causes

1. **Cache mismatch** – Dialogs use `useCandidates` while main tab uses `useCandidatesWithEnrichment`. No cache reuse when coming from main tab.
2. **No virtualization** – Full list render causes slow paint and scroll.
3. **Redundant fetch** – `getAll()` runs even when enriched data is already in memory.
4. **Incomplete filters** – Pool dialog can’t show pipeline filters without enriched data.

---

## Proposed Optimizations

### 1. Switch to Enriched Data (High Impact)

**Change:** Use `useCandidatesWithEnrichment` in both dialogs instead of `useCandidates`.

**Benefits:**
- **Cache reuse:** From main Candidates tab, data is already loaded → dialog opens instantly.
- **Pipeline filters:** Pool dialog can add pipeline/pipelineStage filters (from `pipelineAssociations`).
- **Single source of truth:** Same data shape as main tab; no extra `getAll()` call.

**Considerations:**
- Enriched data has `pipelineAssociations` and `lastContactAt`. Dialogs don’t need last contact, but it doesn’t hurt.
- `CandidateListEnriched` extends `Candidate`; existing mapping logic still works.
- TalentPoolDetail and PipelineDetail still use `useCandidates` for their own needs (pool candidate join, etc.). That’s fine—they’re different use cases.

**Effort:** Low. Swap the hook and adjust types if needed.

---

### 2. Add Virtualization (High Impact)

**Change:** Replace `.map()` with `Virtuoso` (or `Virtuoso` list) for the candidate list in both dialogs.

**Why Virtuoso:** Already used via `TableVirtuoso` in the main tab. `react-virtuoso` also provides `Virtuoso` for non-table lists.

**Implementation:**
- Wrap the scrollable list in `<Virtuoso data={filteredCandidates} itemContent={...} />`.
- Each row stays a card (checkbox + name + meta + badges).
- Fixed height container (e.g. `max-h-[400px]`) is required for Virtuoso.

**Benefits:**
- Only ~15–25 rows in DOM at a time.
- Faster initial render and smoother scrolling with large lists.

**Effort:** Medium. Need to adapt card layout to Virtuoso’s `itemContent` API.

---

### 3. Optional: Shared Candidate Picker Component (Medium Impact, Cleaner Code)

**Change:** Extract a reusable `CandidatePicker` (or `AddCandidateSearchList`) used by both dialogs.

**Responsibilities:**
- Search input + debounce
- Filters panel (optional; Pool has it, Pipeline could get it)
- Virtualized list
- Selection state (checkboxes, select all)
- Exclude `existingCandidateIds` prop

**Benefits:**
- One place to optimize; both dialogs benefit.
- Consistent UX (search, filters, virtualization) across Pool and Pipeline.
- Easier to maintain.

**Effort:** Medium–high. Refactor both dialogs to use the shared component.

---

### 4. Optional: Defer Fetch Until Dialog Opens

**Change:** Use `enabled: open` so the query only runs when the dialog is open.

**Trade-off:** 
- **Pro:** Avoids fetching when dialog is never opened.
- **Con:** When opened from main tab, we want cache. With `enabled: open`, the query runs on open—but if enriched data is already cached (staleTime 5 min), React Query serves it immediately. So `enabled: open` is still fine.
- **Con:** If user opens dialog from a page that hasn’t loaded candidates (e.g. fresh Pipeline Detail), we’d fetch on open. That’s acceptable.

**Recommendation:** Consider `enabled: open` to avoid prefetching when the dialog is closed. Low priority.

---

## Recommended Implementation Order

| Phase | Change | Impact | Effort |
|-------|--------|--------|--------|
| **1** | Switch dialogs to `useCandidatesWithEnrichment` | High (cache reuse, instant open from main tab) | Low |
| **2** | Add Virtuoso to candidate list in both dialogs | High (smooth scroll, fast render) | Medium |
| **3** | Add pipeline/stage filters to Pool dialog (from enriched data) | Medium (better filtering) | Low |
| **4** | Extract shared `CandidatePicker` component | Medium (DRY, easier maintenance) | Medium |

---

## Implementation Notes

### Phase 1: Data Source

- In `AddCandidatesToPoolDialog` and `AddCandidatesToPipelineDialog`:
  - Replace `useCandidates` with `useCandidatesWithEnrichment`.
  - Use `dbCandidates` or `candidates` from the hook.
  - Map to the shape expected by the list (enriched has `pipelineAssociations`; base fields are the same).
  - For search/filter, `firstName`, `lastName`, `title`, `company`, `location`, `tags` are all on enriched. Use `tags` for skills (enriched uses `tags` like base `Candidate`).

### Phase 2: Virtualization

- Use `Virtuoso` from `react-virtuoso` (not `TableVirtuoso`—dialogs use cards, not tables).
- Container: `className="flex-1 overflow-hidden min-h-[200px] max-h-[400px]"` (Virtuoso needs a fixed height).
- `itemContent={(index, candidate) => (...)}` for each card row.
- Preserve checkbox, name, meta (title, company, location), and skill badges.

### Phase 3: Pipeline Filters (Pool Dialog)

- `filterOptions.pipelines` and `filterOptions.pipelineStages` are currently empty.
- With enriched data, derive from `candidate.pipelineAssociations` (same pattern as main TalentPool).
- Add pipeline/stage filter logic to `filteredCandidates` useMemo.

### Phase 4: Shared Component (Optional)

- Create `src/components/candidates/CandidatePicker.tsx`.
- Props: `existingCandidateIds`, `onSelect`, `selectedIds`, `showFilters` (Pool=true, Pipeline=false or true).
- Move search, filters, virtualization, selection logic into it.
- Both dialogs render `<CandidatePicker ... />` with their specific props.

---

## Edge Cases to Consider

| Scenario | Handling |
|----------|----------|
| Dialog opened from main tab (enriched cached) | Instant—no fetch. |
| Dialog opened from Pool/Pipeline detail (only `useCandidates` cached) | Enriched query runs; may show brief loading. |
| Empty candidate list | Existing empty state; no change. |
| All candidates already in pool/pipeline | `availableCandidates` filter; existing empty state. |
| Very long search/filter result (e.g. 2000 rows) | Virtualization keeps only visible rows in DOM. |
| Rapid open/close of dialog | React Query cache; no duplicate fetches within staleTime. |

---

## Success Criteria

- [ ] Opening "Add Candidates" from main Candidates tab feels instant (cached data).
- [ ] Scrolling through 500+ candidates is smooth (virtualization).
- [ ] Search and filters respond quickly (client-side, same as today).
- [ ] Pool dialog can filter by pipeline/stage when using enriched data.
- [ ] No regression in selection behavior or add-to-pool/pipeline flow.

---

## Open Questions

1. **Pipeline dialog filters:** Add the full filters panel (skills, locations, pipelines, etc.) to match the Pool dialog, or keep search-only for simplicity?
2. **Select-all:** With virtualization, "Select all" would select all `filteredCandidates` (not just visible). Confirm this is desired.
3. **Shared component:** Do we want the shared `CandidatePicker` in Phase 4, or keep the dialogs separate and just apply optimizations in place?
