# Test Results Page — Test Plan (v3.0 — Real API)

**Module:** Test Results (`/test-results`)
**Source:** `pages/test-results/index.jsx`, `backend/src/test-results/**`
**Updated:** 2026-08-17 (Session QA v3.0 — real backend added, see `context/test-results-backend-implementation-plan.md`)

---

## Feature Overview

Test results view for clinical staff, now backed by a real `TestResults` model (previously 100% mock). Searchable/filterable table with row-click detail dialog. Dialog shows parameter values with color-coded flag chips. Download PDF and Order Test are fully functional against the real backend, with a `MOCK_RESULTS` fallback when the API is unreachable or genuinely empty.

**⚠️ Environment-dependence note (v3.0):** TC-TRES-01 through TC-TRES-07 and TC-TRES-28 assert specific mock values (`TR-001`..`TR-006`, "6 total results", etc.). Those hold **only when the real `TestResults` table is empty** (mock fallback active). The moment any real order exists, the table shows real data instead and these specific assertions no longer apply — run these against a freshly-migrated, unseeded database, or treat them as documentation of mock-mode behavior rather than a live acceptance gate once real usage begins.

---

## 1. Page Load & Layout

### TC-TRES-01 — Page load
**Steps:** Navigate to `/test-results`.
**Expected:** "Medical Test Results" h4. "6 total results · 1 pending" subtitle. "Order Test" button. 4 KPI cards. Filter bar (search + Type + Status + Clear). Table 6 rows.

### TC-TRES-02 — KPI values derived from mock data
**Steps:** View 4 KPI cards.
**Expected:** Total=6, Completed=4, Processing=1, Pending=1.

---

## 2. Search & Filters

### TC-TRES-03 — Search by patient name
**Steps:** Type "Sarah".
**Expected:** TR-002 Sarah Miller only.

### TC-TRES-04 — Search by test name
**Steps:** Type "MRI".
**Expected:** TR-005 MRI Brain only.

### TC-TRES-05 — Search by ID
**Steps:** Type "TR-003".
**Expected:** TR-003 Chest X-Ray only.

### TC-TRES-06 — Status filter: Completed
**Steps:** Select Completed.
**Expected:** 4 rows: TR-001, TR-002, TR-003, TR-006.

### TC-TRES-07 — Type filter: Blood Test
**Steps:** Select Blood Test.
**Expected:** 3 rows: TR-001, TR-002, TR-004.

### TC-TRES-28 — Type filter: Urine Test
**Steps:** Select Urine Test.
**Expected:** 1 row — TR-006 Jessica Liu, Urine Analysis, 🧪 icon.

### TC-TRES-08 — Empty state
**Steps:** Search = "XXXXXXXX".
**Expected:** "No test results found" centered in table.

### TC-TRES-18 — Combined search + status filter
**Steps:** Search="John"; Status=Completed.
**Expected:** TR-001 only (John Doe, completed).

### TC-TRES-25 — Clear Filters button appears when active
**Steps:** Search="John".
**Expected:** "Clear Filters" button appears. Not visible when no filters set.

### TC-TRES-26 — Clear Filters resets all
**Steps:** Set search="John", Type="Blood Test", Status="Completed"; click Clear Filters.
**Expected:** All 6 rows shown. All 3 filters reset. Button disappears.

### TC-TRES-27 — Search case-insensitive
**Steps:** Type "sarah" (lowercase).
**Expected:** TR-002 found (same as "Sarah").

---

## 3. Table Display

### TC-TRES-15 — Status chip colors
**Steps:** View status chips.
**Expected:** Completed=green (success), Processing=yellow (warning), Pending=gray (default).

### TC-TRES-16 — Null completion date shows Pending chip
**Steps:** View TR-004 + TR-005 "Completed" column.
**Expected:** Chip label "Pending" (not a date).

### TC-TRES-17 — Type icons in table
**Steps:** View Test column.
**Expected:** Blood Test=🩸, X-Ray=🩻, MRI=🧠, Urine Test=🧪.

---

## 4. Result Detail Dialog

### TC-TRES-09 — Row click opens dialog
**Steps:** Click TR-001 row.
**Expected:** Dialog opens with test name, patient + ordered_by subtitle, values table.

### TC-TRES-10 — View icon opens dialog (no row propagation)
**Steps:** Click eye icon on TR-002.
**Expected:** Dialog open. Row onClick does not double-fire (e.stopPropagation).

### TC-TRES-11 — Processing result: empty state in dialog
**Steps:** Click TR-004 (processing).
**Expected:** "Results not yet available" text. No Download PDF.

### TC-TRES-12 — Pending result: empty state in dialog
**Steps:** Click TR-005 (pending).
**Expected:** "Results not yet available" text. No Download PDF.

### TC-TRES-19 — Close dialog
**Steps:** Open TR-001; click Close.
**Expected:** Dialog closes. Table re-shown.

---

## 5. Flag Colors in Dialog

