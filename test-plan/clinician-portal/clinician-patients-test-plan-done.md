# Clinician Patients — Test Plan (Updated Session 3)

**Route:** `/clinician/patients`  
**File:** `frontend/src/pages/clinician/Patients.jsx`  
**Updated:** 2026-03-20 (Session 3 QA)

---

## Feature Overview

Clinician-facing patient list with:
- Header: "My Patients" + subtitle "{N} patients · {M} with upcoming"
- 4 KPI cards: Total (5), Active (3), New (1), Upcoming Appts (2)
- Search field with inline clear (✕) button; Unicode-normalised (SUG-010)
- Results count badge: "1 of 5 patients" when filtered
- Filter chips with count badges: All (5), Active (3), New (1), Inactive (1)
- Sortable table (name, dob, lastVisit, nextAppt, totalVisits, status)
- Empty state with icon, contextual message, and "Clear filters" button
- Pagination: 5/10/25/All rows per page (SUG-012); resets on sort/filter
- Row actions: View patient (teal icon → /patients/:id), Book appointment (blue icon → /appointments/book w/ state)
- Static MOCK_PATIENTS fallback (5 records)

---

## Test Cases

### TC-CLPAT-01 — Page Load
**Steps:** Navigate to /clinician/patients  
**Expected:**
- h2 "My Patients"
- Subtitle: "5 patients · 2 with upcoming appointments"
- 4 KPI cards: 5 / 3 / 1 / 2
- Filter chips with count badges
- Table with 5 rows, all columns including sortable headers

---

### TC-CLPAT-01B — Avatar Initials
**Steps:** View patient column  
**Expected:** EW, OH, LC, JB, SM initials. All teal background.

---

### TC-CLPAT-02 — KPI Cards (CORRECTED: Active=3)
**Steps:** View KPI cards  
**Expected:** Total=5, **Active=3** (Emma+Omar+James), New=1, Upcoming=2  
> ⚠️ Test plan corrected from Session 1: Active was wrong as "2"

---

### TC-CLPAT-03 — Search: By Name
**Steps:** Type "Emma"  
**Expected:** Only Emma Wilson shown

---

### TC-CLPAT-03B — Search: Case-Insensitive
**Steps:** Type "EMMA", then "emma wilson"  
**Expected:** Emma Wilson found both times

---

### TC-CLPAT-04 — Search: By Email
**Steps:** Type "lily@email.com"  
**Expected:** Only Lily Chen

---

### TC-CLPAT-04B — Search: Partial Email
**Steps:** Type "email.com"  
**Expected:** Emma, Omar, Lily shown; James and Sophie hidden (@mail.com)

---

### TC-CLPAT-05 — Search: No Results → Empty State
**Steps:** Type "xyz123"  
**Expected:**
- PersonSearchIcon
- "No patients found"
- `No results for "xyz123". Try a different name or email.`
- "Clear filters" button — clicking resets both search and filter

---

### TC-CLPAT-06 — Filter: Active (CORRECTED: 3 patients)
**Steps:** Click "Active (3)" chip  
**Expected:** 3 patients: Emma Wilson, Omar Hassan, James Brown  
> ⚠️ Test plan corrected from Session 1: was "2 patients"

---

### TC-CLPAT-07 — Filter: New
**Steps:** Click "New (1)" chip  
**Expected:** Only Lily Chen

---

### TC-CLPAT-08 — Filter: Inactive
**Steps:** Click "Inactive (1)" chip  
**Expected:** Only Sophie Müller

---

### TC-CLPAT-09 — Filter: All (Default Reset)
**Steps:** Click "All (5)" chip  
**Expected:** All 5 patients; "All (5)" chip filled/primary (teal)

---

### TC-CLPAT-10 — Filter + Search Combined
**Steps:** Filter=Active, search="Emma"  
**Expected:** Only Emma Wilson (AND logic — both must match)

---

### TC-CLPAT-11 — Condition Chip
**Steps:** View Condition column  
**Expected:**
- Emma: "Hypertension" chip (warning/amber)
- Omar: "Arrhythmia" chip
- Lily: "—" grey text
- James: "Cholesterol" chip
- Sophie: "—" grey text

---

### TC-CLPAT-12 — Next Appointment Column
**Steps:** View Next Appointment column  
**Expected:**
- Emma: 📅 2026-03-20 (green)
- James: 📅 2026-03-25 (green)
- Omar, Lily, Sophie: "None" (grey text)

---

### TC-CLPAT-13 — Total Visits Chips
**Steps:** View Total Visits column  
**Expected:** Emma=6, Omar=3, Lily=1, James=8, Sophie=2. Teal #E8F8F9 background.

---

