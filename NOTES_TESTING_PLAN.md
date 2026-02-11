# Notes Feature - Testing Plan

> **Implementation Date**: February 2025  
> **Feature**: Display and add real notes for candidates  
> **Locations**: Candidate Profile, Pipeline Detail, Talent Pool Detail

---

## Summary

The Notes feature allows recruiters to add and view notes for candidates in three places:

1. **Candidate Profile** (`/candidates/:id`) – Full notes section with display + add
2. **Pipeline Detail** (`/pipelines/:id`) – Quick add via candidate row dropdown
3. **Talent Pool Detail** (`/talent-pools/:id`) – Quick add via candidate row dropdown

Notes are stored in the `notes` table (Supabase) and associated with candidates via `candidate_id`.

---

## Pre-Testing Checklist

- [ ] Supabase project is running (local or cloud)
- [ ] `.env` has valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] User is authenticated (able to log in)
- [ ] At least one candidate exists in the database
- [ ] At least one pipeline and one talent pool exist with candidates

---

## Build Verification

Run before and after any code changes:

```bash
npm run build
```

**Expected**: Build completes with exit code 0, no TypeScript errors.

---

## Manual Test Cases

### TC-01: Candidate Profile – Empty State

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/candidates/:id` for a candidate with no notes | Page loads without error |
| 2 | Scroll to "Recruiter Notes" card | Card shows "No notes yet. Add a note to track your thoughts about this candidate." |
| 3 | Verify "Add Note" button is visible | Button is enabled and clickable |

---

### TC-02: Candidate Profile – Add Note (Happy Path)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/candidates/:id` | Page loads |
| 2 | Click "Add Note" | QuickNoteDialog opens with title "Add Note for [Candidate Name]" |
| 3 | Leave textarea empty, click "Save Note" | Save button is disabled (no action) |
| 4 | Type "Strong technical background. Follow up next week." | Text appears in textarea |
| 5 | Click "Save Note" | Toast: "Note added"; dialog closes |
| 6 | Verify notes section | New note appears with today's date and content |
| 7 | Refresh page (F5) | Note persists; still visible |

---

### TC-03: Candidate Profile – Multiple Notes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add 3 notes via "Add Note" | Each note appears after save |
| 2 | Verify order | Notes appear newest first (most recent at top) |
| 3 | Verify badge | "Recruiter Notes" header shows badge with count (e.g. `3`) |
| 4 | Verify dates | Each note shows formatted date (e.g. "Feb 11, 2025") |

---

### TC-04: Candidate Profile – Cancel Add Note

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Note" | Dialog opens |
| 2 | Type some text | Text appears |
| 3 | Click "Cancel" | Dialog closes; no note saved |
| 4 | Re-open "Add Note" | Textarea is empty (state reset) |

---

### TC-05: Candidate Profile – Whitespace Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Note" | Dialog opens |
| 2 | Type only spaces | Save button disabled |
| 3 | Type "Valid note" with leading/trailing spaces | On save, note is trimmed; displays "Valid note" |

---

### TC-06: Candidate Profile – Loading State

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to candidate profile (slow network or throttle) | Skeleton loaders appear in notes section |
| 2 | Wait for load | Notes load; skeleton replaced with content or empty state |

---

### TC-07: Pipeline Detail – Add Note via Dropdown

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/pipelines/:id` for a pipeline with candidates | Pipeline loads |
| 2 | Click the three-dot menu (⋮) on a candidate row | Dropdown opens |
| 3 | Click "Add Note" | QuickNoteDialog opens with candidate name |
| 4 | Enter note text, click "Save Note" | Toast: "Note added"; dialog closes |
| 5 | Navigate to that candidate's profile (`/candidates/:id`) | Note appears in Recruiter Notes section |

---

### TC-08: Talent Pool Detail – Add Note via Dropdown

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/talent-pools/:id` for a pool with candidates | Pool loads |
| 2 | Click the three-dot menu (⋮) on a candidate row | Dropdown opens |
| 3 | Click "Add Note" | QuickNoteDialog opens with candidate name |
| 4 | Enter note text, click "Save Note" | Toast: "Note added"; dialog closes |
| 5 | Navigate to that candidate's profile | Note appears in Recruiter Notes section |

---

### TC-09: Multi-line Notes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add a note with multiple lines (e.g. line1\nline2\nline3) | Note saves |
| 2 | View in notes section | Line breaks preserved (whitespace-pre-wrap) |

---

### TC-10: Error Handling – API Failure

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disconnect network or use invalid Supabase URL | App may be in error state |
| 2 | Attempt to add note | Toast: "Failed to add note: [error message]" |
| 3 | Restore network | App recovers; add note works again |

---

### TC-11: Invalid Candidate ID

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/candidates/invalid-uuid` | "Candidate Not Found" error state |
| 2 | Navigate to `/candidates/` (no ID) | Router may redirect or show 404; no crash |

---

### TC-12: Notes Persistence Across Sessions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add a note to a candidate | Note saved |
| 2 | Log out | Session ends |
| 3 | Log back in | Same user |
| 4 | Navigate to candidate profile | Note still visible (RLS permits) |

---

## Test Matrix

| Test Case | Candidate Profile | Pipeline | Talent Pool |
|-----------|-------------------|----------|-------------|
| TC-01 Empty state | ✓ | – | – |
| TC-02 Add note | ✓ | ✓ (TC-07) | ✓ (TC-08) |
| TC-03 Multiple notes | ✓ | – | – |
| TC-04 Cancel | ✓ | ✓ | ✓ |
| TC-05 Whitespace | ✓ | ✓ | ✓ |
| TC-06 Loading | ✓ | – | – |
| TC-07 Pipeline add | – | ✓ | – |
| TC-08 Pool add | – | – | ✓ |
| TC-09 Multi-line | ✓ | ✓ | ✓ |
| TC-10 Error | ✓ | ✓ | ✓ |
| TC-11 Invalid ID | ✓ | – | – |
| TC-12 Persistence | ✓ | – | – |

---

## Regression Checks

After implementing notes, verify these flows still work:

- [ ] Candidate profile loads (all sections)
- [ ] Pipeline detail loads; candidate dropdown works
- [ ] Talent pool detail loads; candidate dropdown works
- [ ] Add to Pipeline dialog works
- [ ] Add to Talent Pool dialog works
- [ ] Navigation (sidebar, back, next/prev candidate) works

---

## Optional: Automated Tests (Future)

The project does not currently have a test framework. To add automated tests later:

1. **Install Vitest** (recommended for Vite):
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```

2. **Unit tests** for `communicationService`:
   - `getNotesByCandidate` returns notes for candidate
   - `createNote` inserts and returns created note

3. **Integration tests** for notes flow:
   - Mock Supabase client
   - Render `CandidateProfile` with `useNotes` / `useCreateNote`
   - Assert empty state, add note, verify list updates

4. **E2E tests** (Playwright/Cypress):
   - Navigate to candidate → add note → verify persistence

---

## Sign-Off

| Tester | Date | Pass / Fail | Notes |
|--------|------|-------------|-------|
| | | | |
