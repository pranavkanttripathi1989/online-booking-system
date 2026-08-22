---
id: PLAN030
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-23
status: done
parent: BUG009
related: [F-18, BUG008, TP057, TR056]
---

# PLAN030 — Wire the seven fabricated pages the structural gate found

`scripts/check-page-data-wiring.mjs` (BUG008) found seven routed pages rendering
`MOCK_*` arrays while a real backend module for their domain already exists. All
seven are live routes, so every one is a user-visible lie today.

## Per-page approach

| Page | Real source | Notes |
|---|---|---|
| `public/landing.jsx` | `getClinicians(search)` `@Public()` | Near-exact shape match — the backend was built against this page's mock |
| `analytics/index.jsx` | `getClinics` + `getAppointmentStats` | Route guard already matches the `@Auth` exactly |
| `staff/Dashboard.jsx` | `dashboard` | Partial: several sections have no backend at all |
| `staff/Appointments.jsx` | `APPOINTMENTS_QUERY` + cancel | Canonical dialect |
| `patient/Appointments.jsx` | `APPOINTMENTS_QUERY` + cancel | Self-scoped by `patient_id` in the JWT |
| `clinician/Patients.jsx` | `PATIENTS_QUERY` | Self-scoped via the `appointments.some.clinician_id` relation |
| `manager/Billing.jsx` | — | **Redirect to `/finances`** (see below) |

## The two decisions taken with the user

**`manager/Billing.jsx` becomes a redirect, not a wiring job.** It duplicates
`finances/index.jsx` (real since `REQ004`): both are manager-scoped revenue
summary + transaction list + revenue chart. Its *extra* concepts — invoice IDs,
refunds, outstanding invoices — have no backing model anywhere; wiring them would
mean inventing an invoicing domain, and duplicating the rest would create two
sources of truth for one number. Same call as `context/open-questions.md` #7
("redirect, don't duplicate"). Follows the existing `/booking/search` →
`/appointments/book` precedent in `App.jsx`.

**`/staff/dashboard` and `/staff/appointments` gain a `RoleGuard`.** They had
none, so any authenticated user could open them, while the `dashboard` query is
`@Auth('admin','super_admin','staff')`. Wiring them without this would turn a
fake-but-rendering page into a `FORBIDDEN` error for patients and clinicians.
The guard is the honest fix: a patient should not reach a staff console.

## The rule for mock-only fields

Where the mock renders something with **no backend counterpart**, it is
**removed, not faked** — the precedent set when `clinicians/detail.jsx` was
rewired (`context/open-questions.md` #8). Known cases, all in
`staff/Dashboard.jsx`:

- **Check-in.** `Appointments.status` has `scheduled` / `completed` / `cancelled`
  / `no_show` — there is no `checked_in` state, so the queue's "Check In" button
  writes nowhere. Removed; logged as an open question, because a real check-in
  flow is `REQ019` (queue management) and a design decision, not a wiring gap.
- **Recent Activity feed.** No event/audit source shaped for this. Removed.
- **Clinic Capacity per room.** No per-room slot model. **Replaced** with
  `utilisation_by_clinician`, which is real, rather than deleted outright —
  the panel keeps its purpose with data that exists.

## Definition of done

Six pages read real data; the seventh redirects. No `MOCK_*` constant remains in
any of them. Every page handles loading, error and genuinely-empty states
distinctly — an empty result must never fall back to fabricated rows, which is
the exact regression `appointments/index.jsx` and `calendar/index.jsx` shipped
(Priority 3, point 3). Responsive re-check at the tier each page belongs to.
`scripts/check-page-data-wiring.mjs` allowlist shrinks to the 3 genuinely
backend-less pages.
