---
id: CTX-appointments-2026-08-24-req018
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ018
related: [REQ017, PLAN059, TP086, TR085]
---

# appointments — REQ018 P0 subset: patient dedup + merge, family/dependant profiles (2026-08-24)

Slice 6 of a 6-requirement Phase 1 MVP pass (REQ017 → REQ020 → REQ021 →
REQ019 → **REQ018** → REQ032, dependency order — the final one). Two of
REQ018's four P0 stories, chosen because they form a coherent pair around
one domain (`patients`); per-service prepayment policy (`US-BOOK-03`) and
the embeddable booking widget (`US-BOOK-05`) are both P0 in the
requirement's own phase assignment but deliberately deferred to keep this
slice finishable and fully tested — logged as open, not silently dropped.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ018 | [booking engine: channels, dedup, family profiles, no-show policy](../../requirements/appointments/requirement/REQ018-appointments-2026-08-22-booking-engine-channels-and-policies.md) |
| implementation-plans | PLAN059 | [patient dedup + merge, and family/dependant profiles (P0 slice)](../../implementation-plans/appointments/requirement/PLAN059-appointments-2026-08-24-patient-dedup-and-family-profiles.md) |
| test-plans | TP086 | [verification plan](../../test-plans/appointments/requirement/TP086-appointments-2026-08-24-patient-dedup-and-family-verification.md) |
| test-results | TR085 | [verification results — pass](../../test-results/appointments/requirement/TR085-appointments-2026-08-24-patient-dedup-and-family-verification.md) |

## What shipped

- Schema: `PatientRelations` (owner/dependant self-relation on `Patients`,
  a relationship label) and `PatientMerges` (append-only merge audit
  trail).
- Backend: `patients.service.ts` gained `findPotentialDuplicates`
  (exact-phone + optional name/DOB filter, a suggestion never a block),
  `mergePatients` (manager/admin/super_admin only — moves every FK
  reference across 6 tables, relinks a login only if the survivor has
  none, soft-deletes, audits), `myDependants`/`addDependant`. Self-scoping
  in `findAll`/`findOne` widened from `id === own` to `id IN (own +
  dependants)`, computed fresh per request via a real `PatientRelations`
  query, never a JWT claim list.
- A pre-existing security gap found and closed in the process:
  `AppointmentsService.create()` never validated a `'patient'`-role
  caller's `input.patient_id` at all — any patient could book under any
  other patient_id. Fixed using the same own-or-dependant id set.
- A previously fully-built but completely unreachable feature made real:
  `patients/index.jsx`'s patient-merge UI (pairwise selection, review
  dialog) existed as a Semble-parity mockup gated behind `{useMock &&
  ...}` — only ever shown once the real backend query returned zero
  results, which never happens against a populated dev database. Regated
  by role instead and wired to the real `mergePatients` mutation.
- Frontend: dedup-suggestion dialog on `CreatePatientPage.jsx`; new
  `pages/patient/Family.jsx` (patient self-service dependant management).
- Tests: 17 new backend unit tests, 3 new frontend component tests (added
  specifically to recover a self-caused frontend coverage-threshold dip —
  see below), and a new 3-scenario Playwright e2e spec.

## Real findings from this slice

1. **The pre-existing `createAppointment` patient_id gap**, above — Hard
   Rule 6's bug class, found because family profiles needed the opposite
   of a blanket restriction and so required actually looking at what was
   there before.
2. **A frontend coverage-threshold regression, self-caused and by design
   not silently fixed.** `jest.config.cjs`'s global function-coverage
   floor is explicitly commented "never lower it" — today's three slices'
   worth of new, untested pages diluted it to a measured `1.69%` against a
   `1.7%` floor. Fixed by adding two real component test files
   (`PrescriptionPrint.test.jsx`, `Family.test.jsx`), not by lowering the
   number.
3. **Two environment-level lessons, not code defects** (full account in
   `PLAN059`): the same `nest start --watch` module-recompile race
   documented in the queue-management slice recurred, plus a second,
   distinct transient `Cannot find module './prisma/prisma.module'`
   failure this container's logs show independently recurring — both
   resolved with a clean restart, verified via direct GraphQL schema
   introspection rather than trusting a clean startup log.
4. **A real e2e-spec bug in the merge test**: `patients/index.jsx`'s
   merge-mode rows carry an explicit `role="button"`, not a `<TableRow>`'s
   implicit `role="row"` — a `getByRole('row', ...)` locator silently
   never matched. Fixed by targeting the checkbox's own accessible name.

## What's deliberately not built yet

`US-BOOK-03` (per-service prepayment policy) and `US-BOOK-05` (embeddable
widget + short-link/QR) — both P0 in REQ018's own phase assignment, scoped
out of this slice to keep it coherent; P1 items `US-BOOK-04` (auto-no-show)
and `US-BOOK-06` (intake fields). Also not widened this slice: self-scoping
for a dependant's prescriptions/test-results/messages — only the profile
view and booking paths were widened, each additional domain being real,
separate, security-sensitive follow-on work. Each gets its own future
`PLAN###` under REQ018 when picked up — not silently dropped.

## This closes the current Phase 1 MVP pass

REQ017 → REQ020 → REQ021 → REQ019 → REQ018 → REQ032 is now five of six
done (this slice's P0 subset), with REQ032 (subscription plan engine) the
one remaining item in the sequence.
