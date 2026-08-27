---
id: BUG031
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG031 — Icon-only action buttons with no accessible name across 9 admin pages (A11Y-5)

## Source

Found live during a Chrome-DevTools-driven admin-role QA sweep — the
Communications page's Preview/Edit icon buttons rendered in the a11y
snapshot as bare `button` nodes with no name at all. Confirmed via a
targeted grep across every `frontend/src/pages/admin/*.jsx` file for
`IconButton` usage against `aria-label`/`Tooltip` presence — this is the
same recurring class `FRONTEND_RULES.md` `A11Y-5` already documents
("A Tooltip is not an accessible name — three real gaps shipped with a
tooltip and no label"), now confirmed in a fourth wave, across the
admin console specifically.

## What's wrong, exactly

**Worse — no accessible name AND no visual tooltip hint at all:**

| File | Lines | Buttons |
|---|---|---|
| `admin/Communications.jsx` | 532, 535 | Preview, Edit (template row) |
| `admin/EmailTemplates.jsx` | 244, 249 | Preview, Edit (template row) |

**A `Tooltip` exists (hover hint works) but the button itself still has
no accessible name — screen-reader users get nothing:**

| File | Lines |
|---|---|
| `admin/ClinicianTypes.jsx` | 303–324 (Edit, Delete) |
| `admin/Departments.jsx` | 319–332 (Edit, Delete) |
| `admin/Languages.jsx` | 330–344 (Edit, Delete) |
| `admin/Plans.jsx` | 447–452 (New version, Activate/Deactivate) |
| `admin/RoomTypes.jsx` | 312–325 (Edit, Delete) |

**Partially fixed already, two of four buttons still gapped:**

`admin/Organizations.jsx` — the "View subscription" (line 519, `title=`)
and "Change entitlement plan" (line 522–526, real `aria-label`) buttons
are correctly accessible. The plain Edit (line 530) and Delete (line
533) icon buttons immediately after them have neither `title` nor
`aria-label` nor `Tooltip` — the identical gap, in the same row, right
next to two buttons that already do this correctly.

**Confirmed clean, not part of this bug** — `admin/Roles.jsx`'s Edit/
Delete icon buttons already carry real `aria-label`s
(`` `Edit ${role.name} role` ``, etc.); no action needed there.

## Acceptance criteria

- Every icon-only button listed above gets a real `aria-label`
  describing the action and its target (matching `Roles.jsx`'s own
  already-correct pattern, e.g. `` `Edit ${item.name}` ``), not just a
  `Tooltip` or `title`.
- A follow-up `axe-core` pass (or manual screen-reader spot check) on
  each touched page confirms zero new critical/serious violations.
