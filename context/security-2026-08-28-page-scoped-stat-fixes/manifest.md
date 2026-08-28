---
id: CTX-security-2026-08-28-page-scoped-stat-fixes
type: bug
feature: security
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG029, BUG036, BUG038, PLAN204, TP224, TR224]
---

# The "page-scoped stat shown as a total" bug class — fixed (2026-08-28)

Second fix batch from the 2026-08-28 five-role QA sweep, picked because
`BUG038`'s own writeup explicitly named all three findings as one root
cause worth fixing together.

- **BUG029** (`/admin/users`) — the real backend fix: `getUsers()`/
  `getAuditLogs()` genuinely had no total count. Added `getUsersStats`
  and `getAuditLogsCount`, both built from a shared private
  where-clause helper with their sibling list query so the count can
  never describe a different filtered set than the list. Fixes "Total
  Users"/"Active Users", "Showing X of Y", and — as a side effect of
  finally passing a real `count` to MUI's `TablePagination` instead of
  `-1` — the "paging never stops" defect too, since MUI auto-disables
  "Next" once given a real total.
- **BUG036** (`/manager/clinics`) — pure frontend: room count computed
  from data already fetched on the page (`ROOMS_QUERY`), no new query.
  Clinicians/bookings stay honest zeros with an honest, current
  comment instead of a years-stale "blocked on Phase 5/7" excuse.
- **BUG038** (`/clinician/patients`) — label-only fix, per the bug's
  own accepted escape hatch: "With Upcoming (page)" → "With Upcoming
  (this page)".

14 new backend unit tests, all passing. Live-verified against the real
dev stack for all three: admin/users pagination now stable and
correctly bounded, manager/clinics room counts match real data,
clinician/patients label reads cleanly.

## Documents

- `requirements/security/bug/BUG029-*.md` (done)
- `requirements/catalog-master-data/bug/BUG036-*.md` (done)
- `requirements/patients/bug/BUG038-*.md` (done)
- `implementation-plans/security/bug/PLAN204-*.md`
- `test-plans/security/bug/TP224-*.md`
- `test-results/security/bug/TR224-*.md`
