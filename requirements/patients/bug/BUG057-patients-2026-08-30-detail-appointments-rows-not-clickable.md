---
id: BUG057
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG055
related: [PLAN228, TP248, TR248]
---

# BUG057 — `patients/detail.jsx`'s Appointments tab rows were dead ends

## What was wrong

Follow-up to `BUG055` (which wired this tab to real data): the user
asked, pointing at a real "Completed" row, whether they could click
through to that specific appointment's own detail page from here — they
couldn't. Each row rendered as a plain, non-interactive `TableRow` with
no way to reach `/appointments/:id` for that appointment.

## Fix

Made each row clickable (`onClick` navigating to `/appointments/${a.id}`),
matching the exact accessible pattern already established in
`patients/index.jsx`'s own patient-list rows: `tabIndex={0}`,
`role="button"`, a descriptive `aria-label`, and an `onKeyDown` handler
for Enter/Space — not just a mouse-only `onClick` on a `<tr>` (Hard Rule
A11Y-6's "clickable div" class of failure).

See `PLAN228` for detail and `TR248` for verification, including a full
live click-through to the exact appointment the user was asking about.
