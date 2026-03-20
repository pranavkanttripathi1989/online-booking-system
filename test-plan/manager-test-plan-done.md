# Manager Module — Test Plan (Done)

**Version:** 1.0  
**Date:** 2026-03-20  
**Status:** Completed QA cycle

---

## Coverage Areas

- Clinics: list, search, filter, create navigation, edit navigation, detail
- Rooms: tab filter, card rendering, status chips, navigation
- Services: list rendering, category sidebar, search, create/edit navigation
- Availability: list rendering, create form, dropdown validation
- Blocks: tab toggle, spacer/room block forms, dropdown validation
- Products: list rendering, category/subcategory management, create/edit navigation

---

## Test Cases

### TC-MGR-001 — Clinic list renders
- **Preconditions:** Logged in as admin/manager
- **Steps:** Navigate to `/manager/clinics`
- **Expected:** 4 clinic cards (City Heart Clinic, Central Medical Centre, Family Health Hub, Westside Physio & Sports); KPI row: Total Clinics=4, Active=3, Clinicians=15, Bookings=73; "Add Clinic" CTA visible
- **Result:** ✅ PASS

### TC-MGR-002 — Create new clinic navigation
- **Preconditions:** On `/manager/clinics`
- **Steps:** Click "Add Clinic"
- **Expected:** Navigates to `/manager/clinics/new`; create form visible
- **Result:** ✅ PASS

### TC-MGR-003 — Edit clinic navigation
- **Preconditions:** On `/manager/clinics`
- **Steps:** Click the edit icon on any clinic card
- **Expected:** Navigates to `/manager/clinics/[id]/edit`
- **Result:** ⚠️ PARTIAL (navigation confirmed, form rendering had minor delay)

### TC-MGR-004 — Clinic detail page
- **Preconditions:** On `/manager/clinics`
- **Steps:** Click the view (eye) icon on any clinic card
- **Expected:** Detail page loads with clinic name, address, stats
- **Result:** ✅ PASS

### TC-MGR-005 — Rooms tab
- **Preconditions:** On `/manager/clinics`
- **Steps:** Click the "Rooms" tab
- **Expected:** Room cards: Room 1A, 2B, 3C, Suite A; equipment chips; status chips (In-Use / Available)
- **Result:** ✅ PASS

### TC-MGR-006 — Room detail/edit navigation
- **Preconditions:** On Rooms tab
- **Steps:** Click action button on a room card
- **Expected:** Navigates to room edit/detail URL
- **Result:** ✅ PASS

### TC-MGR-007 — Services list renders
- **Preconditions:** Logged in as admin
- **Steps:** Navigate to `/manager/services`
- **Expected:** 6 service cards (GP Consultation, Blood Test, X-Ray, Physiotherapy, Dermatology Review, ECG Recording); category sidebar with 4 categories; search bar; "Add Service" CTA
- **Result:** ✅ PASS (after BUG-MGR-003 fix)

### TC-MGR-008 — Create service navigation
- **Preconditions:** On `/manager/services`
- **Steps:** Click "Add Service"
- **Expected:** Navigates to `/manager/services/new`
- **Result:** ✅ PASS

### TC-MGR-009 — Edit service navigation
- **Preconditions:** On `/manager/services`
- **Steps:** Click edit icon on a service card
- **Expected:** Navigates to `/manager/services/[id]/edit`
- **Result:** ✅ PASS

### TC-MGR-010 — Availability renders
- **Preconditions:** Logged in as admin
- **Steps:** Navigate to `/manager/availability`
- **Expected:** "Clinician Availability" heading; table headers: Clinician, Clinic, Time, Recurrence, Valid Period; graceful empty state
- **Result:** ✅ PASS

### TC-MGR-011 — Availability form dropdowns
- **Preconditions:** On `/manager/availability`
- **Steps:** Click "Add Availability"
- **Expected:** Inline form opens; Clinician dropdown: Dr. Sarah Mitchell, Dr. James Okafor, Dr. Priya Sharma; Clinic dropdown: City Heart Clinic, Central Medical Centre, Family Health Hub; Recurrence/time fields present
- **Result:** ✅ PASS (after BUG-MGR-002 fix)

### TC-MGR-012 — Blocks form dropdowns
- **Preconditions:** Navigate to `/manager/blocks`
- **Steps:** Click "Add Spacer Block"
- **Expected:** Form opens with Clinician dropdown populated, Clinic dropdown populated; "Add Room Block" tab also works
- **Result:** ✅ PASS (after BUG-MGR-001 fix)

### TC-MGR-013 — Products list renders
- **Preconditions:** Navigate to `/manager/products`
- **Steps:** Wait for load
- **Expected:** Product cards: Vitamin D3 1000IU, Paracetamol 500mg, Blood Glucose Monitor, Omega-3 Fish Oil, First Aid Kit; Products/Categories tabs visible
- **Result:** ✅ PASS (after BUG-MGR-004 fix)

### TC-MGR-014 — Products categories tab
- **Preconditions:** On `/manager/products`
- **Steps:** Click "Categories" tab; click "Add Category"
- **Expected:** Category list: Supplements, Pharmacy, Equipment; form opens with Name/Description fields
- **Result:** ⚠️ PARTIAL (category list confirmed; form open not fully verified by automation)

---

## New Edge Case Test Cases (Added in v1.0)

### TC-MGR-015 — Availability form: time validation
- **Steps:** Submit form with End Time before Start Time
- **Expected:** Validation error "End time must be after start time"
- **Status:** Code review PASS (validation exists in `handleSubmit`)

### TC-MGR-016 — Availability form: date range validation
- **Steps:** Set Valid Until before Valid From
- **Expected:** Validation error '"Valid Until" cannot be before "Valid From"'
- **Status:** Code review PASS (validation exists)

### TC-MGR-017 — Services: category filter
- **Steps:** Click "Diagnostics" in sidebar
- **Expected:** Only Diagnostics services shown (Blood Test, X-Ray, ECG)
- **Status:** Deferred — requires backend/mock category-product linking

---

## Bugs Fixed in This Cycle

| ID | Component | Description | Status |
|----|-----------|-------------|--------|
| BUG-MGR-001 | Blocks.jsx | Clinician/Clinic/Room dropdowns empty in mock mode | ✅ Fixed |
| BUG-MGR-002 | Availability.jsx | Clinician/Clinic dropdowns empty in mock mode | ✅ Fixed |
| BUG-MGR-003 | services/index.jsx | React crash — missing FormControl import; mock data in render body | ✅ Fixed |
| BUG-MGR-004 | products/index.jsx | Empty product/category lists with error banner in mock mode | ✅ Fixed |
