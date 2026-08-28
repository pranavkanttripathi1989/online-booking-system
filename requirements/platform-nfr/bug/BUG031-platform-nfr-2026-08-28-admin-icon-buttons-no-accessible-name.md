---
id: BUG031
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: []
---

## Resolution (2026-08-28, `PLAN207`)

Every icon-only button listed added a real `aria-label` naming the
action and its target (e.g. `` `Edit ${item.name}` ``), matching
`Roles.jsx`'s own already-correct pattern — across all 8 files:
`Communications.jsx`, `EmailTemplates.jsx` (plus its own close-preview
button, not originally listed but the same pattern), `ClinicianTypes.jsx`,
`Departments.jsx`, `Languages.jsx` (including the disabled-delete case,
labeled with the real reason), `Plans.jsx` (its `Switch` labeled via
`inputProps={{'aria-label': ...}}`, matching `A11Y-12`'s documented MUI
convention, not a plain `aria-label` prop), `RoomTypes.jsx`, and
`Organizations.jsx`'s two remaining gapped buttons.

Live-verified via Chrome DevTools MCP a11y snapshot on 2 of the 8 pages
(`Communications`, `Languages`) — every button now reports a real,
specific accessible name (e.g. "Edit English", "Cannot delete Hindi —
it's the default language"), not a bare unnamed `button` node. See
`TR227`.

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
