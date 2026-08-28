---
id: BUG039
type: bug
feature: queue-management
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: []
---

## Resolution (2026-08-28, `PLAN203`)

`/queue` was pulled out of the shared `RoleGuard roles={['admin',
'super_admin', 'manager']}` block in `App.jsx` (which also gates a large
number of manager-only routes) and given its own dedicated `RoleGuard`
with `['admin', 'super_admin', 'manager', 'clinician', 'staff',
'receptionist']` — matching the nav config and backend `@Auth` exactly.
Widening the shared block itself was deliberately avoided, since that
would have granted clinician/staff/receptionist access to every other
route in it (manager dashboard, billing, availability, blocks, etc.) —
a new regression in the opposite direction.

Live-verified: `receptionist@medibook.dev` ("Jamie Reception", Staff
role) now opens Live Queue from the sidebar without a 403. Manager's own
pre-existing access to `/queue` (and every other route in the shared
block) is unaffected. See `TR223`.

# BUG039 — Clinician/staff/receptionist's own "Live Queue" nav item leads straight to a 403

## Source

Found live during a Chrome-DevTools-driven clinician-role QA sweep,
logged in as `clinician@medibook.dev`. Clicking "Live Queue" — a real,
visible item in the clinician's own left sidebar — navigates to
`/queue` and immediately renders a 403 "Access Forbidden... Your role
(clinician) does not have access to /queue" page.

## What's wrong, exactly

Three layers disagree, and two of the three agree with each other:

- **Backend** (`backend/src/queue/queue.resolver.ts` line 16):
  `QUEUE_STAFF_ROLES = ['manager', 'admin', 'super_admin', 'clinician',
  'staff', 'receptionist']` — every queue query/mutation is gated to
  this list.
- **Frontend nav config** (`frontend/src/layouts/AppShell.jsx` line
  205-209): the "Live Queue" item's own `roles` array is `['admin',
  'super_admin', 'manager', 'receptionist', 'staff', 'clinician']` —
  matches the backend exactly, which is why the item is visible to a
  clinician (or staff, or receptionist) in the first place.
- **Frontend route guard** (`frontend/src/App.jsx`) — `/queue` (line
  906) sits under the `<RoleGuard roles={['admin', 'super_admin',
  'manager']} />` block (opened at line 681), which has **no**
  `clinician`, `staff`, or `receptionist` at all. This is the one place
  that's wrong, and it's narrower than both of the other two agreeing
  layers.

Not clinician-specific: `staff` and `receptionist` share this exact
same nav-says-yes/route-says-no contradiction — any of the three roles
clicking their own, correctly-shown "Live Queue" item hits the
identical 403.

## Acceptance criteria

- `/queue`'s `RoleGuard` includes `clinician`, `staff`, and
  `receptionist`, matching both the nav config that already shows this
  item to them and the backend `@Auth` that already allows them.
- Live-verified: a clinician, a staff, and a receptionist account can
  each open Live Queue from their own sidebar without a 403.
