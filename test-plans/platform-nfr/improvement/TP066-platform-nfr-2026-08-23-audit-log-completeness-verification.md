---
id: TP066
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ037
related: [PLAN039, TR065]
---

# TP066 — Verification for audit-log completeness

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Successful mutation | `outcome: 'success'` written |
| TC-02 | Failed mutation | `outcome: 'failure'` written |
| TC-03 | Mutation with an `id` arg (update/delete) | `resource_id` = that arg |
| TC-04 | Successful create (no `id` arg, returns one) | `resource_id` = the resolved result's `id` |
| TC-05 | Failed create (no `id` arg, no result) | `resource_id` = `undefined`, not a crash |
| TC-06 | Args containing `password`/`token`/etc. | `details` redacts those keys to `'[REDACTED]'`, at any nesting depth |
| TC-07 | `req.headers['user-agent']` present | Captured as `user_agent` |
| TC-08 | `getAuditLogs` GraphQL read | `outcome`/`userAgent` present on the type and mapped from the DB row |
| TC-09 | A historical row predating both columns | Maps to `outcome: undefined, userAgent: undefined`, not null/crash |
| TC-10 | `admin/users/index.jsx`'s Audit Logs tab with zero real rows | Real empty state, not 3 fabricated rows |
| TC-11 | Backend full suite, `tsc --noEmit`, `eslint` (backend + frontend) | All clean |
| TC-12 | Live: a real successful and a real failed mutation, then `getAuditLogs` | Correct `outcome`/`resourceId`/`userAgent`/`details` on both, pre-fix historical rows unaffected |

## How this was checked

TC-01–09 via Jest unit tests (interceptor + `users.service.spec.ts`) with
mocked Prisma/GraphQL context. TC-10 via code review of the new
conditional render. TC-11 via the backend/frontend containers' own
commands. TC-12 via direct `curl` GraphQL calls against the real running
dev backend, using a real admin login and a real (harmless, reverted-by-
construction) `updateClinic` no-op plus a deliberately invalid one.
