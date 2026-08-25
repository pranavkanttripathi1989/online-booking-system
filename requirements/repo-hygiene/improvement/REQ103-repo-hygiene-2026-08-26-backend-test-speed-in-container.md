---
id: REQ103
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: —
related: []
---

# REQ103 — Backend unit test suite is slow inside the `medibook_backend` container

## Why this slice

`project-plans/02-findings-register.md` F-32 measured the backend unit
suite at ~400s inside `medibook_backend` (via `docker exec`) versus
~42s quoted historically on the host — this session's own real run
measured 189s on the host for the current, larger suite (84 suites /
1324 tests), still far under any in-container figure. Investigation
found two real, independent contributors:

1. **Not a CI risk at all.** `.github/workflows/ci.yml`'s `backend` job
   runs `npm test` directly on a bare `ubuntu-latest` runner — it never
   touches the `medibook_backend` Docker image. The in-container
   slowness this finding describes is unreachable from the real CI
   pipeline; it only affects a developer choosing to run
   `docker exec medibook_backend npm test` instead of running from the
   host, which `CLAUDE.md`'s own Commands section already lists as an
   interchangeable option ("`backend/`, or `docker exec
   medibook_backend <cmd>`") without flagging that the container path is
   dramatically slower for this one command — unlike `npm run test:int`,
   which already carries an explicit "must run from the host" callout
   for a different (correctness, not speed) reason.
2. **A real, fixable cost inside `jest.config.js`.** The unit config's
   `ts-jest` transform does NOT set `isolatedModules: true` — every one
   of the 84 suites' `.ts` files is fully type-checked on transform, not
   just transpiled. `jest.integration.config.js` already made and
   documented the opposite choice for exactly this reason ("type-checking
   the whole 230-file AppModule graph on every boot took longer than the
   suite itself... types are still enforced — by the unit config, by
   `tsc --noEmit`, and by the editor"). The unit config's own comment
   claims this cost is acceptable because it's "the fast feedback loop"
   at 130s — a figure that has already drifted (189s measured this
   session, on a suite that's grown from 50 to 84 files) and drifts
   further every time a new domain module ships. This same type-checking
   CPU cost pays out disproportionately under the container's shared,
   contended host CPU (this dev machine typically runs 7-8 containers
   simultaneously) and macOS bind-mount I/O overhead on `./backend:/app`
   — explaining why the container-vs-host gap is so much larger than a
   simple "containers are a bit slower" difference would predict.

## Acceptance criteria

- **Given** a developer runs the backend unit suite from the host,
  **when** they run `npx jest --maxWorkers=2`, **then** the suite
  completes with no more test-visible behavior change (all tests still
  pass, `tsc --noEmit` and `eslint` still separately enforce every type
  error the removed in-transform check would have caught).
- **Given** a developer is tempted to run the suite via `docker exec`,
  **when** they read `CLAUDE.md`'s Commands section, **then** they are
  told this path is significantly slower and why, with the host command
  as the recommended default — matching the existing `test:int` callout's
  own precedent.

## In scope

- Add `isolatedModules: true` to `jest.config.js`'s `ts-jest` transform
  (mirroring `jest.integration.config.js`'s already-proven, already-
  documented tradeoff).
- Add a short callout to `CLAUDE.md`'s Commands section noting the
  in-container unit-test slowness and recommending the host path,
  matching the existing `test:int` callout's tone and placement.
- Measure and record real before/after run times, both inside the
  container and on the host.

## Deliberately out of scope

- Any change to `docker-compose.yml`'s volume/resource configuration —
  investigation found no CPU/memory limit set on the `backend` service,
  so there is nothing there to relax; the residual gap is bind-mount I/O
  overhead plus host contention, neither of which this repo controls
  from compose config alone.
- Any change to the CI workflow — it was already correctly scoped away
  from the container.
- Any change to `jest.integration.config.js` — already correct.
