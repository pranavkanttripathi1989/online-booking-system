---
id: PLAN092
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ065
related: []
---

# PLAN092 — Implementation plan for dependant self-scoping (prescriptions + test results)

Technical implementation plan for `REQ065`. Backend-only, no schema
change — reuses `PatientsService.ownAndDependantPatientIds(user)`,
already built and tested by `REQ018`.

## Facts confirmed before touching either service

- `PatientsService.ownAndDependantPatientIds(user)` is already `public`
  (no access modifier), already exported via `PatientsModule`, and
  already consumed cross-module by `AppointmentsService` (constructor
  injection + `PatientsModule` import) — the exact pattern to replicate,
  not a new one to invent.
- Confirmed no circular-import risk: `PatientsModule` imports nothing
  from `prescriptions/` or `test-results/`.
- `TestResults.patient_id` is a nullable `String?` (`schema.prisma`) —
  most rows have it `null` today (patient is free-text, no picker in the
  UI, a pre-existing documented design choice). The widening is
  correct regardless: `ownAndDependantPatientIds` never returns `null`,
  so a null `row.patient_id` still never matches, preserving the
  existing fail-closed behavior for free-text rows.
- `messages.service.ts` was read in full before ruling it out — see
  `REQ065`'s own "current-state gap" section for why it has no
  `patient_id` concept to widen at all.

## Changes

**`prescriptions.module.ts` / `test-results.module.ts`**: added
`imports: [PatientsModule]`.

**`prescriptions.service.ts`**: constructor now also injects
`PatientsService`. `loadPrescriptionForUser()`'s patient check and
`patientPrescriptions()`'s own guard both replaced with
`const allowedIds = await this.patientsService.ownAndDependantPatientIds(user); if (!allowedIds.includes(...)) throw ...` —
same `NotFoundException`, same message, only the membership test widens.

**`test-results.service.ts`**: constructor now also injects
`PatientsService`. `findAll()` now resolves `allowedPatientIds` once
before building its `where` clause and filters with
`patient_id: { in: allowedPatientIds }` instead of a scalar equality —
the `undefined` case (non-patient caller) is preserved so the filter key
is omitted entirely for staff/clinician/manager callers, matching the
original behavior exactly. `findOne()`'s post-fetch check now calls the
same helper and checks list membership instead of equality.

## Testing (see `TP119`)

- `prescriptions.service.spec.ts`: added a `PatientsService` mock
  (default behavior mirrors "no dependants configured" — every existing
  test written before this slice keeps passing unchanged) plus 4 new
  cases covering both dependant-allowed and still-rejected paths for
  `prescription()` and `patientPrescriptions()`.
- `test-results.service.spec.ts`: same mock pattern; updated 2
  pre-existing assertions that checked `where.patient_id` as a scalar
  (now `{ in: [...] }`), plus 3 new cases for `findAll`'s filter shape
  and `findOne`'s dependant-allow/still-reject paths.
- Full backend suite re-run at the end: unit (80 suites / 1224 tests),
  integration (4 suites / 369 tests — `tenancy.int-spec.ts` in
  particular, the suite that would catch a tenant-isolation regression),
  `eslint`, `tsc --noEmit` — all clean.

## What this does not close

`messages.service.ts` — not a bug fix, a genuine open product question;
logged in `context/open-questions.md` rather than force-fit. `REQ018`'s
own residue note's third domain is therefore not "done" but
"reclassified" — see that open question for what would need deciding
before any code changes there.
