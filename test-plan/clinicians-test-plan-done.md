# Clinicians — Test Plan (Session 3 Final)

**Feature area:** `/src/pages/clinicians/` and `/src/pages/clinician/`  
**Files:** `index.jsx`, `detail.jsx`, `CreateClinicianPage.jsx`, `EditClinicianPage.jsx`, `Dashboard.jsx`, `Calendar.jsx`, `Availability.jsx`  
**Routes:** `/clinicians`, `/clinicians/:id`, `/clinicians/new`, `/clinicians/:id/edit`, `/clinician/dashboard`, `/clinician/calendar`, `/clinician/availability`  
**Access:** Admin (clinician management), Clinician (portal pages)  
**Updated:** 2026-03-21 (Session 3 — 3 new TCs, edge cases added)

---

## Feature Overview

### Clinicians List (`/clinicians`)
- 8 MOCK_CLINICIANS records (7 active, 1 inactive)
- Search bar: useMemo filter on `full_name` + `clinician_type.name`
- Specialization dropdown: dynamically built from clinician data
- Clinic dropdown: named clinics from `clinics[]` array
- Status toggle: All / Active / Inactive (ToggleButtonGroup)
- Empty state: "No clinicians found / Try adjusting your filters"
- Cards: name, specialty chip, clinic, fee badge, services chips, availability heatmap, status toggle, View Profile button

### Clinician Detail (`/clinicians/:id`)
- Profile: name, specialization, rating, contact, bio, education
- Schedule tab: Mon–Sun availability from `availability_templates`
- Edit button → Edit Clinician page

### Create Clinician (`/clinicians/new`)
- 4-section form: Personal Info, Professional Info, Assignments, Status
- MockStore.createClinician() on submit
- Email regex validation

### Edit Clinician (`/clinicians/:id/edit`)
- Three-tier data lookup: GraphQL → MockStore → MOCK_EDIT_DATA
- Offline save fallback: MockStore.updateClinician() when mutation fails

### Clinician Portal (`/clinician/*`)
- Dashboard: MOCK_APPOINTMENTS, KPI cards, daily schedule
- Calendar: MOCK_EVENTS, week grid, color-coded blocks
- Availability: MOCK_AVAILABILITY, 7-column grid, Add Slot drawer

---

## Test Cases

### TC-CLIN-001 — List renders clinicians
**Steps:** Log in as Admin. Navigate to /clinicians.  
**Expected:**
- 8 clinician cards rendered
- Each card: name, specialty chip, clinic, fee badge, availability heatmap, status toggle

---

### TC-CLIN-002 — Search by clinician name
**Steps:** Type "Mitchell" in search field.  
**Expected:**
- Only Dr. Sarah Mitchell shown (1 card)
- Subtitle: "1 clinician"
- Clearing search returns all 8

---

### TC-CLIN-003 — Specialization filter dropdown
**Steps:** Open Specialization dropdown → select "Cardiologist".  
**Expected:**
- 2 cards: Dr. Carlos Vega, Dr. Michael Patel
- Reset to "All Specializations" → 8 cards

---

### TC-CLIN-004 — Status toggle
**Steps:** Click Inactive → Active → All  
**Expected:**
- Inactive: 1 card (Dr. Omar Hassan)
- Active: 7 cards
- All: 8 cards

---

### TC-CLIN-005 — View Profile navigation
**Steps:** Click "View Profile" on any card.  
**Expected:** Navigate to /clinicians/{id}. Profile page loads.

---

### TC-CLIN-006 — Profile: all sections
**Steps:** View clinician detail page.  
**Expected:** Name, specialty, star rating, contact, bio, education, Schedule tab all visible.

---

### TC-CLIN-007 — Schedule tab: availability
**Steps:** Click Schedule tab on profile.  
**Expected:**
- Mon–Fri slots from `availability_templates`
- Weekend days show "Unavailable"

---

### TC-CLIN-008 — Create form sections
**Steps:** Navigate to /clinicians/new.  
**Expected:** 4 sections: Personal Info, Professional Info, Assignments, Status. Required fields marked *.

---

### TC-CLIN-009 — Email validation: invalid format
**Steps:** Type "notanemail" in Email field → click Save.  
**Expected:** "Invalid email format" error shown.  
**NOT expected:** "Required" when value is present.

---

### TC-CLIN-010 — Email validation: blank
**Steps:** Leave Email empty → click Save.  
**Expected:** "Required" error shown.

---

### TC-CLIN-011 — Edit form pre-fills (offline)
**Steps:** Navigate to /clinicians/c1/edit.  
**Expected:**
- First Name "Jane", Last Name "Smith", Email "jane.smith@medibook.com" pre-filled
- Three-tier lookup resolves without backend

---

### TC-CLIN-012 — Save updated clinician (offline fallback)
**Steps:** Change a field → click Save Changes.  
**Expected:**
- GraphQL mutation fails (backend offline)
- MockStore.updateClinician() called as fallback
- Snackbar: "Clinician updated (offline mode)"
- No crash or blank page

---

### TC-CLIN-013 — Clinician portal: Dashboard
**Steps:** Navigate to /clinician/dashboard.  
**Expected:**
- 4 KPI cards (Total Today 5, Completed 1, Remaining 7, Video Calls 1)
- Daily schedule timeline with appointments
- "Offline — showing demo data" banner visible

