---
id: TR191
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP191
related: []
---

# TR191 — Test results: OPD cashless claim submission and tracking

All 20 `TP191` cases pass.

`npx jest src/insurance/insurance.service.spec.ts --maxWorkers=2`:
33/33 tests pass (18 new).

`npx jest src/pages/manager/claims/index.test.jsx --runInBand`: 4/4
tests pass (all new).

Full backend unit suite: 92/92 suites, 1521/1521 tests. Integration
suite: 4/4 suites, 387/387 tests — **initially red** (383/387 failing at
app bootstrap, not at any assertion) due to a missing explicit
`{ type: () => String }` on the `claims` query's `status` argument;
fixed and reconfirmed green (see `PLAN171`'s own account). The new
`20260826220000_claims` migration applied cleanly via the integration
harness's own `global-setup.ts`. `tsc --noEmit`/`eslint` clean on
backend; `eslint` clean on all touched frontend files (0 new warnings on
`manager/claims/index.jsx`); full `npm run lint` confirmed the ratchet
unchanged at exactly 1911 warnings.

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The unit + mocked-Apollo coverage above exercises the
exact Hard Rule 6 policy/patient validation, the full state-machine
transition matrix, and the real end-to-end submit → list → approve
round trip a live insurance-desk session would use. The integration
suite's real GraphQL schema build is what caught the one real bug this
slice produced — see `PLAN171` for why no unit test could have.
