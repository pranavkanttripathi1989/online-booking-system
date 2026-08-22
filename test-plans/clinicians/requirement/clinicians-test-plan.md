---
id: TP011
type: test-plan
feature: clinicians
created: 2026-03-20
updated: 2026-08-22
status: approved
parent: REQ013
related: [TR010, PLAN023]
---

# Clinicians — Test Plan

**Data source: real backend as of 2026-08-22** (previously `MockStore`/hardcoded mock arrays — see `context/test-coverage-audit-2026-08-22/manifest.md` and `PLAN023` for the full rewrite rationale). Rewritten under `REQ013`/`PLAN023` Phase A after this session's Priority 3 sweep found and fixed 4 real bugs across the files this plan covers — the previous version of this document documented some of that buggy behavior as the expected, correct result (see "What changed" below).

**Feature area:** `/src/pages/clinicians/` and `/src/pages/clinician/`
**Files:** `index.jsx`, `detail.jsx`, `CreateClinicianPage.jsx`, `EditClinicianPage.jsx`, `Dashboard.jsx`, `Calendar.jsx`, `Availability.jsx`
**Routes:** `/clinicians`, `/clinicians/:id`, `/clinicians/new`, `/clinicians/:id/edit`, `/clinician/dashboard`, `/clinician/calendar`, `/clinician/availability`
**Access:** Admin/Manager (clinician management), Clinician (own portal pages, self-scoped by JWT `clinician_id`)
**GraphQL:** `CLINICIANS_QUERY`, `CLINICIAN_DETAIL_QUERY`, `CREATE_CLINICIAN_MUTATION`, `UPDATE_CLINICIAN_MUTATION`, `getClinicianAvailability`/`getLunchBreaks`/`saveClinicianAvailability`/`saveLunchBreak`/`deleteClinicianAvailability`/`deleteLunchBreak` (`backend/src/availability`), real `appointments` query (clinician-self-scoped) for `clinician/Calendar.jsx`.

## What changed from the mock-era version of this plan

Real bugs this session's audit found (and fixed, per `PLAN023`'s commits) that the old version of this plan documented as *correct expected behavior*, not bugs:

