---
id: PLAN182
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ142
related: [TP202, TR202]
---

# PLAN182 — Implementation plan: F-28 residue investigation

## Change

Investigation-heavy, per this slice's own scoping — no application code
change was warranted (see requirement doc's "Deliberately out of
scope"). What did change:

**`project-plans/analysis/02-findings-register.md`**: F-28's status paragraph
rewritten with the concrete, spec-by-spec-confirmed evidence — the
corrected "matching fixture names isn't proof of stack" reasoning, the
structural `playwright.config.js`/`npm run e2e` default evidence, the
live-found-and-fixed `medibook_backend_e2e` staleness, and the live
cold-start-then-clean-pass reproduction.

**`backend/src/appointments/appointments.service.spec.ts`**: 3
non-null assertions (`result.data[0]!.service!.price`, etc.) — a real
`TS2532: Object is possibly 'undefined'` in `REQ140`'s own newly-added
tests, surfaced by `medibook_backend_e2e`'s own `nest start --watch`
type-checker once it was repaired and re-compiled this file, not caught
by a standalone `tsc --noEmit` run beforehand (the two compilers'
incremental-cache states apparently diverged). `result.data[0]` is
always populated in the two asserting tests (fixture rows are supplied
synchronously to the mock, and `count` is asserted separately) — the
assertions are safe.

**Live infrastructure repair** (not a code change, but the load-bearing
finding of this slice): `docker exec medibook_backend_e2e npx prisma
generate`, `docker exec medibook_backend_e2e npm install`, then `docker
restart medibook_backend_e2e` — brought a completely non-functional
container (357 TS errors, GraphQL endpoint unreachable) back to a real,
verified-working state.

## Testing

Full backend unit suite re-run after the strictness fix: 93/93 suites,
1565/1565 tests, unchanged. `tsc --noEmit` clean.

Live e2e evidence (not a formal spec of its own, the investigation's own
deliverable): `npm run e2e:isolated -- auth-login.spec.js` run twice
against the now-healthy isolated stack — 1/2 passed (1 cold-start
timeout) on the first run, 2/2 passed (14.3s, 19.2s) on the second.

## Documentation

`REQ142` (this requirement, carries the full investigation account),
`PLAN182` (this plan), `TP202`/`TR202` (verification), a context bundle,
and index updates across all five doc roots plus the
`test-coverage-audit` feature README. `project-plans/analysis/02-findings-register.md`'s
F-28 entry updated in place (not a new finding — same section, revised
status).
