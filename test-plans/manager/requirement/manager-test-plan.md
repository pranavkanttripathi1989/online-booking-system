---
id: TP015
type: test-plan
feature: manager
created: 2026-04-02
updated: 2026-04-02
status: approved
parent: unknown
related: [TR014, TS014]
---

# Manager Module — Comprehensive Test Plan

**Feature:** Manager Module — Availability, Blocks, Clinics, Dashboard, Products, Services, Rooms
**Routes:** `/manager/*`
**Created:** 2026-03-31 (Session QA)
**Type:** Integration / Smoke-test (cross-module)

---

## Feature Overview

The Manager module is a multi-page section covering:
- **Clinics** — list, create, edit, detail + embedded rooms tab
- **Availability** — clinician schedule slots with recurrence
- **Blocks** — spacer/room schedule blocks
- **Dashboard** — KPI charts + upcoming appointments summary
- **Products** — inventory management with categories/subcategories
- **Services** — service catalogue with category sidebar + dialog CRUD

Each sub-module has its own detailed test plan. This plan covers **integration smoke tests** across all sub-modules and tests for shared module-level improvements (mock data, offline UX, shared reference data).

---

## Test Cases — Clinics

### TC-MGR-001 — Clinic List Renders
**Steps:** Navigate to `/manager/clinics`.
**Expected:** 4 clinic cards rendered with KPI row (Total Clinics, Active, Clinicians, Today's Bookings). "Add Clinic" button visible.

---

### TC-MGR-002 — Create Clinic Navigation
**Steps:** Click "Add Clinic".
**Expected:** Navigates to `/manager/clinics/new`. Create form renders correctly.

---

### TC-MGR-003 — Edit Clinic Navigation (Uses Correct ID)
**Steps:** Click edit icon on any clinic card.
**Expected:** Navigates to `/manager/clinics/{clinic.id}/edit` — NOT a hardcoded ID like `cl-001`.

---

### TC-MGR-004 — Clinic Detail Page
**Steps:** Click into a clinic.
**Expected:** Detail page renders with clinic name, address, stats.

---

### TC-MGR-005 — Rooms Tab on Clinic Detail
**Steps:** Click "Rooms" tab on clinic detail.
**Expected:** Rooms list shows Room 1A, 2B, 3C, Suite A with equipment chips. Status chips (In-Use/Available) visible.

---

### TC-MGR-006 — Room Edit Navigation
**Steps:** Click room action button.
**Expected:** Navigates to `/manager/rooms/{room.id}/edit`.

---

## Test Cases — Services

### TC-MGR-007 — Services List Renders (Mock Mode)
**Steps:** Navigate to `/manager/services` with backend offline.
**Expected:** 6 service cards render (GP Consultation, Blood Test, X-Ray, Physiotherapy, Dermatology, ECG). Category sidebar shows 4 categories.

---

### TC-MGR-007B — Offline Banner Shown
**Steps:** View `/manager/services` with backend offline.
**Expected:** Blue info Alert: "Demo mode — Showing sample data. Backend is offline or unreachable."

---

### TC-MGR-008 — Create Service Navigation
**Steps:** Click "Add Service".
**Expected:** Navigates to `/manager/services/new`. Create form renders.

---

### TC-MGR-009 — Edit Service Navigation
**Steps:** Click edit icon on service card.
**Expected:** Navigates to `/manager/services/{product.id}/edit`.

---

## Test Cases — Availability

### TC-MGR-010 — Availability Renders
**Steps:** Navigate to `/manager/availability`.
**Expected:** "Clinician Availability" heading, table with column headers, graceful empty state with "No availability records yet".

---

### TC-MGR-011 — Availability Form Dropdowns Populated
**Steps:** Click "Add Availability".
**Expected:** Inline form opens. Clinician dropdown lists at least 3 clinicians. Clinic dropdown lists at least 3 clinics. Recurrence options visible.

---

### TC-MGR-011B — Valid Until Helper Text
**Steps:** View the "Valid Until" field in the Add Availability form.
**Expected:** Helper text reads "Leave blank for no end date" below the date input.

---

### TC-MGR-011C — End Time Before Start Time Rejected
**Steps:** Set start_time = 14:00, end_time = 13:00. Submit.
**Expected:** Validation error shown; form does not submit.

---

## Test Cases — Blocks

### TC-MGR-012 — Blocks Renders and Form Populated
**Steps:** Navigate to `/manager/blocks`.
**Expected:** "Schedule Blocks" heading. Spacer/Room Blocks toggle. "Add Spacer Block" form shows populated Clinician and Clinic dropdowns (not empty).

---

### TC-MGR-012B — End Time Validation
**Steps:** In "Add Spacer Block" form, set end_time before start_time.
**Expected:** Validation error; form submission blocked.

---

## Test Cases — Products

### TC-MGR-013 — Products List Renders (Mock Mode)
**Steps:** Navigate to `/manager/products` with backend offline.
**Expected:** 5 product cards: Vitamin D3, Paracetamol, Blood Glucose Monitor, Omega-3, First Aid Kit.

---

### TC-MGR-013B — Offline Banner Shown
**Steps:** View `/manager/products` with backend offline.
**Expected:** Blue info Alert: "Demo mode — Showing sample data. Backend is offline or unreachable."

---

### TC-MGR-014 — Products Categories Tab
**Steps:** Click "Categories" tab.
**Expected:** Supplements, Pharmacy, Equipment cards shown. "Add Category" button visible.

---

## Test Cases — Mock Data Consistency

### TC-MGR-015 — Shared Clinician Names Consistent
**Steps:** Compare clinician dropdown in Blocks form, Availability form.
**Expected:** Same clinician names appear in both (Dr. Sarah Mitchell, Dr. James Okafor, Dr. Priya Sharma).

---

### TC-MGR-016 — Shared Clinic Names Consistent
**Steps:** Compare clinic dropdown in Blocks and Availability forms.
**Expected:** Clinics from `src/mocks/referenceData.js` are the canonical source; names match.

---

## Edge Cases

| # | Case | Expected |
|---|------|----------|
| E1 | Backend offline → Services/Products | Mock data renders; blue "Demo mode" Alert appears |
| E2 | Backend offline → Blocks/Availability dropdowns | Mock clinicians/clinics/rooms populated |
| E3 | Edit clinic — uses `clinic.id` not hardcoded | URL contains actual MongoDB/UUID from mock |
| E4 | Valid Until left blank in Availability | `valid_until: null` sent; no validation error |
| E5 | End time ≤ start time in Blocks | Frontend validation blocks submission with error message |
| E6 | No availability records exist | Empty state icon + "No availability records yet" shown |

---

## Total: 16 Integration TCs + 6 Edge Cases