### TC-CLPAT-14 — Status Chip Colours
**Steps:** View Status column  
**Expected:**
- Active: green (#D1FAE5 bg / #065F46 text)
- New: blue (#DBEAFE bg / #1E40AF text)
- Inactive: grey (#F3F4F6 bg / #6B7280 text)

---

### TC-CLPAT-14B — Status Chip Capitalization
**Steps:** View status chip labels  
**Expected:** "Active", "New", "Inactive" (CSS textTransform: capitalize)

---

### TC-CLPAT-15 — Action: View Patient
**Steps:** Click eye icon on Emma Wilson  
**Expected:** Navigate to /patients/1. Tooltip "View Emma Wilson's details" shown on hover.

---

### TC-CLPAT-16 — Action: Book Appointment with Patient Context
**Steps:** Click book icon on James Brown  
**Expected:**
- Navigate to /appointments/book
- Router state: `{ patientId: 4, patientName: 'James Brown' }`
- Tooltip "Book appointment for James Brown" shown on hover

---

### TC-CLPAT-16B — Booking Wizard Reads Pre-fill State
**Steps:** Post-navigate to /appointments/book from patient list  
**Expected:** `useLocation().state` contains `{ patientId: 4, patientName: 'James Brown' }`

---

### TC-CLPAT-17 — Table Row Hover
**Steps:** Hover over any row  
**Expected:** Row background darkens (MUI `<TableRow hover>` style)

---

### TC-CLPAT-18 — Unicode Name Search
**Steps:** Type "müller" (with ü)  
**Expected:** Sophie Müller found  
**Steps:** Type "muller" (without ü)  
**Expected:** No match (known JS limitation — no Unicode normalization)

---

### TC-CLPAT-19 — Sortable Column: Name
**Steps:** Click "Patient" header  
**Expected:** Ascending alpha order: Emma, James, Lily, Omar, Sophie. Click again: reversed.

---

### TC-CLPAT-20 — Sortable Column: Next Appointment
**Steps:** Click "Next Appointment" header  
**Expected:** Patients with appointments first (asc). Null values sort as empty string.

---

### TC-CLPAT-21 — Empty State: Filter → No Results
**Steps:** Set filter=Inactive, search="xyz"  
**Expected:**
- "No patients found"
- `No results for "xyz". Try a different name or email.`
- "Clear filters" button resets both

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | 0 patients (MOCK_PATIENTS=[]) | Empty state in table body; KPI cards=0 |
| E2 | Clear search after typing | All patients restored |
| E3 | Active filter + empty search | AND logic; empty if no active patients |
| E4 | Patient email = undefined/null | `(p.email ?? '').toLowerCase()` — no crash |
| E5 | Single-word name (no space) | lastName='' — avatar shows first initial only |
| E6 | Sort + Filter + Search combined | All applied in sequence: filter → sort → render |

---

---

## Session 3 New Test Cases

### TC-CLPAT-22 — Unicode-Safe Search
**Steps:** Type "al-hassan" (no special chars) in search  
**Expected:** Fatima Al-Hassan found (normalize strips diacritics from both sides)

---

### TC-CLPAT-23 — Inline Search Clear Button
**Steps:** Type "Alice"; click ✕ button inside search field  
**Expected:** Search clears; all 5 patients return; page resets to 0

---

### TC-CLPAT-24 — Results Count Badge
**Steps:** Search any term; observe count in top-right of filter row  
**Expected:** "N of 5 patients" when filtered; "5 patients" when all shown

---

### TC-CLPAT-25 — Pagination Default 5 Rows
**Steps:** View page without any filter  
**Expected:** TablePagination bar visible; dropdown options: 5, 10, 25, All

---

### TC-CLPAT-26 — Pagination Resets on Filter Change
**Steps:** Go to page 2 (if present); switch filter chip  
**Expected:** Automatically returns to page 0

---

### TC-CLPAT-27 — Pagination Resets on Sort
**Steps:** Go to page 2 (if present); click any sortable column header  
**Expected:** Automatically returns to page 0

---

### TC-CLPAT-28 — View Patient Icon Teal
**Steps:** Observe eye icon in Actions column  
**Expected:** Teal (#006D77) colour; hover shows light teal bg (#E8F8F9)

---

### TC-CLPAT-29 — Book Appointment Icon Blue
**Steps:** Observe calendar icon in Actions column  
**Expected:** Blue (#3A86FF) colour; visually distinct from View icon; hover shows light blue bg

---

## Session 3 Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E7 | Search ASCII for Unicode name | Diacritic-normalised search finds match |
| E8 | Pagination with filtered results | Count reflects filtered.length not total |
| E9 | Sort changes while on page > 0 | Page auto-resets to 0 |

---

## Summary

| TC Range | Count | Session |
|----------|-------|---------|
| TC-CLPAT-01 to TC-CLPAT-16 | 16 | Session 1 (corrected in S2) |
| TC-CLPAT-01B to TC-CLPAT-21 | 10 | Session 2 (new cases) |
| TC-CLPAT-22 to TC-CLPAT-29 | 8 | Session 3 (new cases) |
| Edge Cases E1–E6 | 6 | Sessions 1–2 |
| Edge Cases E7–E9 | 3 | Session 3 |
| **Total** | **43** | |
