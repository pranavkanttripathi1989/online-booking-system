---
id: TR003
type: test-result
feature: appointments
created: 2026-03-19
updated: 2026-08-18
status: done
parent: unknown
related: [TP003, TS003]
---

# Appointments — Test Results (v3 — Post SUG-APPT-006/010/012 + NEW-APPT-004 Implementation)

**Feature:** Appointments  
**Test Plan:** [appointments-test-plan.md](../test-plan/appointments-test-plan.md)  
**First Executed:** 2026-03-16 · **Re-tested After Fixes:** 2026-03-18 · **v3 Re-test:** 2026-03-27  
**Tester:** Antigravity AI (Browser Agent)  
**Environment:** `http://localhost:3001` (Vite dev server, mock data mode, backend offline)  
**Total Cases:** 38 | **Executed:** 38 | **Passed:** 38 ✅ | **Partial:** 0 ⚠️ | **Failed:** 0 ❌

---

## Summary

| Status | Session 1 (2026-03-16) | Session 2 (2026-03-18) | Session 3 (2026-03-19) | Session 4 (2026-03-19) | **v3 (2026-03-27)** |
|--------|------------------------|------------------------|------------------------|------------------------|---------------------|
| ✅ PASS | 15 | 22 | 29 | 34 | **38** |
| ❌ FAIL | 2 | 0 | 0 | 0 | **0** |
| ⏭ SKIP | 2 | 0 | 0 | 0 | **0** |

> **v3 Overall Result: ✅ ALL 38 TEST CASES PASS — 0 failures. 4 new TCs added for SUG-APPT-006, SUG-APPT-010, NEW-APPT-004, SUG-APPT-012.**

---

## Bugs Fixed

| Bug ID | Description | Fix Applied | File |
|--------|-------------|------------|------|
| BUG-APPT-001 | White-screen crash when navigating list → detail → back | `getRowIndexRelativeToVisibleRows` wrapped in `try/catch`; fallback: `params.row?.index ?? ''` | `appointments/index.jsx` |
| BUG-DASH-001 | Dashboard Appointment Volume chart blank | Fixed mock `volume_by_day` shape: `count` → `confirmed_count`/`cancelled_count` | `dashboard/index.jsx` |
| BUG-DASH-003 | Dashboard upcoming appt IDs `'1','2','3'` → 404 | Changed IDs to `'appt-1','appt-2','appt-3'` with clinician names | `dashboard/index.jsx` |
| BUG-APPT-002 (v3) | Bulk action bar not appearing after row selection | Replaced MUI `<Slide>` with CSS `max-height`/`opacity` transition; normalised MUI DataGrid v6 `GridRowSelectionModel` | `appointments/index.jsx` |

---

## Suggestions Implemented (All Sessions)

| SUG ID | Suggestion | Status | File |
|--------|-----------|--------|------|
| SUG-APPT-001 | White-screen crash fix (try/catch in renderCell) | ✅ Done | `appointments/index.jsx` |
| SUG-APPT-002 | Optimistic cancel — row updates immediately to "Cancelled" + warning snackbar | ✅ Done | `appointments/index.jsx` |
| SUG-APPT-003 | Contextual "No results" empty state with inline "Clear all filters" button | ✅ Done | `appointments/index.jsx` |
| SUG-APPT-004 | Tooltip on "Clear Filters" icon | ✅ Done | `appointments/index.jsx` |
| SUG-APPT-005 | Inline status change (context menu on chip click) | ✅ Done | `appointments/index.jsx` |
| SUG-APPT-006 | Bulk row selection + bulk cancel + bulk export | ✅ Done (v3) | `appointments/index.jsx` |
| SUG-APPT-007 | Sidebar badge showing pending appointment count | ✅ Done | `dashboard/index.jsx` |
| SUG-APPT-008 | Upcoming / Past / All tab strip — defaults to "Upcoming" | ✅ Done | `appointments/index.jsx` |
| SUG-APPT-009 | Export all appointments as CSV (10 columns) | ✅ Done | `appointments/index.jsx` |
| SUG-APPT-010 | Reschedule dialog with DateTimePicker + validation | ✅ Done (v3) | `appointments/detail.jsx` |
| SUG-APPT-011 | "Send Reminder" button on appointment detail page | ✅ Done | `appointments/detail.jsx` |
| SUG-APPT-012 | Service-specific pre-visit checklist (10 service maps) | ✅ Done (v3) | `appointments/detail.jsx` |
| NEW-APPT-001 | Upcoming tab boundary → current datetime (not start of day) | ✅ Done | `appointments/index.jsx` |
| NEW-APPT-002 | Export CSV → Room + Clinic columns (10 columns total) | ✅ Done | `appointments/index.jsx` |
| NEW-APPT-003 | Past tab boundary → current datetime (not end of prev day) | ✅ Done | `appointments/index.jsx` |
| NEW-APPT-004 | Send Reminder channel selection dialog (Email / SMS) | ✅ Done (v3) | `appointments/detail.jsx` |

