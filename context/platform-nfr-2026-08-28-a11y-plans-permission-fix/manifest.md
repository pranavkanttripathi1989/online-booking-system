---
id: CTX-platform-nfr-2026-08-28-a11y-plans-permission-fix
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG031, BUG033, PLAN207, TP227, TR227]
---

# Admin icon-button accessible names, and the Plans permission-error fix (2026-08-28)

Fifth fix batch from the 2026-08-28 five-role QA sweep.

- **BUG031**: 8 admin pages had icon-only Edit/Delete/Preview buttons
  with no accessible name — a `Tooltip` alone doesn't provide one.
  Added real `aria-label`s throughout, matching `Roles.jsx`'s own
  already-correct pattern; one MUI `Switch` labeled via `inputProps`
  per `A11Y-12`'s documented convention.
- **BUG033**: `admin/Plans.jsx#load()` used a `try/catch` around
  `client.query(...)` assuming a GraphQL error would reject it — this
  app's global `errorPolicy: 'all'` means it never does, so a real
  `super_admin`-only permission rejection silently rendered as an
  ordinary empty "No plans yet" state with the "New Plan" button still
  fully clickable. Fixed to check the result's own `errors` explicitly,
  and gated all write actions on `hasRole('super_admin')`, hidden
  entirely rather than left to fail on submit.

Live-verified against the real dev stack for both.

## Documents

- `requirements/platform-nfr/bug/BUG031-*.md` (done)
- `requirements/subscription-plan-engine/bug/BUG033-*.md` (done)
- `implementation-plans/platform-nfr/bug/PLAN207-*.md`
- `test-plans/platform-nfr/bug/TP227-*.md`
- `test-results/platform-nfr/bug/TR227-*.md`
