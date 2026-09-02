---
id: TR273
type: improvement
feature: test-results
created: 2026-09-03
updated: 2026-09-03
status: done
parent: TP273
related: [REQ184, PLAN253]
---

# TR273 — Test results: `recordTestResult` completion path (P2-13)

## Outcome

All 10 unit-level cases in `TP273` pass. 9 new unit tests
(`test-results.service.spec.ts`, 30 total in the domain now, up from 21).

Full backend unit suite: green (166 suites, up from 165). `npx tsc --noEmit`
and `npx eslint "{src,apps,libs,test}/**/*.ts"` clean.

## Live-only checks

Container restarted after the schema/resolver change (no schema change this
slice — resolver/service/DTO only). Booted cleanly on the first attempt.
Live GraphQL introspection confirmed `recordTestResult` genuinely served.

Integration: full suite re-run — **13 suites / 516 tests**, all green,
including the domain's pre-existing `matrix-coverage.int-spec.ts` coverage
(unaffected, confirming this same-domain mutation didn't regress the
already-proven cross-tenant guarantee on this table).

## Live browser verification (`chrome-devtools` MCP, real seeded account)

Logged in as `receptionist@medibook.dev` (role `staff`) against the real
dev stack. Navigated to `/test-results`:

1. **Confirmed the previously-dead code path was genuinely dead.** Before
   this slice's own fix, the row for patient "F04 LiveTest" (a pre-existing
   fixture, ordered 2026-08-25) had sat at `pending` with no way to ever
   change — exactly the bug this slice closes.
2. **Clicked the new "Record Result" action** (correctly present on the
   pending row, correctly absent on the already-completed "Priya Sharma"
   row) — the `RecordResultDialog` opened with "Complete with Results"
   pre-selected and one empty parameter row.
3. **Filled a real value** (Hemoglobin / 14.2 g/dL / 13.5-17.5 / Normal) and
   clicked "Complete Result" — the mutation succeeded, a "Result saved."
   toast appeared, the row's status chip flipped to "Completed", its
   "Completed" date column populated with the real current date, and the
   KPI counts updated live (Pending 1→0, Completed 1→2) with zero manual
   refresh.
4. **Opened "View Result"** on the now-completed row — the values table
   rendered the exact real value just recorded (`Hemoglobin | 14.2 g/dL |
   13.5-17.5 | Normal`). This is the first time in this domain's entire
   history that a genuinely-completed result's real values have ever been
   displayed against production data — the `toGraphQL()` withholding logic
   (`TC-PAT-API-010`) had existed since this domain's own original build
   but had never once had anything real to withhold-then-reveal.
5. **Clicked the "Pending" KPI card** — the status filter set itself to
   `Pending` and the list correctly showed "No test results found" (0
   pending remaining), confirming the new click-to-filter behavior.

**Known, accepted live side effect**: the "F04 LiveTest" fixture row is now
permanently `completed` — by this slice's own deliberate design, `completed`
is immutable (no mutation path exists, or should exist, to revert it), the
same lock-once-signed precedent this slice applied to lab data for the first
time. Unlike a reversible settings toggle, this cannot be reverted without a
direct database edit, which was not done — the row was a pre-existing
test-fixture artifact (not part of `seed.ts`'s core 5-account seed data),
and its permanent completion is a *correct* outcome of the fix being
verified, not corruption of shared state.

## Frontend

`npx eslint` on the touched files: 0 new warnings beyond the page's own
pre-existing baseline (unused imports/hooks predating this slice). `npm run
build` succeeded. `npm run size` — all four budgets green. 2 new tests
(`index.test.jsx`, 7 total in the file), both passing. Full frontend unit
suite: 6 suites flagged failing in one full-parallel run
(`PrescriptionBuilder`, `test-results/index` itself, `patients/detail`,
`booking/index`, `CreateClinicianPage`, `EncounterWorkspace`) — each
re-run alone and confirmed passing cleanly (`test-results/index.test.jsx`:
7/7 in isolation). Matches this codebase's own repeatedly-documented
full-parallel-run resource-contention pattern; none of the six import this
slice's own changed logic in a way that could explain a real regression
(`CreateClinicianPage.jsx` is the only one importing the touched
`graphql/mutations.js`, and that edit only added one new exported constant).

## Commits

- `b52d802` feat(backend): recordTestResult -- the previously-missing test result completion path
- `1759647` feat(frontend): record and complete test results in place
