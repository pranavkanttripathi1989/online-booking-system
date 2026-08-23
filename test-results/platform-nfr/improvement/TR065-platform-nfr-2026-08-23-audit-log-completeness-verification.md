---
id: TR065
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP066
related: [REQ037, PLAN039]
---

# TR065 — Results for audit-log completeness

Executed 2026-08-23 against the real running dev backend, on `master`.

| Case | Result | Evidence |
|---|---|---|
| TC-01/02 outcome success/failure | **pass** | Unit tests; live: real `updateClinic` succeeded → `outcome:"success"`; real invalid `updateClinic` (empty `name`) rejected by `ValidationPipe` → `outcome:"failure"` |
| TC-03 resource_id from args.id | **pass** | Live: both `updateClinic` calls' audit rows show `resourceId:"7307c9d9-8a74-4305-8933-7b0a73c1486d"` |
| TC-04/05 create result-id / failed-create absent | **pass** | Unit tests only (no live create exercised to avoid dev-DB clutter) |
| TC-06 redaction | **pass** | Unit test; live: real `login` mutation's audit row shows `"details":"{\"input\":{\"email\":\"admin@medibook.dev\",\"password\":\"[REDACTED]\"}}"` |
| TC-07 user_agent | **pass** | Live: both `updateClinic` rows show `"userAgent":"curl/8.21.0"` |
| TC-08 GraphQL read mapping | **pass** | `getAuditLogs` query returned `outcome`/`userAgent` on every row |
| TC-09 historical row | **pass** | Live: 2 pre-fix rows (a `login` and a `forgotPassword` from earlier this session) show `"outcome":null,"userAgent":null` — correctly absent, not fabricated |
| TC-10 real empty state | **pass** | Code review of the new conditional |
| TC-11 static checks | **pass** | Backend: 677/677 tests, `tsc --noEmit` clean, `eslint` clean. Frontend: `eslint src/pages/admin/users/index.jsx` — 0 errors, 7 pre-existing warnings |
| TC-12 live end-to-end | **pass** | See TC-01–07 evidence above — all from the same live session |

## Notes

The two real audit rows created during live verification (a real admin
login, a real `updateClinic` success, a real `updateClinic` failure) were
left in the database rather than deleted — deleting entries from an audit
trail during "cleanup" would undermine the exact property under test.

## Commit

Pending — see the commit immediately following this doc.
