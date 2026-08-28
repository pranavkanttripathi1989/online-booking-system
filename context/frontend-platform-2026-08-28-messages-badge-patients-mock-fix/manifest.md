---
id: CTX-frontend-platform-2026-08-28-messages-badge-patients-mock-fix
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG041, BUG043, PLAN208, TP228, TR228]
---

# Sidebar Messages badge and patients mock-fallback fixes (2026-08-28)

Sixth fix batch from the 2026-08-28 five-role QA sweep.

- **BUG043**: `AppShell.jsx`'s sidebar "Messages" badge was sourced
  entirely from `MockStore`, unconditionally, for every account —
  never a fallback, there was no real-data path at all. Replaced with
  a real, lightweight query against the same `threads` resolver
  `messages/index.jsx` already uses.
- **BUG041**: `patients/index.jsx` fell back to hardcoded mock patients
  on any genuine empty result, not just a real error — the identical
  `DATA-13` shape already fixed once for `appointments/index.jsx`/
  `calendar/index.jsx`. Fixed to match that exact precedent.

Neither file had an existing test suite to extend; both verified live
against the real dev stack instead.

## Documents

- `requirements/messaging/bug/BUG043-*.md` (done)
- `requirements/patients/bug/BUG041-*.md` (done)
- `implementation-plans/frontend-platform/bug/PLAN208-*.md`
- `test-plans/frontend-platform/bug/TP228-*.md`
- `test-results/frontend-platform/bug/TR228-*.md`
