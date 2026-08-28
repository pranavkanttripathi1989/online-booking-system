---
id: CTX-frontend-platform-2026-08-28-route-guard-fixes
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG039, BUG046, PLAN203, TP223, TR223]
---

# Route-guard corrections: `/queue`, `/appointments`, `/calendar` (2026-08-28)

First fix batch from the 2026-08-28 five-role Chrome QA sweep's
accumulated findings list, picked as the first two since they're
precise, well-evidenced, security-relevant, and touch the same file.

- **BUG039** (too narrow): `/queue` was nested inside a shared
  admin/super_admin/manager-only `RoleGuard` block, causing a live 403
  for clinician/staff/receptionist despite the nav config and backend
  `@Auth` already allowing them. Fixed by giving `/queue` its own
  dedicated `RoleGuard` rather than widening the shared block (which
  would have granted those roles every other route in it).
- **BUG046** (too wide): `/appointments` (+ its `new`/`:id`/`:id/edit`
  siblings) and `/calendar` had **no** frontend `RoleGuard` at all —
  reachable by any authenticated role including `'patient'`, rendering
  the staff/manager bulk-management UI. Confirmed not a PHI leak first
  (`appointments.service.ts` already self-scopes a patient caller
  correctly) before fixing — this was a UI-surface exposure, not a data
  leak. Gated to match `AppShell.jsx`'s own nav `roles` arrays.

Both fixes are precise, surgical `RoleGuard` array corrections in
`frontend/src/App.jsx` — no other files touched. Live-verified via
Chrome DevTools MCP against the dev stack: patient now 403s on both
routes; staff regained Live Queue access; staff's own pre-existing
access to Appointments/Dashboard is unaffected; manager's access to the
rest of the shared block (dashboard, billing, availability, blocks)
is unaffected since that block's own role list was never touched.

## Documents

- `requirements/queue-management/bug/BUG039-*.md` (done)
- `requirements/appointments/bug/BUG046-*.md` (done)
- `implementation-plans/frontend-platform/bug/PLAN203-*.md`
- `test-plans/frontend-platform/bug/TP223-*.md`
- `test-results/frontend-platform/bug/TR223-*.md`