---

## Test Case Results — Appointments List (`/appointments`)

### TC-APPT-001 — List loads with mock data
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | 3-tab strip (Upcoming/Past/All), filter toolbar (Patient, Status, Clinician, From, To, Clear), Export CSV + New Booking buttons, DataGrid with status chips, row count in subtitle |

### TC-APPT-002 — Patient name search
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Typing "Alice" + Enter filters table to Alice Thompson rows only |

### TC-APPT-003 — Status filter
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Selecting "Confirmed" shows only green Confirmed status chips |

### TC-APPT-004 — Clinician filter
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Clinician dropdown populated from MockStore; selecting a clinician filters rows |

### TC-APPT-005 — Clear filters button
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Red FilterAltOffIcon button clears all filters and restores Upcoming default |

### TC-APPT-006 — Navigate to detail page
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Eye icon navigates to `/appointments/appt-1`; full detail loads; Back button returns to list |

### TC-APPT-007 — Navigate to edit page
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Edit (EventRepeat) icon navigates to `/appointments/:id/edit` |

### TC-APPT-008 — Cancel dialog opens
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Red X icon opens dialog "Cancel Appointment" with reason textarea (autoFocus) and two action buttons |

### TC-APPT-009 — Optimistic cancel (SUG-APPT-002)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Dialog closes immediately; row chip changes to red "Cancelled" without page reload; warning snackbar appears |

### TC-APPT-010 — Empty state (no filter)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | "No appointments yet" message with create prompt when no data |

### TC-APPT-011 — Contextual empty state (SUG-APPT-003)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Searching "xyznonexistent" shows "No appointments match your filters" with sub-message and red "Clear all filters" button |

### TC-APPT-012 — Clear all filters from empty state
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Clicking "Clear all filters" in empty state removes all filters and restores full list |

### TC-APPT-013 — Pagination
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | DataGrid footer shows page control; page size options [10, 20, 50] work |

### TC-APPT-014 — Responsive columns (mobile)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | columnVisibilityModel hides index, clinician, duration_minutes on small screens |

### TC-APPT-015 — New Booking FAB
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Blue FAB fixed-bottom navigates to `/appointments/new` |

### TC-APPT-016 — New Booking header button
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Teal "New Booking" button in header navigates to `/appointments/new` |

### TC-APPT-017 — Status chip display
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | All 6 statuses (pending/confirmed/cancelled/completed/no_show/rescheduled) render with correct colour, dot, border |

### TC-APPT-018 — Create appointment form
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | `/appointments/new` form loads with all fields; mock-mode save stores entry locally |

### TC-APPT-019 — Edit appointment form
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | `/appointments/:id/edit` pre-populates with existing appointment data |

### TC-APPT-020 — Tab switching (SUG-APPT-008)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Past tab shows past appointments; All tab shows 35; Upcoming tab returns to default; teal indicator follows active tab |

### TC-APPT-021 — Export CSV (SUG-APPT-009)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | "Export CSV" triggers download; green snackbar "Exported 35 appointments as CSV (10 columns)" |

### TC-APPT-022 — Contextual empty state with filters
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | xyznonexistent search → empty state "No appointments match your filters" with clear button |

### TC-APPT-023 — Date range filters
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | From/To DatePickers filter mock data; clearing dates restores full tab view |

### TC-APPT-024 — Loading skeleton
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | CircularProgress overlay shown during loading; disappears once mock data resolves |

### TC-APPT-025 — No white-screen crash on navigation (SUG-APPT-001)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | List → Detail → Back → List chain navigates cleanly without white screen |

### TC-APPT-026 — Inline status change (SUG-APPT-005)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Clicking Pending chip opens a dropdown menu; selecting Confirmed changes chip to green immediately; success snackbar |

### TC-APPT-027 — Terminal status locked (SUG-APPT-005)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Cancelled/Completed/No Show chips do NOT open the dropdown menu |

### TC-APPT-028 — Mock data fallback
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Console log: `[MediBook] Backend offline — using mock data.` All 35 mock rows render |

### TC-APPT-029 — Clinician dropdown populated from mock
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Clinician dropdown shows all active mock clinicians |

### TC-APPT-030 — Page title
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Browser tab shows "Appointments — MediBook" |

---

## Test Case Results — Appointments List v3 (NEW TCs)

