---
id: BUG046
type: bug
feature: appointments
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: []
---

## Resolution (2026-08-28, `PLAN203`)

`/calendar` gated to `RoleGuard roles={['admin', 'super_admin',
'manager', 'receptionist', 'staff']}` (matching its own nav item's
`roles`, which deliberately excludes `clinician` — clinicians use
`/clinician/calendar` instead). `/appointments`, `/appointments/new`,
`/appointments/:id`, and `/appointments/:id/edit` gated together to
`['admin', 'super_admin', 'manager', 'receptionist', 'staff',
'clinician']`, matching the "Appointments" nav item's own roles — widened
from the two routes originally named in this bug to the whole family,
since none of the sibling routes (`new`/`:id`/`:id/edit`) are reachable
from any patient-facing page either, and all render the same
staff/manager-built components. `/appointments/book` (the public
booking wizard) was untouched — it already sits in its own
`OptionalAuthShell` route, unaffected by this change.

Live-verified: `patient@medibook.dev` now gets a 403 on both
`/appointments` and `/calendar` (previously rendered the full staff
bulk-management UI). `receptionist@medibook.dev`'s own legitimate
access to both is unaffected. See `TR223`.

# BUG046 — `/appointments` and `/calendar` have no frontend role gate at all; a `'patient'` account can reach the staff bulk-management UI directly

## Source

Found live during a Chrome-DevTools-driven patient-role QA sweep,
logged in as `patient@medibook.dev`. Typing `/appointments` directly in
the address bar (not reachable from the patient sidebar, which links
`/patient/appointments` instead) rendered the full staff/manager
`AppointmentsPage` — bulk-select checkboxes, a "Patient name" search
filter, a Clinician filter, "Export CSV", "New Booking", "Bulk Cancel"
— the identical component staff and manager accounts see, not a
patient-appropriate personal appointments view.

## What's wrong, exactly

`frontend/src/App.jsx`: `/dashboard` (line 376–383) is correctly
wrapped in `<RoleGuard roles={['admin', 'super_admin', 'staff']} />`
(line 375) — and the comment directly above it explains why, describing
the **exact same bug class**, already found and fixed once for this
route: *"previously reachable by ANY authenticated role via plain
ProtectedRoute; a patient/clinician account could land here ... and see
a full manager-style analytics UI."*

`/appointments` (line 438–444) and `/calendar` (line 385–392) sit as
plain sibling `<Route>`s at the same nesting level, **outside any
`RoleGuard`** — the identical unguarded shape `/dashboard` was fixed
away from. Both render staff/manager-built components
(`AppointmentsPage`, `CalendarPage`) reachable by any authenticated
role, including `'patient'`, with zero frontend role check.

**Not a PHI leak** — verified before writing this up:
`appointments.service.ts` line 242 self-scopes a `'patient'`-role
caller to `{ patient_id: user.patient_id ?? '__no_patient_link__' }`,
so the rows actually returned are correctly restricted to the caller's
own appointments (confirmed live: "0 upcoming appointments" for this
account, matching its real `patient_id: null` unlinked state — not
someone else's data). The bug is UI-surface exposure, not data
exposure: a real patient reaching this route sees staff-only affordances
(bulk cancel, CSV export of "every patient" implied by the filter UI,
a clinician-wide filter) that make no sense on a patient account and
imply capabilities the account doesn't actually have.

## Acceptance criteria

- `/appointments` and `/calendar` are wrapped in a `RoleGuard`
  excluding `'patient'` (and any other role that has its own dedicated
  equivalent page, e.g. `/patient/appointments`), matching the fix
  already applied to `/dashboard`.
- Audit the remaining unguarded siblings in the same block
  (`/messages`, `/settings`, `/notifications`, `/profile`,
  `/prescriptions/verify`) to confirm each is *intentionally*
  role-agnostic (a shared personal page every role legitimately uses
  its own version of) rather than another accidental staff-only leak —
  don't assume without checking each one.
- Live-verified: a `'patient'`-role account navigating directly to
  `/appointments` or `/calendar` either redirects to its own
  `/patient/appointments` equivalent or shows a 403, matching how
  `/dashboard` already behaves for this account.
