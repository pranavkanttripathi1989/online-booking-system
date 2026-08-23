---
id: PLAN039
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ037
related: [TP066, TR065]
---

# PLAN039 — Audit-log completeness

No test-suggestions stage per `REQ013` Phase D — extends an already-real,
already-tested interceptor along an already-established schema shape
(`resource_id`/`details` columns already existed, unpopulated).

## 1. Schema

- `20260823020000_audit_log_outcome_and_user_agent/migration.sql`:
  `ALTER TABLE "AuditLogs" ADD COLUMN "outcome" TEXT; ADD COLUMN "user_agent" TEXT;`
  Both nullable.
- `schema.prisma`: mirror both fields on `AuditLogs`.

## 2. Interceptor

- `writeLog()` gains `args`, `outcome: 'success' | 'failure'`, `result`
  parameters — `outcome` comes directly from which `tap()` branch invoked
  it, not re-derived.
- `extractResourceId(args, result)`: `args.id` first, else `result.id`.
- `sanitizeArgs(args)`: recursive redaction of a fixed deny-list of key
  names (`password`, `new_password`, `token`, `otp`, `secret`, ...) to
  `'[REDACTED]'`, cast to `Prisma.InputJsonValue` for the `details` write.

## 3. Expose the new columns on the read side

- `AuditLogType`: add `userAgent`/`outcome` fields.
- `users.service.ts`'s `getAuditLogs()`: map `r.user_agent`/`r.outcome` (both
  `?? undefined`, matching the existing `resourceId`/`ipAddress` pattern).
- `admin/users/index.jsx`: request the two new fields; show a "failed" chip
  on `outcome === 'failure'`; show `userAgent` in the expanded payload view.

## 4. Fix the same page's own mock-fallback bug, found while touching it

`auditLogs.length > 0 ? auditLogs : [...3 fake rows...]` → a real empty
state. Same class of fix as `BUG009`/`BUG015`.

## Verification plan

See `TP066`.
