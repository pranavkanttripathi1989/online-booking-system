---
id: PLAN143
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ103
related: []
---

# PLAN143 — Backend unit test suite speed (REQ103)

## Change 1 — `backend/jest.config.js`

Add `isolatedModules: true` to the existing transform, mirroring
`jest.integration.config.js`'s own already-proven pattern verbatim
(including an inline comment giving the same justification, adapted):

```js
transform: {
  '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
},
```

Risk: none expected. Type errors are still caught by `tsc --noEmit`
(already a mandatory pre-commit step, Hard Rule 3) and by `eslint`'s
`@typescript-eslint` rules — neither of which this change touches. No
test asserts on a compile-time type error surfacing as a Jest failure
(Jest specs are runtime assertions); this is purely a transform-speed
change with no behavioral surface.

## Change 2 — `CLAUDE.md` Commands section

Add a short note beside the existing backend command list, adjacent to
the existing `test:int` host-only callout, in the same tone:

> Prefer running `npm test`/`npx jest --maxWorkers=2` from the host
> over `docker exec medibook_backend npm test` — the container path is
> measured significantly slower (shared host CPU across the other
> 7-8 running containers, plus macOS bind-mount I/O overhead on
> `./backend:/app`), and CI never runs tests inside this container at
> all (`.github/workflows/ci.yml`'s `backend` job runs directly on a
> bare `ubuntu-latest` runner), so there is no correctness reason to
> prefer the container path here (unlike `test:int`, which must avoid
> the container for a connection-string reason, not a speed one).

## Testing

1. Baseline (before `isolatedModules`): time `npx jest --maxWorkers=2`
   on the host; time `docker exec medibook_backend npx jest
   --maxWorkers=2` inside the container. Record both.
2. Apply Change 1.
3. Re-run both timings. Expect the host figure to drop measurably (the
   integration config's own history reports type-checking cost
   exceeding the suite's own runtime at 230 files; this unit suite now
   covers more files still) and the in-container figure to drop by a
   comparable proportion, though absolute container time will likely
   remain higher than host time due to the unrelated I/O/contention
   factors this slice does not attempt to fix.
4. Full suite must still be 84/84 suites passing, same test count as
   before the config change (this is a transform-speed change, not a
   logic change — zero tests should gain or lose).
5. `npx tsc --noEmit` and `npx eslint` must remain clean, confirming no
   type coverage was actually lost by removing the transform-time check.
6. No integration-test change needed — `jest.integration.config.js` is
   untouched.

## Documentation

`REQ103` (requirement), this document (`PLAN143`), a `TP###`/`TR###`
pair recording the before/after timings, a context bundle, and index
updates across the five doc roots — matching this batch's own
established convention.

## Commit

One commit: `chore(backend): isolatedModules on unit test transform +
container-speed note (REQ103)`.
