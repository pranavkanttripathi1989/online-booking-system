---
id: TR200
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP200
related: []
---

# TR200 — Test results: batch branch-override prefetch for the appointments list preview

All 9 `TP200` cases pass.

`npx jest src/branch-overrides/branch-overrides.service.spec.ts
src/appointments/appointments.service.spec.ts --maxWorkers=2`: 104/104
tests pass (6 new: 3 in `branch-overrides.service.spec.ts`, 3 in
`appointments.service.spec.ts`).

Full backend unit suite: 93/93 suites, 1565/1565 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — no schema change, and
`npm run test:int` (boots the real `AppModule`) confirms
`AppointmentsModule`'s new `BranchOverridesModule` import introduces no
circular dependency. `tsc --noEmit` clean. `npx eslint
"src/appointments/**/*.ts" "src/branch-overrides/**/*.ts"`: 0 errors.

## Live verification

Not performed against the real dev stack — no browser/CLI GraphQL
client available this session. The mocked-Prisma coverage above
exercises the real de-duplication behaviour, the correct `Map` keying,
and the actual price computed for a row whose pair does/doesn't have a
matching override — the same `resolveServicePrice()` call the two real
charge-determining sites already use, just supplied with a
batch-prefetched override instead of a per-call one.
