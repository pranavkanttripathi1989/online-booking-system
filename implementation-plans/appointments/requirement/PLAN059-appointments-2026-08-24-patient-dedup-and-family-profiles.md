---
id: PLAN059
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ018
related: [TP086, TR085]
---

# PLAN059 — Patient dedup + merge, and family/dependant profiles, P0 slice

Slice 6 of 6 in the current Phase 1 MVP pass (REQ017 → REQ020 → REQ021 →
REQ019 → **REQ018** → REQ032, dependency order). Filed under `appointments`
(REQ018's own feature slug — "booking engine") even though the actual code
touched is almost entirely the `patients` domain, since dedup/family/merge
are `patients`-shaped extensions of the booking engine's identity problem,
not a standalone feature.

## Scope

REQ018 is a large, 4-epic requirement (patient identity, booking policy,
distribution channels, intake customization). This slice covers only the
two P0 stories that form a coherent pair around one domain:

**Built (P0):** patient dedup-suggestion + a real, tightly-gated merge tool
(`US-BOOK-01`), and family/dependant profiles — one phone-verified login
managing multiple patient records with a relationship label (`US-BOOK-02`).

**Explicitly deferred, this slice's own scope decision (not REQ018's full
P0 list):** per-service prepayment policy (`US-BOOK-03`), the embeddable
booking widget + short-link/QR (`US-BOOK-05`) — both P0 in REQ018's own
phase assignment, but scoped out here to keep this slice coherent and
fully tested rather than attempting all four P0 stories at once. Each
needs its own future `PLAN###`.

**Also deferred, P1 per REQ018's own phase assignment:** auto-mark-no-show
after a grace period (`US-BOOK-04`), configurable intake fields
(`US-BOOK-06`).

## A pre-existing security gap found and fixed while building this

`AppointmentsService.create()` never validated that a `'patient'`-role
caller's `input.patient_id` was their own — any authenticated patient
account could book an appointment under **any** other patient_id, with no
check at all (confirmed via the existing spec suite: no test exercised this
path). This is the exact Hard Rule 6 bug class ("a `create*` mutation that
takes an id in its input must validate that id belongs to the caller"), and
it surfaced specifically because family/dependant profiles needed the
*opposite* of a blanket restriction — a caller legitimately booking for
someone other than themself, but only a genuine dependant, never an
arbitrary id. Fixed by validating `input.patient_id` against
`PatientsService.ownAndDependantPatientIds(user)` (new, public specifically
for this cross-module call) rather than either leaving it unchecked or
over-restricting it to exactly `user.patient_id`.

## Design decision: widen self-scope by membership in an explicit set, not by removing the check

`patients.service.ts`'s `selfScope()`/`findOne()` previously restricted a
`'patient'` caller to exactly `id === user.patient_id`. Widened to
`id IN (ownAndDependantPatientIds(user))` — a real query against the new
`PatientRelations` table, computed fresh per request, never a JWT claim
list (a dependant added after login must be usable immediately, and a
removed one — no removal path exists yet, logged as a gap — must lose
access immediately too). The F-01 sentinel discipline still applies: an
unlinked patient account gets `['__no_patient_link__']`, never an unscoped
query.

**Not widened this slice:** `prescriptions.service.ts`'s `patientPrescriptions`
self-scope, `test-results`'s equivalent, and any other domain's own
patient-self-scope check. `US-BOOK-02`'s acceptance criterion says "book,
view records, and pay for that dependant" — this slice delivers "view the
dependant's own profile" (`patients.service.ts`) and "book for them"
(`appointments.service.ts`, above) as the two pieces that make the feature
minimally usable end-to-end. Widening every other domain's own patient
self-scope (prescriptions, test results, messages) is real, necessary
follow-on work for the feature's full "view records" promise, but touching
all of them in one slice multiplies the security review surface for a
pattern that's easy to get wrong (get one wrong and it's a cross-patient PHI
leak, not a cosmetic bug) — sequenced as explicit future work instead of
rushed here.