### TC-NEW-APPT-031 — Bulk row selection bar (SUG-APPT-006)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Checking row checkbox → teal animated action bar slides in above DataGrid showing "N appointments selected", Export Selected and Bulk Cancel buttons, deselect icon |

### TC-NEW-APPT-032 — Bulk export selected (SUG-APPT-006)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Clicking "Export Selected" downloads CSV of only selected rows; green snackbar "Exported N selected appointments as CSV"; action bar disappears |

### TC-NEW-APPT-033 — Bulk cancel (SUG-APPT-006)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Selecting non-terminal rows and clicking "Bulk Cancel" optimistically updates all selected rows to Cancelled; warning snackbar "N appointments cancelled." |

---

## Test Case Results — Appointment Detail (`/appointments/:id`)

### TC-APPT-034 — Send Reminder with channel selection (NEW-APPT-004)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Clicking "Send Reminder" opens a dialog (not direct snackbar). Dialog shows Email and SMS radio options with patient contact details. Disabled channels show "No [channel] on file" badge. Clicking "Send via Email" closes dialog and shows "Reminder sent via EMAIL to [email]" snackbar after 1.5s |

### TC-APPT-035 — Reschedule dialog (SUG-APPT-010)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Purple "Reschedule" button opens dialog showing current appointment info, Start and End DateTimePickers. End-before-start validation shows error helper text and disables Confirm. Valid dates → dialog closes, success snackbar "Appointment rescheduled successfully." → navigates to /appointments |

### TC-APPT-036 — Service-specific checklist (SUG-APPT-012)
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Pre-visit checklist shows service-specific items (e.g., GP Consultation: "Bring previous lab results", "Note any recent symptoms"). "Specific to: [Service Name]" label shown above checklist. Unmapped services fall back to 4-item generic checklist |

### TC-APPT-037 — Detail page actions panel
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | Non-terminal appointments show 5 action buttons: Mark as Completed (green), Mark No Show (amber), Reschedule (purple), Cancel Appointment (red), Send Reminder (teal) |

### TC-APPT-038 — Print button
| Field | Value |
|-------|-------|
| **Result** | ✅ PASS |
| **Observed** | "Print" button in header calls `window.print()` |

---

## Production Readiness Assessment

| Area | Status | Notes |
|------|--------|-------|
| Mock data layer | ✅ Complete | All 38 TCs pass in offline mode |
| UI/UX | ✅ Complete | Teal theme, status chips, animations, empty states |
| List features | ✅ Complete | Filters, tabs, export, bulk select, inline status |
| Detail features | ✅ Complete | Reminder channels, reschedule, service checklists, timeline, print |
| Backend integration | ⏳ Pending | All mutations/queries ready; swap mock→API by removing mock fallback lines |
| Accessibility | ✅ Complete | ARIA labels on all interactive elements |

---

## Backend-API Verification Pass — 2026-08-18

**Scope:** First-ever real-backend execution of `test-cases/03-appointments-booking/test-cases.md`'s Backend-API scoping cases (TC-APPT-API-*), per `QA-TESTING-EXECUTION-PROMPT.md` Phase 1. Previous entries in this file predate the real backend (mock-mode only).
**Environment:** Real running stack, real Postgres, real seeded accounts, GraphQL via `curl` with real JWTs.

| TC ID | Description | First-run result | Fix | Re-verified |
|---|---|---|---|---|
| TC-APPT-API-009 | A patient's appointments query returns only their own rows by default | ❌ **FAIL** — no self-scoping; any patient JWT could read every appointment in the org (reason, notes, other patients' names). | Added `selfScope()` to `appointments.service.ts`; `patient_id` embedded in JWT. | ✅ PASS — `appointments.service.spec.ts`. |
| TC-APPT-API-010 | A clinician's appointments query returns only their own schedule | ❌ **FAIL** — no self-scoping; any clinician JWT saw every clinician's schedule org-wide. | Extended `selfScope()` to the `clinician` role (`clinician_id` embedded in JWT, sourced from `UserProfiles.clinician_id`). | ✅ PASS — `appointments.service.spec.ts`. |
| TC-APPT-API-013 | Cross-tenant isolation on direct appointment lookup | ✅ PASS on first run — `orgScope()` (`clinic.client_org_id`) was already implemented. | N/A | N/A |

**Result: 2 of 3 Critical cases were failing on first real execution, both now fixed and re-verified. 9 new unit tests added (`appointments.service.spec.ts`). Live-verified against `patient@medibook.dev`/`clinician@medibook.dev` (both correctly see 0 rows, not being linked to a Patients/Clinicians row yet — see `test-suggestion/appointments-test-suggestion.md`) and `manager@medibook.dev` (unaffected, sees full org). Full backend suite green (57/57).**
