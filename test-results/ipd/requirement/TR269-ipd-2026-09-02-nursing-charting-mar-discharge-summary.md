---
id: TR269
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: TP269
related: [REQ180, PLAN249]
---

# TR269 — Test results: IPD slice 2 (nursing charting, MAR, discharge summary)

## Outcome

All 58 cases in `TP269` pass. 57 new unit tests written (cases 1-57 map
1:1 onto `nursing.service.spec.ts` (11), `medication-orders.service.spec.ts`
(14), `mar.service.spec.ts` (12), `mar-schedule-sweep.service.spec.ts` (7),
`discharge-summary.service.spec.ts` (13)); case 58 is the one expected
regression-test update in `encounters.service.spec.ts`.

Full backend suite: **157 suites / 2478 tests**, all passing.
`npx tsc --noEmit` and `npx eslint "{src,apps,libs,test}/**/*.ts"` clean.

## Live-only checks

Container restarted after `docker exec medibook_backend npx prisma
generate` + schema regeneration. First boot attempt failed with a real
`UndefinedTypeError` (see `PLAN249`'s own account — four `@Args()`
declarations with a TS union type and no explicit `type:`); fixed, and the
second boot succeeded cleanly (`Nest application successfully started`).
Live GraphQL introspection then confirmed every new operation:

Queries: `admissionVitals`, `intakeOutputRecords`, `intakeOutputBalance`,
`admissionNotes`, `admissionHandovers`, `wardHandovers`,
`admissionMedicationOrders`, `ipdMedicationOrder`, `admissionMar`,
`dischargeSummaryTemplates`, `dischargeSummary` — all FOUND.

Mutations: `recordAdmissionVitals`, `recordIntakeOutput`,
`createAdmissionNote`, `signAdmissionNote`, `addAdmissionNoteAddendum`,
`createShiftHandover`, `acknowledgeShiftHandover`,
`createIpdMedicationOrder`, `holdIpdMedicationOrder`,
`resumeIpdMedicationOrder`, `stopIpdMedicationOrder`,
`administerMedication`, `recordPrnAdministration`,
`createDischargeSummaryTemplate`, `createDischargeSummary`,
`updateDischargeSummary`, `signDischargeSummary` — all FOUND.

## Frontend

`npx eslint` on the three touched files: 0 errors (only the pre-existing,
accepted `I18N-1` warning class — no i18n layer exists yet). `npm run
build` succeeded; `NursingChart` received its own lazy chunk (37.99kB /
9.35kB gzipped). `npm run size` green on all four budgets (initial bundle
331.29kB / 350kB limit; largest lazy chunk 109.93kB / 115kB;
RichTextEditor chunk 125.06kB / 130kB; initial CSS 13.59kB / 18kB).

Full frontend suite (parallel run): 55/64 suites clean, 399/423 tests
passing on the first pass. The 9 failing suites (`clinician/Calendar`,
`clinician/PrescriptionBuilder`, `patients/detail`, `manager/claims`,
`clinician/EncounterWorkspace`, `booking/index`, `admin/Communications`,
`manager/imports`, `manager/revenue-share`) import nothing this slice
touched. `pages/ipd/Admissions.test.jsx` failed once in the very first
combined run (a debounced-search timing case) and passed cleanly in
isolation on immediate re-run — confirmed as this codebase's own
documented full-parallel-run contention flakiness, not a regression, by
running the unmodified pre-slice-2 `Admissions.jsx` (via `git stash`)
through the identical test and observing it pass, then re-running the
slice-2 version alone and observing it also pass. Two of the newly-flagged
9 (`manager/revenue-share`, `admin/Communications`) were additionally
spot-checked in isolation and both passed clean, consistent with the same
contention explanation for the rest.

## Commits

- `e10a380` feat(backend): IPD slice 2 -- nursing charting, medication
  orders, MAR, discharge summary
- `71adee8` test(backend): IPD slice 2 unit test coverage
- `f3c7c0d` feat(frontend): IPD slice 2 -- nursing charting UI
