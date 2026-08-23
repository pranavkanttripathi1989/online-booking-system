---
id: CTX-platform-nfr-2026-08-23-req037
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ037
related: [REQ035, REQ036, BUG015]
---

# platform-nfr — REQ037, audit-log completeness (2026-08-23)

Second slice of `06-execution-plan.md` P3. `AuditLogs` gained `outcome`/
`user_agent` columns, the interceptor now populates every column including
the previously-write-only `resource_id`/`details`, and the admin UI can now
actually see any of it. Found and fixed a second real bug along the way:
`admin/users/index.jsx`'s Audit Logs tab fell back to 3 fabricated rows on
any real empty result.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ037 | [audit-log completeness](../../requirements/platform-nfr/improvement/REQ037-platform-nfr-2026-08-23-audit-log-completeness.md) |
| implementation-plans | PLAN039 | [implementation](../../implementation-plans/platform-nfr/improvement/PLAN039-platform-nfr-2026-08-23-audit-log-completeness.md) |
| test-plans | TP066 | [verification plan](../../test-plans/platform-nfr/improvement/TP066-platform-nfr-2026-08-23-audit-log-completeness-verification.md) |
| test-results | TR065 | [verification results](../../test-results/platform-nfr/improvement/TR065-platform-nfr-2026-08-23-audit-log-completeness-verification.md) |
| test-suggestions | — | skipped — extends an already-real, already-tested interceptor |

## What this does not do

- No retention/pagination policy for `AuditLogs`.
- Did not exhaustively re-verify the verb-pattern action/resource heuristic
  across every mutation in the codebase.
