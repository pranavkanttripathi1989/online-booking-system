---
id: PLAN042
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ039
related: [TP069, TR068]
---

# PLAN042 — Pagination safety-net middleware

No test-suggestions stage per `REQ013` Phase D.

## Approach

- New `backend/src/prisma/clamp-take.middleware.ts`: exports
  `DEFAULT_MAX_TAKE = 200` and `clampTakeMiddleware(defaultMaxTake?)`,
  returning a `Prisma.Middleware` function. Checked `params.action ===
  'findMany'` and `params.args?.take === undefined` before setting
  `params.args = {...params.args, take: defaultMaxTake}`.
- `prisma.service.ts`'s `onModuleInit()`: `this.$use(clampTakeMiddleware())`,
  registered once, after `$connect()`.
- Deliberately a standalone module, not inlined — makes the logic
  unit-testable without a real `PrismaClient`/database connection.

## Verification plan

See `TP069`.
