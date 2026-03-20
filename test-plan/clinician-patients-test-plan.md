# Clinician Patients — Test Plan (Session 4 Final)

**Route:** `/clinician/patients`  
**File:** `frontend/src/pages/clinician/Patients.jsx`  
**Related:** `frontend/src/pages/patients/detail.jsx`, `frontend/src/pages/booking/index.jsx`  
**Updated:** 2026-03-21 (Session 4 Final QA)

---

## Feature Overview

Clinician-facing patient list with:
- Header: "My Patients" + subtitle "{N} patients · {M} with upcoming"
- 4 KPI cards: Total (5), Active (3), New (1), Upcoming Appts (2)
- Search field with inline clear (✕) button; Unicode-normalised
- Results count badge: "N of 5 patients" when filtered
- Filter chips with count badges: All (5), Active (3), New (1), Inactive (1)
- Sortable table (name, dob, lastVisit, nextAppt, totalVisits, status)
- Empty state with icon, contextual message, and "Clear filters" button
- Pagination: 5/10/25/All rows per page; resets on sort/filter
- Row actions: View patient (teal → /patients/pt-:id), Book appointment (blue → /appointments/book with state)
- **Static MOCK_PATIENTS fallback (5 records): Alice Thompson, Marcus Chen, Fatima Al-Hassan, George Williams, Sophie Turner**
- **Patient detail: MOCK_PATIENTS_DETAIL keyed by pt-1..pt-5 (BUG-004 fix)**
- **Booking wizard: mock clinician fallback when navigated without :clinicianId (BUG-005 fix)**

---

## Data Reference

| ID | Name | Status | Condition | Next Appt |
|----|------|--------|-----------|-----------|
| pt-1 | Alice Thompson | active | Hypertension | 2026-03-20 |
| pt-2 | Marcus Chen | active | Asthma | — |
| pt-3 | Fatima Al-Hassan | new | Diabetes | — |
| pt-4 | George Williams | active | Cholesterol | 2026-03-25 |
| pt-5 | Sophie Turner | inactive | — | — |

---

## Test Cases

### TC-CLPAT-01 — Page Load
**Steps:** Navigate to /clinician/patients  
**Expected:**
- h2 "My Patients"
- Subtitle: "5 patients · 2 with upcoming appointments"
- 4 KPI cards: Total=5, Active=3, New=1, Upcoming=2
- Table with 5 rows, all columns visible, sortable headers

---

### TC-CLPAT-01B — Patient Column Avatar Initials
**Steps:** View patient column  
**Expected:** AT (Alice Thompson), MC (Marcus Chen), FA (Fatima Al-Hassan), GW (George Williams), ST (Sophie Turner)

---

### TC-CLPAT-02 — KPI Cards
**Steps:** View KPI cards  
**Expected:** Total=5, Active=3, New=1, Upcoming=2

---

### TC-CLPAT-03 — Search: By Name
**Steps:** Type "Alice"  
**Expected:** Only Alice Thompson shown

---

### TC-CLPAT-03B — Search: Case-Insensitive
**Steps:** Type "ALICE", then "alice thompson"  
**Expected:** Alice Thompson found both times

---

### TC-CLPAT-04 — Search: By Email
**Steps:** Type "marcus.chen"  
**Expected:** Only Marcus Chen shown

---

### TC-CLPAT-04B — Search: Partial Match
**Steps:** Type "gmail.com"  
**Expected:** Alice Thompson + Sophie Turner shown (both @gmail.com)

---

### TC-CLPAT-05 — Search: No Results → Empty State
**Steps:** Type "xyz999"  
**Expected:**
- PersonSearchIcon
- "No patients found"
- `No results for "xyz999". Try a different name or email.`
- "Clear filters" button resets both search and filter

---

### TC-CLPAT-06 — Filter: Active
**Steps:** Click "Active (3)" chip  
**Expected:** 3 patients: Alice Thompson, Marcus Chen, George Williams

---

### TC-CLPAT-07 — Filter: New
**Steps:** Click "New (1)" chip  
**Expected:** Only Fatima Al-Hassan

---

### TC-CLPAT-08 — Filter: Inactive
**Steps:** Click "Inactive (1)" chip  
**Expected:** Only Sophie Turner

---

### TC-CLPAT-09 — Filter: All (Default Reset)
**Steps:** Click "All (5)" chip  
**Expected:** All 5 patients; "All (5)" chip highlighted primary

---

### TC-CLPAT-10 — Filter + Search Combined
**Steps:** Filter=Active, search="Alice"  
**Expected:** Only Alice Thompson (AND logic)

---

### TC-CLPAT-11 — Condition Chip
**Steps:** View Condition column  
**Expected:**
- Alice: "Hypertension" (warning chip)
- Marcus: "Asthma" (warning chip)
- Fatima: "Diabetes" (warning chip)
- George: "Cholesterol" (warning chip)
- Sophie: "—" grey text

---

### TC-CLPAT-12 — Next Appointment Column
**Steps:** View Next Appointment column  
**Expected:**
- Alice: 📅 20/03/2026 (green)
- George: 📅 25/03/2026 (green)
- Marcus, Fatima, Sophie: "None" (grey)

---