1. **TC-CLIN-006** (old) listed star rating and education as expected profile sections. Neither has a real backend field on `Clinicians`/`ClinicianType` — `clinicians/detail.jsx` was rewritten to drop them rather than fake them (`context/open-questions.md` #8). Corrected below.
2. **TC-CLIN-007** (old) expected weekend days to show a synthetic "Unavailable" label. The real page renders only `availability_templates` rows that actually exist, with no placeholder for days with none. Corrected below.
3. **TC-CLIN-011/012** (old) documented *only* the offline-mock fallback path for the edit form as if it were the primary behavior. The real primary path (a successful `updateClinician` mutation) was never asserted at all — correct as re-verified this session, but the old plan's framing made the fallback look like the main flow. Corrected below.
4. **TC-CLIN-008** (old) never asserted that Save actually persists a real clinician. This is exactly the blind spot that let `CreateClinicianPage.jsx`'s `const useMock = true // always use mock in dev for now` ship — every "created" clinician never existed in the real database, and no test case would have caught it. Corrected below with a real persistence assertion.
5. **TC-CLIN-013/014/015** (old) described `clinician/Dashboard.jsx`, `Calendar.jsx`, `Availability.jsx` entirely in terms of hardcoded mock KPIs/events/slots. `Dashboard.jsx` was independently re-verified this session as already correctly real (error/absent-`data`-gated fallback, not an empty-result check). `Calendar.jsx` and `Availability.jsx` both had real, previously-undiscovered bugs fixed this session (see `PLAN023`'s commit messages for full detail): `Calendar.jsx` called a GraphQL field that doesn't exist anywhere in the schema and so ran on 100% fabricated events; `Availability.jsx` passed the wrong id (`user.id` instead of `user.clinician.id`) so no real clinician could ever view or save their own availability, and both files' day-of-week matching compared incompatible types so real weekly slots never appeared in their grid column. Corrected below.
6. **Mock Data Reference** (old) listed 8 named mock clinicians (`c1`–`c8`) with specific specialties used throughout the old test cases (search "Vega", filter "Cardiologist" → 2 results, etc.). None of these are real — the real seeded dataset has exactly **one** named clinician (Sarah Mitchell, General Physician, ₹800/consultation) plus whatever a manager creates through the UI. Test cases that depended on a specific mock roster size/composition are rewritten below to either use Sarah Mitchell (the one stable real fixture) or to create their own disposable fixture via the real `createClinician` mutation, matching the pattern already established this session in `clinician-portal.spec.js`.
7. **Currency**: TC-CLIN-018 (old) expected a "£XX.XX" GBP fee badge. This app is India-market, INR throughout (`CLAUDE.md` hard rule 9) — corrected to ₹.

---

## Test Cases

### TC-CLIN-001 — List renders real clinicians
**Steps:** Log in as Manager. Navigate to `/clinicians`.
**Expected:** Sarah Mitchell's card renders with real fields: name, "General Physician" specialty chip, real clinic name, ₹800.00 consultation fee badge, real availability data (not a static heatmap image). Covered live: `manager-clinicians-patients.spec.js` › `manager sees real seeded clinicians with real availability data`.

---

### TC-CLIN-002 — Search by clinician name
**Steps:** Type "Mitchell" in the "Search clinicians" field.
**Expected:** Only Sarah Mitchell's card remains visible. Clearing the search restores the full real list.

---

### TC-CLIN-003 — Specialization filter dropdown
**Steps:** Open the Specialization dropdown (built dynamically from real clinician data, not a hardcoded list) → select "General Physician".
**Expected:** Sarah Mitchell's card shown; any clinician of a different real specialty (if one exists in the current dataset) is excluded. Resetting to "All Specializations" restores the full list.

---

### TC-CLIN-004 — Status toggle
**Steps:** Toggle Active / Inactive / All.
**Expected:** Filters the real `is_active` field correctly. No fixed count assertion — the real roster size is not stable across sessions (accepted e2e test debris accumulates `is_active: true` clinicians over time; see `manager-clinicians-patients.spec.js`'s own "creating a clinician..." test, which never deletes its fixture, matching this session's established precedent).

---

### TC-CLIN-005 — View Profile navigation
**Steps:** Click "View Profile" on Sarah Mitchell's card (opens `ClinicianProfileDrawer`, not the full-page `/clinicians/:id` route — see `components/Clinicians/ClinicianProfileDrawer.jsx`).
**Expected:** Drawer opens with real `CLINICIAN_DETAIL_QUERY` data: Overview/Availability/Appointments/Services tabs, all real.

---

### TC-CLIN-006 — Full-page profile (`/clinicians/:id`): real sections only
**Steps:** Navigate directly to `/clinicians/<real-clinician-id>`.
**Expected:** Name, `clinician_type` chip, active/inactive status, assigned clinics, bio (or "No bio provided."), languages (or "Not specified."), consultation fee, gender all visible when present. Star rating, review count, patient count, appointments-this-month, years of experience, and education are **not shown** — no real backend field exists for any of them (`context/open-questions.md` #8); this is a deliberate omission, not a gap in this test case. Covered live: `manager-clinicians-patients.spec.js` › `clinician detail page shows the real clinician, not the fake "Dr. Jane Smith"`.

---

### TC-CLIN-007 — Full-page profile: Schedule tab (`availability_templates`)
**Steps:** On `/clinicians/<real-clinician-id>`, click the Schedule tab.
**Expected:** Only real `availability_templates` rows render (day name from `day_of_week`, start/end time, clinic/room, Active/Inactive chip). A clinician with zero templates shows "No availability templates configured." — no synthetic "Unavailable" placeholder is rendered for days without a template.

---

### TC-CLIN-008 — Create form: Save persists a real clinician
**Steps:** Navigate to `/clinicians/new`. Fill First Name, Last Name, Email (all required), select at least one Clinic (backend-required — `CliniciansService.create` rejects with "At least one clinic_id is required" otherwise, a real validation this test must satisfy). Click "Save Clinician".
**Expected:** A real `createClinician` mutation fires and returns a real id; the page navigates to `/clinicians/<that-real-id>` and the new clinician's real name renders there — proving the record actually exists in the database, not just that a success toast appeared. Covered live: `manager-clinicians-patients.spec.js` › `creating a clinician calls the real createClinician mutation and persists it`.

---

### TC-CLIN-009 — Email validation: invalid format
**Steps:** Type "notanemail" in the Email field → click Save.
**Expected:** "Invalid email format" error shown; no mutation fires.

---

### TC-CLIN-010 — Email validation: blank
**Steps:** Leave Email empty → click Save.
**Expected:** "Required" error shown; no mutation fires.

---

### TC-CLIN-011 — Edit form: pre-fills with the real clinician's data
**Steps:** Navigate to `/clinicians/<real-clinician-id>/edit`.
**Expected:** First Name/Last Name/Email/etc. pre-filled from a real `CLINICIAN_DETAIL_QUERY` response, not a mock lookup. (The file's own `mockClinicianRaw`/three-tier id-lookup fallback was checked this session and confirmed harmless in practice — it only matches `MockStore`'s `clin-X`/`c1`..`c8`-style ids, which real UUIDs never collide with, so it never actually triggers on real navigation. No fix needed, noted here so it isn't rediscovered as a false alarm.)

---

### TC-CLIN-012 — Edit form: Save persists to the real backend
**Steps:** Change a field (e.g. Bio) → click "Save Changes".
**Expected:** The real `updateClinician` mutation fires; on success, a "Clinician updated successfully" snackbar shows and the page navigates to the detail view where the change is now visible. **Secondary case (offline resilience, not the primary path):** if the mutation genuinely fails (network error), the page falls back to `MockStore.updateClinician()` with a distinctly-labeled "Clinician updated (offline mode)" snackbar — this fallback was re-verified this session as correctly gated on a real mutation failure, not an empty-result heuristic.

---

### TC-CLIN-013 — Clinician portal: Dashboard (`/clinician/dashboard`)
**Steps:** Log in as a real, linked clinician account. Navigate to `/clinician/dashboard`.
**Expected:** Real appointment data via `GET_CLINICIAN_DASHBOARD_DATA`. Falls back to mock data only when `data` itself is absent (query error, timeout, or offline) — `isMock = !data`, not an empty-array check — so a real clinician with zero appointments today sees a real empty dashboard, not fabricated KPIs. (Re-verified this session; no fix needed.)

---

### TC-CLIN-014 — Clinician portal: Calendar (`/clinician/calendar`)
**Steps:** Log in as a real, linked clinician account. Navigate to `/clinician/calendar`.
**Expected:** Real appointments for the viewed week (self-scoped server-side to the caller's own `clinician_id`) plus real recurring lunch breaks (`getLunchBreaks`), rendered in their correct day columns and correct time rows. Every appointment renders with `type: 'in-person'` styling — no real in-person/video distinction exists on the backend `Appointment` type, so this is not faked. A specific-day lunch break appears only on that day; a "daily" lunch break (`dayOfWeek: null` on read) appears on all seven. Covered live: `clinician-portal.spec.js` › `calendar page shows real appointments and lunch breaks, never the fabricated mock schedule`.

---

### TC-CLIN-015 — Clinician portal: Availability (`/clinician/availability`)
**Steps:** Log in as a real, linked clinician account. Navigate to `/clinician/availability`.
**Expected:** Real weekly slots (`getClinicianAvailability`) render in their own real day column (numeric `dayOfWeek`, Monday=0, matched directly — not stringified or name-matched). Real lunch breaks render the same way, with a `dayOfWeek: null` break shown under every day. Adding/editing a slot or lunch break calls the real `saveClinicianAvailability`/`saveLunchBreak` mutations, correctly scoped to the caller's own `clinician_id` (`user?.clinician?.id`, not `user?.id`) — the backend's own `assertClinicianAccess` guard rejects a mismatched id, so this is not optional plumbing, it's required for the save to succeed at all. The overlap-conflict warning correctly fires for a genuinely overlapping same-day slot. Covered live: `clinician-portal.spec.js` › `availability page places a weekly slot in its own real day column, and a specific-day lunch break on only that day`.

---

### TC-CLIN-016 — Clinic filter dropdown
**Steps:** Select a real clinic name from the Clinic dropdown.
**Expected:** Only clinicians assigned to that clinic remain visible. Resetting to "All Clinics" restores the full list.

---

### TC-CLIN-017 — Empty state when no results match
**Steps:** Type "ZZZ_NO_SUCH_CLINICIAN_ZZZ" in the search field.
**Expected:** Zero cards shown; "No clinicians found" / "Try adjusting your filters" empty state renders. **Not** 8 fabricated `MOCK_CLINICIANS` — the exact bug found and fixed this session (`allClinicians = apiClinicians.length > 0 ? apiClinicians : MOCK_CLINICIANS`, corrected to gate on a real query `error`). Covered live: `manager-clinicians-patients.spec.js` › `a search matching zero real clinicians shows a real empty state, not 8 fabricated ones`.

---

### TC-CLIN-018 — Consultation fee badge visible on card
**Steps:** View Sarah Mitchell's card.
**Expected:** Fee badge showing "₹800.00 per consultation" (real INR value, converted from paise at the resolver boundary per `CLAUDE.md` hard rule 9) — not GBP.

---

### TC-CLIN-019 — Combined filters: AND logic
**Steps:** Search a real clinician's name AND select their real specialization together.
**Expected:** Only clinicians matching both conditions remain — AND logic across all active filter dimensions, no crash.

---

### TC-CLIN-020 — Inactive card visual distinction
**Steps:** View `/clinicians` with an inactive real clinician present (create one via `createClinician` with `is_active: false` if none currently exists — the real dataset's inactive-clinician count is not stable).
**Expected:** Inactive card renders with reduced opacity + grayscale filter, visually distinct from active cards.

---

### TC-CLIN-021 — Filter dropdown count badges
**Steps:** Open the Specialization dropdown.
**Expected:** Each option shows a count chip reflecting the real, current unfiltered clinician count for that specialty — not a hardcoded number. Same for the Clinic dropdown.

---

### TC-CLIN-022 — Clear All Filters button
**Steps:** Apply any filter → confirm the "Clear Filters" button appears → click it.
**Expected:** All filters (search, specialty, clinic, active) reset to defaults; the button hides again once nothing is active.

---

### TC-CLIN-023 — Availability heatmap day tooltips
**Steps:** Hover each day chip in the card's availability heatmap.
**Expected:** Tooltip shows the full day name ("Mo" → "Monday", etc.), including for days with no real availability (grey/inactive chips).

---

## Edge cases

| # | Edge case | Expected |
|---|-----------|----------|
| E1 | Real clinician list is empty for this org | Empty state: "No clinicians found" — not mock data |
| E2 | Search term matches specialty, not name | Clinician found (filter checks both real fields) |
| E3 | All 4 filters set simultaneously | AND logic — only an exact real match shown; no crash |
| E4 | No clinicians in the selected real clinic | Empty state shown |
| E5 | Real backend genuinely unreachable (network error) | `error` is set → mock fallback renders with no crash — the one case this fallback is *meant* for |
| E6 | Create form submitted with no clinic selected | Real backend rejection ("At least one clinic_id is required"), surfaced to the user, not silently swallowed |
| E7 | Edit form submit while backend is genuinely offline | `MockStore.updateClinician()` fallback fires, distinctly labeled "(offline mode)" |
| E8 | Create form empty submit | All required-field errors shown simultaneously |
| E9 | A real clinician with no `services` | Services section renders empty/absent, no crash |
| E10 | A real clinician with no `availability_templates` | "No availability templates configured." shown — not a fabricated 7-day grid |
| E11 | Locum fields (`is_locum`/`locum_for`/etc.) on the create/edit forms | Collected by the form but **not sent** to the real `createClinician`/`updateClinician` mutations — `CreateClinicianInput`/`UpdateClinicianInput` have no matching backend fields at all. A real, separate, pre-existing gap (`context/open-questions.md` #8's sibling finding in `PLAN023`'s commit), not a regression introduced by this rewrite. |

---

## Session history

| Session | Change |
|---|---|
| 2026-03-16 – 2026-03-30 | Mock-era baseline, 23 test cases against `MockStore`/hardcoded arrays, all "passing" against mock behavior only |
| 2026-08-22 (`REQ013`/`PLAN023` Phase A) | Full rewrite against the real backend. 4 real bugs found and fixed in the process (see "What changed" above): clinicians list + Availability + Calendar mock-fallback/id/type bugs, `CreateClinicianPage.jsx`'s always-mock `useMock = true`. Re-executed and re-verified — see `TR010`. |
