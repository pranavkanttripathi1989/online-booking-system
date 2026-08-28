---
id: PLAN203
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG039, BUG046]
---

# PLAN203 — Route-guard corrections for `/queue`, `/appointments`, `/calendar`

Two related but opposite-direction access-control gaps in
`frontend/src/App.jsx`, found during the 2026-08-28 Chrome QA sweep,
fixed together since both are surgical `RoleGuard` corrections in the
same file.

## BUG039 — `/queue` too narrow

Was nested inside the large `RoleGuard roles={['admin', 'super_admin',
'manager']}` block (lines 681–969), alongside many manager-only routes.
Pulled into its own dedicated `<Route element={<RoleGuard roles={[...]}
/>}>` wrapping only `/queue`, with roles `['admin', 'super_admin',
'manager', 'clinician', 'staff', 'receptionist']` — matching
`AppShell.jsx`'s own "Live Queue" nav item and the backend's
`QUEUE_STAFF_ROLES`. Widening the shared block itself was rejected as
an approach — it would have granted clinician/staff/receptionist every
other route in that block too (manager dashboard, billing, availability,
blocks, ...).

## BUG046 — `/appointments`, `/calendar` too wide (no gate at all)

Both sat as plain sibling `<Route>`s with **no** `RoleGuard` — reachable
by any authenticated role, including `'patient'`. `/calendar` gated to
`['admin', 'super_admin', 'manager', 'receptionist', 'staff']`
(excludes `clinician`, which has its own `/clinician/calendar`).
`/appointments` gated together with its three sibling routes
(`/appointments/new`, `/appointments/:id`, `/appointments/:id/edit`) to
`['admin', 'super_admin', 'manager', 'receptionist', 'staff',
'clinician']` — both sets match `AppShell.jsx`'s own nav `roles` arrays
exactly. `/appointments/book` (the public wizard, its own
`OptionalAuthShell` route) was untouched.

Backend confirmed already correct before this fix — `appointments.
service.ts` line 242 self-scopes a `'patient'`-role caller to `{
patient_id: user.patient_id ?? '__no_patient_link__' }`, so this was a
UI-surface exposure (the staff bulk-management page rendering for a
patient), not a PHI leak.

## Testing

No unit-test changes — `RoleGuard` itself is pre-existing,
unit-tested, generic infrastructure; these are route-declaration
changes only. Verified via `npx eslint src/App.jsx` (clean) and live
browser verification — see `TR223`.