## Data model

`backend/prisma/migrations/20260824040000_patient_dedup_and_family/migration.sql`:

- `PatientRelations`: `patient_id` (the owning/managing patient),
  `related_patient_id` (the dependant), `relation` (free text — "child",
  "spouse", etc.), unique on `(patient_id, related_patient_id)`. Both FKs
  point at `Patients`, so this is a self-relation table needing two
  distinctly-named Prisma relations (`PatientRelationOwner`/
  `PatientRelationDependant`) to disambiguate, the same pattern
  `AppointmentStatusLogs`' `StatusLogChangedBy` already established for a
  single-sided case.
- `PatientMerges`: `surviving_patient_id`, `merged_patient_id`,
  `merged_by_user_id`, `reason?`, `merged_at` — append-only audit trail,
  per the requirement's own non-functional note that merge must be
  "reversible in principle via the audit trail even if not via a one-click
  undo."

## Backend

`backend/src/patients/patients.service.ts` gained:

- `findPotentialDuplicates(phone, firstName?, lastName?, dateOfBirth?)` —
  exact-phone match (no unique constraint to lean on), optionally narrowed
  by name-or-DOB. Deliberately a *suggestion*, never a blocking check — a
  false positive here is worse than a missed duplicate.
- `mergePatients(input, user)` — gated to `manager`/`admin`/`super_admin`
  only (not `staff`/`receptionist`, per the requirement's own
  non-functional note on blast radius). Moves every FK reference
  (`Appointments`, `Encounters`, `Prescriptions`, `TestResults`,
  `AppointmentPayments`, `Reviews`, both sides of `PatientRelations`) from
  the merged record to the surviving one inside one transaction, relinks a
  `UserProfiles` login only if the survivor has none of its own (two
  logins colliding on one merge is a genuine edge case left for a human to
  resolve, not guessed at), soft-deletes the merged record
  (`is_deleted: true`, never a hard delete), and writes the audit row.
- `myDependants(user)` / `addDependant(input, user)` — `patient`-role only.
  `addDependant` creates a new `Patients` row (a dependant has no
  email/phone of their own this slice — a child booked under a parent's
  phone-verified login) and the `PatientRelations` link in one transaction.

`AppointmentsModule` now imports `PatientsModule` (one-directional —
`PatientsModule` has no dependency back on `AppointmentsModule`, so no
cycle) specifically to call the new public
`ownAndDependantPatientIds(user)` from `create()`'s validation.

## Frontend

- `pages/patients/CreatePatientPage.jsx` — a dedup-suggestion dialog runs
  before `createPatient` fires: on submit, `potentialDuplicatePatients` is
  queried first; if candidates exist, they're shown with a "Create new
  patient anyway" escape hatch rather than a hard block.
- `pages/patients/index.jsx` — **wired a pre-existing, fully-built merge UI
  to the real backend for the first time.** `MergePatientsDialog` and the
  whole merge-mode selection flow (pairwise checkbox selection, review
  dialog) already existed as a Semble-parity mockup, but the "Merge
  Duplicates" button that opens it was gated on `{useMock && (...)}` — only
  ever rendered once the real `PATIENTS_QUERY` returned zero results, which
  in practice never happens against a real, populated dev database. The
  feature was fully built and completely unreachable. Regated on role
  (`manager`/`admin`/`super_admin`, matching the backend) instead, and
  `handleConfirmMerge` now calls the real `mergePatients` mutation and
  refetches in real mode, keeping the original client-side label-union
  simulation only for genuine offline/mock fallback.
- `pages/patient/Family.jsx` (new) — patient self-service: lists dependants,
  an "Add Dependant" dialog. Routed at `/patient/family`, new "My Family"
  sidebar entry (`patient` role).

## Testing

