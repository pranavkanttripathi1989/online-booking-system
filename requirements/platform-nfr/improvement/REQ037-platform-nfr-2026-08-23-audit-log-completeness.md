---
id: REQ037
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: []
---

# REQ037 — Audit-log completeness: outcome, user_agent, and actually populating resource_id/details

`project-plans/06-execution-plan.md` P3.6 (F-10). `AuditLogs` already had
`resource_id`/`details` columns — nothing ever wrote to either. There was
no `outcome` column at all, so a successful and a rejected mutation wrote
an identical row; no `user_agent` column either.

## Fix

- New migration `20260823020000_audit_log_outcome_and_user_agent`: adds
  nullable `outcome`/`user_agent` columns. Nullable deliberately — existing
  historical rows genuinely have no known value for either, and `null`
  represents that honestly rather than backfilling a guess.
- `audit-log.interceptor.ts`: `writeLog()` now receives the real
  success/failure outcome directly from which `tap()` branch fired (not
  re-derived), the raw resolver `args` (via `GqlExecutionContext.getArgs()`),
  and the mutation's resolved result. From these:
  - `resource_id` — the caller's own `id` arg when present (update/delete),
    else the resolved result's own `id` field (create, which has no id to
    pass in, only one to receive back). A failed create has neither, so
    stays `undefined` — there's genuinely nothing to attribute it to.
  - `details` — the sanitized args, with a small deny-list of key names
    (`password`, `token`, `otp`, `secret`, ...) redacted to `'[REDACTED]'`
    at any nesting depth. An audit trail that itself becomes a plaintext-
    secret store is a liability, not a safeguard.
  - `user_agent` — `req.headers['user-agent']`.
- `AuditLogType`/`AuditLogUserType` (GraphQL) and `users.service.ts`'s
  `getAuditLogs()` mapping extended with `outcome`/`userAgent` — the new
  columns were otherwise write-only, invisible to the admin UI that
  actually reads this data.
- `admin/users/index.jsx`'s Audit Logs tab: requests the two new fields,
  shows a "failed" chip next to the action chip when `outcome === 'failure'`,
  and shows the captured user agent in the expanded payload view.

## A second real bug found and fixed in the same page

`admin/users/index.jsx`'s Audit Logs tab fell back to 3 fabricated rows
(`s.chen@healthsync.com`, etc.) whenever the real `getAuditLogs` result was
empty — an empty result (no activity matching the current filter, or a
genuinely quiet org) treated the same as "no backend", the same defect
class `BUG009`/`BUG015` already fixed elsewhere. `getAuditLogs` is a real,
fully-wired query with a real write side now (this fix's own interceptor) —
fixed to show a real "No audit log entries match the current filter" empty
state instead.

## Verification

- 13/13 interceptor unit tests pass (7 new: outcome success/failure,
  resource_id from args vs. from result vs. absent-on-failed-create, details
  capture, redaction). 2 new `users.service.spec.ts` cases for the
  `outcome`/`userAgent` GraphQL mapping, including the historical-row-maps-
  to-undefined case. Full backend suite 677/677. `tsc --noEmit` and
  `eslint` clean, backend and frontend.
- Live: logged in as `admin@medibook.dev`, ran a real `updateClinic`
  (succeeded) and a real invalid `updateClinic` (empty required `name`,
  rejected by `ValidationPipe`). `getAuditLogs` confirmed both rows: the
  first `outcome: "success"`, real `resourceId`, real `details` with the
  password field N/A here (none in this mutation) so nothing redacted; the
  second `outcome: "failure"`, same `resourceId`, real `userAgent:
  "curl/8.21.0"`. Pre-fix historical rows in the same query correctly show
  `outcome: null, userAgent: null` — not fabricated, honestly absent.
  Confirmed a real `login` mutation's `details` redacts its `password`
  field to `"[REDACTED]"`. These are real, permanent audit-trail rows —
  left in place rather than deleted, since deleting audit-log entries
  during "cleanup" would undermine the exact property being tested.

See `TR065`.

## What this does not close

- No pagination/retention policy for `AuditLogs` itself — out of scope,
  unrelated to this item's DoD.
- Did not audit whether every one of this codebase's ~150 mutations
  produces a *useful* `resource`/`action` pair via the verb-pattern
  heuristic — spot-checked via the live test above and the existing test
  suite's fixtures, not exhaustively re-verified per-domain.
