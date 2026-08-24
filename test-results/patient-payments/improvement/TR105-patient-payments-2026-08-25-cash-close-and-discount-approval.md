---
id: TR105
type: improvement
feature: patient-payments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP106
related: [PLAN079]
---

# TR105 — Test results: day-end cash close + discount-approval workflow

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP106 case outcomes

All 19 cases pass. `appointment-payments.service.spec.ts` gained 20 new
cases across five new describe blocks (discount validation, below-
threshold inline application, above-threshold queueing incl. a per-org
threshold override, `decideDiscountApproval`, `closeCashDrawer`) plus a
list-query org-scoping block; all 59 pre-existing tests in that file
still pass unchanged.

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `npx prisma validate` | Clean |
| `backend: npx jest --maxWorkers=2` | 79/79 suites, 1184/1184 tests (was 79/1165 after REQ055) |
| `backend: npm run test:int` (from host) | 4/4 suites, 360/360 tests (was 351) |
| `backend: eslint` | Clean |
| `backend: tsc --noEmit` | Clean |
| Container compile (`docker restart` + `docker logs`) | "Found 0 errors. Watching for file changes." |

## No real bugs found this pass

The refactor preserved backward compatibility by construction: the 59
pre-existing `recordCounterPayment`/related tests never set
`discount_amount`, so it defaults to 0 and `netAmount === expectedAmount`
for every one of them — all 59 passed unchanged on the first run after
the refactor, with no fixture or assertion updates needed. The one place
a genuine design decision had to be made rather than discovered via a
failing test was the self-approval check in `decideDiscountApproval`
(`request.requested_by_user_id === user.sub`) — added deliberately during
design, per `REQ056`'s own note that the resolver-level role gate alone
can't express "a genuinely different person," not found by a test
catching its absence.

## Verification

Real, not just unit-tested: `npx prisma validate`, a full migration apply
+ `prisma generate` on both host and container, a container restart with
a clean "Found 0 errors" compile log (this restart took noticeably longer
under host load than prior slices' restarts — confirmed via `docker
stats` showing active CPU usage throughout rather than a hang, consistent
with CLAUDE.md's own documented "full recompile under host load" pattern,
not a wedged container), and the full verification suite above.