- Backend: 15 new cases in `patients.service.spec.ts` (dedup filtering,
  the full merge FK-remapping matrix, dependant self-scope widening for
  both `findAll` and `findOne`, `addDependant`/`myDependants` role gating)
  plus 2 new cases in `appointments.service.spec.ts` for the
  own-or-dependant `patient_id` validation on `create()`. No new tenancy-
  matrix domain needed — `patients` was already classified, and this
  slice extends that same resolver directory rather than adding a new one.
- Frontend: coverage-threshold-driven addition — `jest.config.cjs`'s
  global function-coverage floor (`1.7%`, explicitly "never lower, only
  raise" per its own comment) started failing by 0.01 points once today's
  three slices' worth of new, untested pages diluted the ratio. Rather than
  lower the floor, added real component tests for `PrescriptionPrint.jsx`
  (REQ021) and `Family.jsx` (this slice) — the minimum needed to recover
  above the floor, not padding for its own sake.
- e2e: `frontend/e2e/patient-family-and-dedup.spec.js` — three flows: the
  dedup prompt appearing (and being cancellable) on `CreatePatientPage`, a
  real merge via the now-reachable UI (confirmed via the real
  `mergePatients` GraphQL call, not the mock simulation), and a patient
  adding and seeing their own dependant.

## Two real environment lessons hit while verifying this slice (not code defects — recorded so they aren't rediscovered)

1. **The same module-recompile race as `PLAN058`'s own note, again** — new
   backend files (the `patients`/`appointments` cross-module wiring) plus
   rapid edits to `patients.resolver.ts` raced `nest start --watch`'s
   debounce a second time, leaving the live GraphQL schema missing the new
   fields (`potentialDuplicatePatients`, `myDependants`, etc.) for a period
   even after `schema.gql` on disk had already been regenerated correctly
   — confirmed by directly introspecting the running server
   (`{ __type(name: "Query") { fields { name } } }`), not by trusting the
   generated file or a clean startup log. **Escalated once**: a
   `docker restart` during this diagnosis hit a second, distinct failure —
   `Error: Cannot find module './prisma/prisma.module'`, a transient
   incremental-compile corruption this container's logs show recurring
   independently of anything in this slice (seen at least twice earlier in
   the same session, self-resolving on the next restart). Recovered with a
   second clean restart; no code change was needed for either.
2. **Playwright's `getByRole('row', ...)` doesn't always mean `<tr>`** —
   `patients/index.jsx`'s merge-mode table rows have an explicit
   `role="button"` (a clickable-row accessibility pattern), not the
   implicit `role="row"` a `<TableRow>` normally carries. The e2e spec's
   first attempt nested a checkbox locator inside a non-matching `row`
   locator and timed out silently; fixed by targeting the checkbox's own
   accessible name directly.

See `TP086`/`TR085` for the full case-by-case verification record.

## Definition of Done

- [x] Resolvers/DTOs match `REQ018`'s two scoped P0 user stories.
- [x] The pre-existing `create()` patient_id gap is closed, not just the
      new feature built around it.
- [x] Self-scoping widened by explicit set membership, never by removing
      a check.
- [x] Unit tests: happy path, tenant/self-scoping, role gating, the full
      merge FK matrix — 17 new cases, all passing.
- [x] Backend full suite green: 62 suites / 920 tests.
- [x] Backend lint and `tsc --noEmit` clean.
- [x] Backend integration suite green: 4 suites / 234 tests.
- [x] Frontend full suite green: 8 suites / 68 tests, coverage threshold
      passing (no lowering of the floor).
- [x] Frontend lint: 167 warnings, down from 177 recorded — no new
      warnings introduced by this slice.
- [x] Frontend build succeeds.
- [x] Live e2e spec green against the real backend, not mocks — 3/3.
- [x] A previously-unreachable real feature (patient merge) made reachable,
      not left silently gated behind a mock-only condition.
- [x] Committed as its own vertical slice.
