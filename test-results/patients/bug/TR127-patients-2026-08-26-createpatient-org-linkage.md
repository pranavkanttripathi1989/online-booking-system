---
id: TR127
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP128
related: [BUG024, PLAN101]
---

# TR127 — Results for `Patients.client_org_id` (F-04)

Executed 2026-08-25/26 against `medibook_backend`/`medibook_postgres` on
`master`, as part of a 10-finding pick-up from
`project-plans/analysis/02-findings-register.md`.

## Unit

`patients.service.spec.ts`: 38/38 pass (13 new). Full backend suite: **84
suites / 1317 tests**, all passing except one flaky, pre-existing
`account.service.spec.ts` failure under full-parallel resource contention
(re-run in isolation: 30/30 pass — matches CLAUDE.md's own documented
bcrypt-under-contention pattern, not a regression). Integration: **4
suites / 369 tests**, all passing. `eslint`: 0 errors. `tsc --noEmit`:
clean.

## A real integration-test fixture bug found and fixed along the way

`test/integration/tenancy.int-spec.ts`'s `patients` domain cases failed
immediately after the schema change — the fixture rows in
`test/integration/setup/fixture.ts` created `Patients` with no
`client_org_id` at all, so `orgScope()`'s new direct-column filter never
matched them (`ids: []` where the matrix expected the fixture patient's
own id). Fixed by stamping `client_org_id: IDS.orgA`/`IDS.orgB` on the two
fixture rows, matching how `productCategories`/`products` fixtures
already do for their own `client_org_id` columns.

## Live verification

`patients(first: 5)` as `manager@medibook.dev` returned `total: 112` —
the exact predicted count from the pre-migration blast-radius check (137
total, 112 with real appointment history at the caller's org). Created a
new patient via `createPatient`, confirmed via direct SQL that
`client_org_id` was correctly stamped to the caller's own org.

## Commits

See the commits immediately following this test-results doc in `git log`.