### TC-TRES-13 — Normal flag = green
**Steps:** Open TR-001 dialog; view Hemoglobin.
**Expected:** Value text green (#0B7B5C). Chip green bg/text. Label "normal".

### TC-TRES-14 — High flag = red
**Steps:** Open TR-002 dialog; view HbA1c.
**Expected:** Value text red (#DC2626). Chip red bg/text. Label "high".

### TC-TRES-23 — Low flag = amber (TR-006 Ketones)
**Steps:** Open TR-006 dialog; view Ketones row.
**Expected:** Value text amber (#D97706). Chip amber bg/text. Label "low".

### TC-TRES-24 — Unknown flag fallback = grey
**Steps:** Inject mock row with flag='critical'.
**Expected:** Grey (#64748B) chip bg and text. No "undefined18" CSS error.

---

## 6. Download PDF

### TC-TRES-20 — Download PDF triggers file download
**Steps:** Open TR-001 dialog (completed); click Download PDF.
**Expected:** Browser downloads "TR-001-result.txt" with CBC values formatted as text lines.

---

## 7. Order Test Dialog

### TC-TRES-21 — Order Test button opens dialog
**Steps:** Click "Order Test" in header.
**Expected:** "Order New Test" dialog opens. Patient Name + Test Type fields visible.

### TC-TRES-22 — Submit disabled without patient
**Steps:** Open dialog; leave patient empty; inspect button.
**Expected:** Submit button disabled.

### TC-TRES-29 — Cancel closes dialog
**Steps:** Open dialog; click Cancel.
**Expected:** Dialog closes. No order placed.

### TC-TRES-30 — Successful submit
**Steps:** Enter patient="Emma Stone"; type=MRI; click Submit.
**Expected:** Dialog closes. Form resets to { patient:'', testType:'Blood Test' }.

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | Type dropdown options | "All" + 4 unique types derived from Set(MOCK_RESULTS.map(r => r.type)) |
| E2 | Unknown flag ('critical') | flagColor fallback #64748B — grey chip, no undefined CSS |
| E3 | Download PDF on processing result | "Download PDF" button not rendered (result.status !== 'completed') |
| E4 | Dialog close with keyboard (Esc) | Dialog closes (MUI Dialog onClose handles Esc by default) |
| E5 | Search clears → all rows returned | setSearch('') → filtered = all 6 records |
| E6 | Status + Type combined filter | Intersection: matchType && matchStatus both checked |
| E7 | Order Test type icons in select | TYPE_ICONS[t] shown: 🩸🩻🧠🧪🧬 per type |
| E8 | TR-006: 4 values including 'low' Ketones | all 4 rows shown in dialog, amber for Ketones |

---

## 8. Real API Integration (new — v3.0)

### TC-TRES-31 — Clinical values are withheld until status is completed, enforced server-side
**Steps:** Query `testResults` for a `pending` or `processing` row directly via the API (not just the UI).
**Expected:** `values: []` regardless of what's actually stored in the row — this must hold even for a caller who bypasses the UI entirely, since the UI hiding it is not the real enforcement point.

### TC-TRES-32 — `orderTest`'s `ordered_by` cannot be spoofed by the client
**Steps:** Call `orderTest` as a specific logged-in user; inspect the created row's `ordered_by`.
**Expected:** Matches the authenticated user's real name, derived server-side from the JWT — the mutation input has no `ordered_by` field at all for a client to supply.

### TC-TRES-33 — RBAC: only clinical/admin/staff roles can order a test
**Steps:** Attempt `orderTest` as `patient`, then as `clinician`.
**Expected:** Patient → `FORBIDDEN`. Clinician → succeeds.

### TC-TRES-34 — Auth expiry mid-session redirects cleanly, no crash
**Steps:** Let the 15-minute access token expire while on `/test-results`, then interact with the page (e.g. click a row).
**Expected:** Redirected to `/login`, no console error, no blank page — same behavior already confirmed on other real-backed pages this session (Clinics, Clinicians).

### TC-TRES-35 — Backend unreachable falls back to mock data with a visible warning
**Steps:** Stop the backend container, load `/test-results`.
**Expected:** An "Backend unavailable — showing sample data" alert renders (matches the pattern on `manager/clinics/index.jsx`/`admin/Organizations.jsx`), `MOCK_RESULTS`' 6 rows display, page remains fully usable (search/filter/dialog all still work against the mock data).

### TC-TRES-36 — Ordering a test while offline still succeeds locally (documented fallback, not a real order)
**Steps:** With the backend unreachable, submit "Order New Test".
**Expected:** New row appears in the local table (matches the pre-existing `SUG-TRES-008` mock-mode behavior), but no real `TestResults` row is created server-side — this is intentional offline-demo behavior, the same pattern used by `patients/index.jsx`'s `AddPatientDialog`, not a bug.

---

## Total: 30 Original Cases + 8 Edge Cases + 6 Real-API Cases (v3.0) = 36 + 8 Edge
