---
id: PLAN230
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ167
related: [TP250, TR250]
---

# PLAN230 — Immunisation schedule tracker (P2-11)

`P2-11` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`, picked
up via the bare-`continue` resumption protocol. No dependency; confirmed
still real via a full-repo grep for `immuniz`/`vaccin` before scoping
(nothing existed).

## Scope

**Built:** `ImmunizationScheduleItems` (platform-global reference data,
India's National Immunization Schedule, 25 items seeded) and
`ImmunizationRecords` (patient-direct clinical fact, `encounter_id`
optional, no direct `client_org_id`/`clinic_id` — mirrors `TestResults`
exactly, scoped transitively via `patient_id -> Patients.client_org_id`).
New module `backend/src/immunizations/`: `immunizationSchedule`,
`patientImmunizations`, `patientImmunizationStatus` queries and a
`recordImmunization` mutation, access-gated by a private
`assertPatientAccess()` mirroring `encounters.service.ts`'s own method
(patient self+dependant via `PatientsService.ownAndDependantPatientIds()`,
clinician via "has treated this patient", staff/manager/admin via
org-scoped appointment existence). A daily
`ImmunizationReminderSweepService` (`@Cron('0 9 * * *')`, mirrors
`low-stock-sweep.service.ts`'s exact shape) dispatches an `immunization_due`
notification, deduped via a 7-day check against the `Notifications` table
(the same mechanism `low-stock-sweep.service.ts` already uses — no new
schema field). One additive branch on
`encounters.service.ts#patientTimeline()` surfaces administered doses
alongside encounters/diagnoses/test-results/messages. Frontend: a new
"Immunizations" tab (index 10, after Packages) on `patients/detail.jsx`
showing a due/overdue/administered status list with soft alpha-tinted
status chips (new `immunizationStatusChipSx` helper, a different
vocabulary from `theme.palette.appointmentStatus`) and a Record-dose
dialog.

**Explicitly deferred:** no admin/manager CRUD UI for the schedule itself
— it is curated public-health reference data, seeded like Drugs/ICD-10,
not an org-editable catalog. Chronic-disease registry/recall is `P2-12`,
which explicitly depends on this slice. No billing/pricing integration.

## The one design correction found during research, not assumed

A plain copy of `appointment-reminder-sweep.service.ts`'s own
`resolvePatientUserId()` (find a `UserProfiles` row linked to the target
patient) returns `null` for almost every child patient — this codebase's
own documented design is that a dependant has no login account of its own;
the parent/guardian's account holds the login. Since children are the
primary population this feature exists for, the sweep uses
`resolveNotifiableUserId()`: try the direct link first (covers the
10y/16y Td boosters, where the patient may have their own login by then),
then fall back through `PatientRelations` to the owning guardian's own
linked account. Verified with a dedicated unit test
(`immunization-reminder-sweep.service.spec.ts`), since it's the correction
that makes the feature actually reach its target population rather than
silently notifying nobody.

## Two real bugs found and fixed during test-writing (not live)

1. `patientTimeline()`'s new `Promise.all` branch broke every pre-existing
   `encounters.service.spec.ts` test whose mocked `prisma` object had no
   `immunizationRecords` key — caught immediately by the full unit suite,
   fixed by adding the missing mock.
2. `patients/detail.jsx`'s first draft of `submitRecordDose()` always sent
   `batch_no`/`site`/`notes` as explicit keys with value `undefined` when
   empty — this hung the record-dose frontend test indefinitely (Apollo's
   `MockedProvider` treats an explicit `undefined`-valued key differently
   from an absent one for request matching). Fixed to conditionally spread
   the optional fields in, omitting the key entirely when empty — also the
   technically correct GraphQL-input shape for a genuinely optional field.

## Also fixed this session, live-reported by the user (not part of P2-11's own scope)

Two real, pre-existing UI-13 violations found and fixed while live-verifying
this slice, both flagged directly by the user via screenshot against
`appointments/edit.jsx` and the sidebar:
- `layouts/AppShell.jsx`'s sidebar brand-header logo/icon swatch had an
  oversized `borderRadius: 1.5` (15px on a 36px square) — reduced, then set
  to `0` per explicit instruction.
- **The real bug**, found only after a live DOM inspection (not visible from
  reading the JSX): the sidebar's own `MuiDrawer-paper` silently inherited
  the theme's global `MuiPaper` default (`borderRadius: 12`), rounding the
  entire fixed, full-height sidebar panel's outer corners — a Drawer should
  never round like a card. Fixed with an explicit `borderRadius: 0` in the
  theme's own `MuiDrawer.styleOverrides.paper`, a single fix that corrects
  every sidebar view app-wide, not just the one page it was first seen on.
- `appointments/edit.jsx`'s "Notes" field `borderRadius` was changed
  `2 (20px) → 0 → 1.5 (15px)` per iterative direct user feedback, landing
  on `1.5` as the final value.

## Verification

Backend: 132 suites / 2101 tests (26 new: 20 in
`immunizations.service.spec.ts`, 6 in
`immunization-reminder-sweep.service.spec.ts`), integration 9/9 suites /
432 tests (new `immunizations` `EXEMPT` entry in
`matrix-coverage.int-spec.ts`, mirroring `ai-clinical`/`telemedicine`'s own
precedent — no list query exists on this resolver to build a cross-org
matrix case from), `tsc --noEmit` + `eslint` clean. Frontend: 21/21 in
`patients/detail.test.jsx` (3 new Immunizations-tab tests), full suite
running, `eslint` clean (0 errors), production build clean. Live-verified
against the real dev stack: seeded schedule confirmed via GraphQL
introspection and `prisma db seed` output; `docker restart` + fresh
`Nest application successfully started` + `GraphQL endpoint ready`
confirmed before any test was trusted.
