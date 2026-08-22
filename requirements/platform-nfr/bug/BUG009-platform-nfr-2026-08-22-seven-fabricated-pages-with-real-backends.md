---
id: BUG009
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-23
status: done
parent: REQ035
related: [F-18, BUG008, PLAN030, TP057, TR056]
---

# BUG009 — Seven routed pages rendered fabricated data while their backend sat unused

## Severity

S2. Not a security defect, but a correctness and trust one: every affected page
is a live route, so each was showing a logged-in user invented clinical,
financial or scheduling information indistinguishable from real data.

## How they were found

`scripts/check-page-data-wiring.mjs`, the structural gate added by `BUG008`, on
its **first run**. It asks the inverse question to every previous audit: not
"does this file import `mocks/store`" but "does a file that clearly renders data
have *any* route to real data".

That inversion is the whole point. Four earlier grep-based audits swept for
`mocks/store` imports and missed all seven, because none of them import it —
they declare their own `MOCK_*` arrays. `clinician/Patients.jsx` went as far as
`export const MOCK_PATIENTS`, with a comment claiming the booking wizard needed
it; nothing imported it.

## The seven, and what each ignored

| Page | Backend it never called |
|---|---|
| `analytics/index.jsx` | `analytics` — `getAppointmentStats`, `getClinics` |
| `clinician/Patients.jsx` | `patients` (clinician-self-scoped) |
| `manager/Billing.jsx` | `appointment-payments` |
| `patient/Appointments.jsx` | `appointments` (patient-self-scoped) |
| `public/landing.jsx` | `public` — `getClinicians`, `@Public()` |
| `staff/Appointments.jsx` | `appointments` |
| `staff/Dashboard.jsx` | `dashboard` |

Two details worth recording, because they show how long this had been true:

- `public/landing.jsx`'s effect was literally commented **"Simulate GraphQL
  getClinicians"**, with an 800 ms artificial delay, while a real `@Public()`
  resolver of that exact name existed — built, field for field, against this
  page's own mock shape.
- `analytics/index.jsx` displayed **"Revenue (Mar) $27,800"** — US dollars, in a
  product whose money rules are INR-only (Hard Rule 9).

## Fix

Six pages wired to their real domain. The seventh, `manager/Billing.jsx`, was
**deleted and its route redirected to `/finances`** — it duplicated a page that
has been real since `REQ004` (same manager-scoped revenue summary, transaction
list and revenue chart), and its only distinct concepts (invoice IDs, refunds,
"outstanding") have no backing model at all. Wiring it would have meant either
inventing an invoicing domain or creating a second source of truth for one
number. Decided with the user; same call as `context/open-questions.md` #7.

### Four real defects surfaced while wiring

1. **`/staff/dashboard` and `/staff/appointments` had no `RoleGuard`.** Any
   authenticated user could open them, while `dashboard` is
   `@Auth('admin','super_admin','staff')`. Harmless while the pages were fake;
   a `FORBIDDEN` error the moment they read real data. Guard added.
2. **`formatCurrency` defaulted to GBP** (`en-GB`) in an India-market product.
   Its only caller was the deleted Billing page, so no wrong currency ever
   reached a real number — but it was a landmine. Now INR/`en-IN`.
3. **`StatusChip` mapped `no-show`; the backend emits `no_show`.** A real
   no-show rendered the raw string `no_show` with default styling.
4. **`Appointments.type` was never exposed in GraphQL.** The column has existed
   since the model was written, so `patient/Appointments.jsx` had no way to tell
   a video consultation from an in-person one and fabricated the distinction.
   Added to the entity, the mapper and the shared fragment.

Also found: the frontend's `RESCHEDULE_APPOINTMENT_MUTATION` is **dead code** —
no `rescheduleAppointment` resolver exists. Patient reschedule now uses
`updateAppointment`, which takes an ISO `start_datetime`.

### What was removed rather than faked

Following the precedent set when `clinicians/detail.jsx` was rewired
(`open-questions.md` #8), UI with no backend counterpart is **deleted, not
filled with plausible values**:

- **Check-in** (`staff/Dashboard`). `Appointments.status` is
  `scheduled | completed | cancelled | no_show`; there is no `checked_in`
  state, so the button wrote nowhere. Real check-in is `REQ019` queue
  management. See `open-questions.md` #11.
- **Recent-activity feed** (`staff/Dashboard`). No event source.
- **Per-room capacity** (`staff/Dashboard`). Replaced with the real
  `utilisation_by_clinician` rather than deleted — the panel keeps its purpose.
- **`condition` and `status`** columns (`clinician/Patients`). `status`
  (active/new/inactive) *could* be derived, but the thresholds are a
  clinical/business rule nobody has set. See `open-questions.md` #11.
- **Service-mix pie, patient-growth chart, expenses/profit, avg-rating KPI**
  (`analytics`). None exist in the query; replaced by revenue-by-clinic and
  top-clinicians, which the resolver already returned and nothing displayed.
- **"Next available"** (`public/landing`). Computing it means walking
  availability minus blocks minus bookings — the availability engine's job.

## Verification

Backend 650/650 unit and 120/120 integration; backend eslint and `tsc --noEmit`
clean. Frontend lint exit 0 with the warning ratchet **lowered 197 → 177**,
tests 4/4, production build succeeds. The wiring gate's allowlist shrank from 10
entries to **3** — and its staleness check fired on all seven, confirming they
are genuinely no longer fabricated. See `TR056`.

## What this does not close

- **No live browser verification.** Every page compiles, lints and queries a
  schema-valid contract, but the six wired pages were not driven in a browser
  against real data in this slice. Playwright/Chrome MCP were unavailable.
- **Three pages remain fabricated** — `onboarding`, `tasks`, `waiting-room` —
  because no backend domain exists for them. That is Priority 2 feature work.
- `patients/index.jsx` and `patients/detail.jsx` also carry `MOCK_*` constants.
  The gate does not flag them (they have real queries alongside), but they are
  worth a look as possible mixed-fallback cases.