---

### TC-CLIN-014 — Clinician portal: Calendar
**Steps:** Navigate to /clinician/calendar.  
**Expected:**
- Week grid with color-coded appointment blocks (In-Person/Video/Break/Blocked)
- Current time line visible

---

### TC-CLIN-015 — Clinician portal: Availability
**Steps:** Navigate to /clinician/availability.  
**Expected:**
- 7-column day grid
- 5 Mon–Fri slots pre-populated
- Lunch break section visible
- Add Slot button opens drawer

---

### TC-CLIN-016 — Clinic filter dropdown
**Steps:** Select "Central Medical Centre" from Clinic dropdown.  
**Expected:**
- 4 cards shown (clinicians assigned to that clinic)
- Reset to "All Clinics" returns 8

---

### TC-CLIN-017 — Empty state when no results match (new)
**Steps:** Type "xyznotfound" in search field.  
**Expected:**
- Grid cleared (0 cards)
- Subtitle: "0 clinicians"
- Body: "No clinicians found / Try adjusting your filters"

---

### TC-CLIN-018 — Consultation fee badge visible on card (new)
**Steps:** View any active clinician card.  
**Expected:**
- Fee badge showing "£XX.XX per consultation"
- $ icon + formatted GBP amount visible

---

### TC-CLIN-019 — Combined filters: AND logic (new)
**Steps:** Search "Vega" AND select Specialization=Cardiologist.  
**Expected:**
- Only Dr. Carlos Vega shown (AND logic applies all 4 dimensions)

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | MOCK_CLINICIANS empty | Empty state: "No clinicians found" |
| E2 | Search term matches specialty not name | Clinician found (useMemo checks both name AND specialty) |
| E3 | All 4 filters set simultaneously | AND logic — only exact match shown; no crashes |
| E4 | No clinicians in selected clinic | Empty state shown (0 clinicians) |
| E5 | Backend offline on list page | Banner shown; mock data renders; no blank page |
| E6 | Backend offline on edit page | Three-tier fallback resolves; form pre-filled |
| E7 | Edit form submit while offline | MockStore.updateClinician() fallback; snackbar |
| E8 | Create form empty submit | All required field errors shown simultaneously |
| E9 | Email with extra spaces | Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` may not trim — known limitation |
| E10 | Clinician with no services | Services chips section absent or empty; no crash |
| E11 | Clinician with no availability_templates | "Unavailable" shown for all 7 days in Schedule tab |

---

## Mock Data Reference

| ID | Name | Type | Status | Clinics |
|----|------|------|--------|---------|
| c1 | Dr. Jane Smith | General Practitioner | active | Central Medical Centre |
| c2 | Dr. Carlos Vega | Cardiologist | active | Central Medical Centre |
| c3 | Dr. Amy Chen | Physiotherapist | active | North Clinic |
| c4 | Dr. Omar Hassan | Psychiatrist | inactive | East Health Centre |
| c5 | Dr. Sarah Williams | Dermatologist | active | Central Medical Centre |
| c6 | Dr. Rachel Foster | General Practitioner | active | West Medical Group |
| c7 | Dr. James Lee | Orthopedic Surgeon | active | South Hospital |
| c8 | Dr. Michael Patel | Cardiologist | active | North Clinic |

---

## Session Summary

| Session | TCs | Status |
|---------|-----|--------|
| Session 1 (2026-03-16) | 15 | Initial baseline — 11 PASS, 3 PARTIAL |
| Session 2 (2026-03-20) | +1 (TC-016) | 15 PASS, 1 PARTIAL |
| Session 3 (2026-03-21) | +3 (TC-017/018/019) | **19 PASS, 0 PARTIAL, 0 FAIL** ✅ |
| **Session 4 (2026-03-30)** | **+4 (TC-020/021/022/023)** | **23 PASS, 0 PARTIAL, 0 FAIL** ✅ |

---

## Session 4 Test Cases (TC-CLIN-020 to TC-CLIN-023)

### TC-CLIN-020 — Inactive Card Visual Distinction (SUG-013)
**Steps:** View /clinicians in All or Inactive filter.  
**Expected:** Inactive card (Dr. Omar Hassan) has `opacity: 0.70` + `filter: grayscale(30%)` — visually distinct from active cards. Transition: 0.2s ease.

---

### TC-CLIN-021 — Filter Dropdown Count Badges (SUG-014)
**Steps:** Open Specialization dropdown.  
**Expected:** Each option shows a teal count chip (e.g. "Cardiologist" → "2"). Open Clinic dropdown — same.  
**Edge:** Counts reflect full unfiltered list, not current filtered view.

---

### TC-CLIN-022 — Clear All Filters Button (SUG-015)
**Steps:**
1. Apply any filter (e.g. search "Mitchell") → assert red "Clear Filters" button appears.
2. Click "Clear Filters" → assert all 4 filters reset to defaults (search='', specialty='', clinic='', active='all').
3. No filter active → "Clear Filters" button hidden.

---

### TC-CLIN-023 — Availability Heatmap Full Day Tooltips (SUG-016)
**Steps:** Hover each day chip in AvailabilityHeatmap.  
**Expected:** Tooltip shows full name: "Mo" → "Monday", "Th" → "Thursday", "Sa" → "Saturday" etc.  
**Edge:** Grey (inactive) chips also show full day name on hover.