### TC-CLPAT-13 — Total Visits Chips
**Steps:** View Total Visits column  
**Expected:** Alice=6, Marcus=3, Fatima=1, George=8, Sophie=2. Teal chip (#E8F8F9 bg)

---

### TC-CLPAT-14 — Status Chip Colours
**Steps:** View Status column  
**Expected:**
- Active: green (#D1FAE5 bg / #065F46 text)
- New: blue (#DBEAFE bg / #1E40AF text)
- Inactive: grey (#F3F4F6 bg / #6B7280 text)

---

### TC-CLPAT-14B — Status Chip Capitalization
**Steps:** View chip labels  
**Expected:** "Active", "New", "Inactive" (CSS textTransform: capitalize — not raw lowercase)

---

### TC-CLPAT-15 — View Patient: Correct Data (BUG-004 regression)
**Steps:** Click eye icon on Alice Thompson  
**Expected:**
- URL: /patients/pt-1
- Patient detail page header shows "Alice Thompson"
- NOT the default "John Michael Doe" fallback

---

### TC-CLPAT-16 — Book Appointment: No Error (BUG-005 regression)
**Steps:** Click calendar icon on any patient  
**Expected:**
- URL: /appointments/book
- Booking wizard loads with mock clinician (Dr. Sarah Mitchell)
- Time slots visible (09:00–17:00, 30-min intervals)
- NO "Clinician not found" error

---

### TC-CLPAT-16B — Booking Wizard Reads Pre-fill State
**Steps:** Navigate from patient list via book button  
**Expected:** `useLocation().state` contains `{ patientId, patientName }`

---

### TC-CLPAT-17 — Table Row Hover
**Steps:** Hover over any row  
**Expected:** Row background darkens (MUI `<TableRow hover>`)

---

### TC-CLPAT-18 — Unicode Name Search
**Steps:** Type "al-hassan"  
**Expected:** Fatima Al-Hassan found (Unicode normalization strips diacritics)

---

### TC-CLPAT-19 — Sort: Patient Name Column
**Steps:** Click "Patient" header  
**Expected:** Ascending: Alice, Fatima, George, Marcus, Sophie. Click again: reversed.

---

### TC-CLPAT-20 — Sort: Next Appointment Column
**Steps:** Click "Next Appointment" header (asc)  
**Expected:** Alice (2026-03-20), George (2026-03-25) first; nulls treated as '' (sort to start)

---

### TC-CLPAT-21 — Empty State: Filter Causes No Results
**Steps:** Set filter=Inactive, search="xyz"  
**Expected:** Empty state with contextual message about search. "Clear filters" resets both.

---

### TC-CLPAT-22 — Unicode-Safe Search with ASCII Input
**Steps:** Type "al-hassan" (ASCII, no special chars)  
**Expected:** Fatima Al-Hassan found (normalise() strips diacritics from both sides)

---

### TC-CLPAT-23 — Inline Search Clear Button
**Steps:** Type "Alice"; click ✕ button inside search field  
**Expected:** Search clears; all 5 patients return; page resets to 0

---

### TC-CLPAT-24 — Results Count Badge
**Steps:** Search "Alice"  
**Expected:** Badge shows "1 of 5 patients"; when cleared shows "5 patients"

---

### TC-CLPAT-25 — Pagination Default 5 Rows
**Steps:** View page  
**Expected:** TablePagination visible with options 5, 10, 25, All

---

### TC-CLPAT-26 — Pagination Resets on Filter
**Steps:** Change rows/page to 10, then switch filter chip  
**Expected:** Automatically returns to page 0

---

### TC-CLPAT-27 — Pagination Resets on Sort
**Steps:** Click any sortable header  
**Expected:** Page auto-resets to 0

---

### TC-CLPAT-28 — View Icon Colour
**Steps:** View Actions column eye icon  
**Expected:** Teal (#006D77); hover background #E8F8F9

---

### TC-CLPAT-29 — Book Icon Colour
**Steps:** View Actions column calendar icon  
**Expected:** Blue (#3A86FF); hover background #EFF6FF; visually distinct from view icon

---

### TC-CLPAT-30 — Patient Detail Tabs (Session 4)
**Steps:** Click View Patient, then click each tab  
**Expected:** Overview, Medical History, Appointments, Test Results, Documents tabs all render without errors

---

### TC-CLPAT-31 — Booking Wizard Mock Services (Session 4)
**Steps:** Navigate to /appointments/book from patient list; reach Step 3 (Choose Service)  
**Expected:** At least 3 service cards shown (General Consultation £75, Video Consultation £60, Extended Consultation £120)

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | 0 patients (MOCK_PATIENTS=[]) | Empty state; KPI cards=0 |
| E2 | Clear search after typing | All 5 patients restored |
| E3 | Active filter + empty search | AND logic; all active patients |
| E4 | Patient email = undefined/null | No crash — `(p.email ?? '').toLowerCase()` |
| E5 | Single-word patient name | lastName='' — avatar shows first initial only |
| E6 | Sort + Filter + Search combined | All applied; sort applied last on filtered result |
| E7 | Unicode search (ASCII for accented name) | Diacritic-normalised search finds match |
| E8 | Pagination with filtered results | Pagination count = filtered.length |
| E9 | Sort changes while on page > 0 | Page auto-resets to 0 |
| E10 | Patient detail with unknown ID | Falls back to MOCK_PATIENT_DEFAULT gracefully |
| E11 | Book wizard without clinicianId param | Mock clinician shown, no error |

---

## Session Summary

| Session | TCs | Bugs Fixed | Suggestions |
|---------|-----|------------|-------------|
| Session 1 | 16 | baseline | — |
| Session 2 | +10 | BUG-001,002,003 | SUG-001..009 |
| Session 3 | +8 | flagged 004,005 | SUG-010..013 |
| Session 4 | +2 | BUG-004 ✅, BUG-005 ✅ | SUG-016, 017 (new) |
| **Total** | **36** | **5 bugs** | **17 suggestions** |
