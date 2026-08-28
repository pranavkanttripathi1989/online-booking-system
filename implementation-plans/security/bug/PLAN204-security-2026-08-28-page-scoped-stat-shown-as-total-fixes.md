---
id: PLAN204
type: bug
feature: security
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG029, BUG036, BUG038]
---

# PLAN204 — Fixing the "page-scoped stat shown as a total" bug class (BUG029, BUG036, BUG038)

Three independent findings from the 2026-08-28 QA sweep sharing one root
cause — a summary stat computed from the current page's own fetched
array rather than a real total — fixed together as `BUG038`'s own
acceptance criteria requested.

## BUG029 (`/admin/users`) — real backend fix

`getUsers()`/`getAuditLogs()` had no total count at all — a genuine
backend gap, not just a frontend display bug. Added:

- `UsersService#buildUsersWhere()` / `#buildAuditLogsWhere()` — private
  helpers factored out of the existing list methods so a sibling count
  query can never drift from the list's own filters.
- `UsersService#getUsersStats(role, search, user)` → `{total, active}`
  via two `Promise.all`'d `count()` calls.
- `UsersService#getAuditLogsCount(action, resource, user)` → `Int`.
- New `AdminUsersStatsType` GraphQL type; two new resolver queries,
  gated identically to their sibling list queries (`getUsers`:
  admin/super_admin/manager; `getAuditLogs`: admin/super_admin only).

Frontend (`admin/users/index.jsx`): both queries added to their
existing `GET_ADMIN_DATA`/`GET_AUDIT_LOGS` operations (reusing the
already-declared `role`/`search`/`action`/`resource` variables). Both
`StatCard`s, "Showing X of Y", and both `TablePagination`'s `count`
prop now read the real totals instead of `-1`/page length. Passing a
real `count` to MUI's `TablePagination` also fixes the "paging never
stops" defect as a side effect — it disables "Next" automatically once
the real last page is reached.

## BUG036 (`/manager/clinics`) — pure frontend, no new query

`toCardClinic()` now accepts a `roomCount` computed from `roomsData`
(already fetched on this page via `ROOMS_QUERY`) filtered by
`clinic.id`. Clinicians/today's/monthly bookings stay honest zeros —
genuinely no query on this page to derive them from — but the stale
comment claiming a Phase 5/7 blocker (both shipped long ago) was
rewritten to say so plainly.

## BUG038 (`/clinician/patients`) — label fix only

"Total Patients" was already real
(`data?.patients?.paginatorInfo?.total`); only the label text needed
fixing — "With Upcoming (page)" → "With Upcoming (this page)", per the
bug's own accepted escape hatch (an honest per-page label, since a real
org-wide aggregate would need a new query this page has no other reason
to add).

## Testing

`users.service.spec.ts`: 7 new tests (`getUsersStats` ×3,
`getAuditLogsCount` ×2, existing suite otherwise unchanged — 44/44
total pass). `users.resolver.spec.ts`: 7 new/updated tests (gating ×2,
passthrough ×2 — 20/20 total pass). `npx eslint` clean on all four
touched frontend files (pre-existing i18n/hex-color warnings
unaffected, 0 new errors).

Live-verified against the real dev stack — see `TR224`.
