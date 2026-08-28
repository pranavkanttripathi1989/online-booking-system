---
id: PLAN207
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG031, BUG033]
---

# PLAN207 — Admin icon-button accessible names, and the Plans page permission-error fix (BUG031, BUG033)

Two independent findings, batched for one verification pass.

## BUG031

Added a real `aria-label` to every icon-only button across 8 admin
pages (`Communications.jsx`, `EmailTemplates.jsx`, `ClinicianTypes.jsx`,
`Departments.jsx`, `Languages.jsx`, `Plans.jsx`, `RoomTypes.jsx`,
`Organizations.jsx`) — see the bug's own resolution note for the exact
per-file list. A `Tooltip` (present on most of these already) was never
sufficient on its own; `Roles.jsx`'s existing `` `Edit ${x.name}` ``
pattern was the template followed throughout. One MUI `Switch`
(`Plans.jsx`) labeled via `inputProps={{'aria-label': ...}}`, matching
`FRONTEND_RULES.md` `A11Y-12`'s documented convention for a form
control with no visible label — a bare `aria-label` prop lands on the
wrong DOM node for a `Switch`.

## BUG033

`admin/Plans.jsx#load()` assumed a GraphQL error would reject
`client.query(...)`, but this app's global Apollo `errorPolicy: 'all'`
(`apollo/client.js`) means it never does — the `catch` block was dead
code for this exact failure mode. Fixed to check the result's own
`errors` explicitly. Also gated the top-level "New Plan" button and
each row's write actions on `hasRole('super_admin')`, hidden entirely
rather than left clickable-then-rejected, matching `/admin/payers`'s
own precedent for the identical scenario.

## Testing

`npx eslint` clean (0 new errors) across all 9 touched files. No new
unit tests written for `Plans.jsx` (no pre-existing test file for this
page) — verified live instead, matching the scope of a targeted bug
fix rather than a new-feature slice.

Live-verified against the real dev stack — see `TR227`.
