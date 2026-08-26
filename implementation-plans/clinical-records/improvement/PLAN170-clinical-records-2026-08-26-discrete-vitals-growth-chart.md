---
id: PLAN170
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ130
related: [TP190, TR190]
---

# PLAN170 — Implementation plan: discrete vitals and growth chart

## Change

**`backend/prisma/schema.prisma`**: new `Vitals` model (`encounter_id`,
`code`, `value` `Float`, `unit`, `recorded_by_user_id`, `recorded_at`) —
no `client_org_id`/`patient_id` column, scoped entirely via the parent
encounter, matching `Diagnoses`/`Referrals`' own shape. Back-relations
added on `Encounters` (`vitals`) and `UserProfiles` (`recordedVitals`).
New hand-written migration `20260826210000_vitals/migration.sql`
(`CREATE TABLE`, two indexes, two FKs — `encounter_id` cascades on
delete, `recorded_by_user_id` restricts).

**`backend/src/encounters/dto/encounter.input.ts`**: `VITAL_CODES`
(`height_cm|weight_kg|temperature_c|pulse_bpm|bp_systolic|bp_diastolic|
spo2_percent`) and `VITAL_UNITS` (a fixed code→unit map) exported for
reuse by the service. `VitalReadingInput` (`code`, `value`) deliberately
has no `unit` field — the service derives it, so a client can never
write an inconsistent unit for a given code (which would corrupt any
chart/threshold logic downstream). `RecordVitalsInput` (`encounter_id`,
`readings: [VitalReadingInput!]`) — a batch, matching
`CreatePrescriptionInput.items`'s own array-of-readings shape for "one
recording moment, several values."

**`backend/src/encounters/entities/encounter.entity.ts`**: new
`VitalType` (`id`, `encounter_id`, `code`, `value: Float`, `unit`,
`recorded_at`). Added `vitals: VitalType[]` to `EncounterType`.

**`backend/src/encounters/encounters.service.ts`**: new
`recordVitals(input, user)` — loads the encounter via
`loadEncounterForUser`, rejects on `encounter.locked` (same guard as
`createDiagnosis`/`orderInvestigation`/`createReferral`), then
`vitals.createMany()` with `unit` looked up from `VITAL_UNITS[code]`,
returning every reading for the encounter via a follow-up `findMany`
(Postgres `createMany` doesn't return created rows). New
`patientVitals(patientId, code, user)` — reuses `assertPatientAccess`
(same access control as `patientAllergyBanner`/`patientTimeline`),
queries `vitals.findMany({where: {code, encounter: {patient_id}}})`
chronologically — the actual growth-chart query, one code across every
encounter for the patient. `withRelations()` now also loads `vitals`
for the encounter.

**`backend/src/encounters/encounters.resolver.ts`**: new `recordVitals`
mutation (`@Auth('clinician')`) and `patientVitals` query (same
`@Auth(...)` gate as `patientAllergyBanner`/`patientTimeline` — a
patient may read their own trend).

**`frontend/src/pages/clinician/EncounterWorkspace.jsx`**: `ENCOUNTER_QUERY`
now also selects `vitals`; new `RECORD_VITALS` mutation and
`PATIENT_VITALS` query. `VITAL_FIELDS` mirrors `VITAL_CODES`/`VITAL_UNITS`
for display labels (unit is display-only here — never sent to the
server). `NotesPane` gains a "Vitals" section (chip list of this
encounter's own readings, a "Record Vitals" dialog with one optional
numeric field per code, submitting only the non-empty ones as a batch)
and a "Growth Chart" button opening a new `GrowthChartDialog` component
— two `recharts` `LineChart`s (weight, height), each with its own
`useQuery(PATIENT_VITALS, {skip: !open})` so neither fires until the
dialog is actually opened. Line colors use `theme.palette.primary.main`/
`theme.palette.success.main` (via `useTheme()`) rather than hex
literals — every other page using `recharts` in this codebase (`analytics/
index.jsx`, `finances/index.jsx`) uses literal hex chart colors as
pre-existing debt, but since this is new code, resolving real theme
colors avoids adding to the frontend lint-warning ratchet rather than
repeating that inherited pattern.

## Testing

`backend/src/encounters/encounters.service.spec.ts`: 6 new cases —
`recordVitals` rejects on a locked encounter, creates a batch in one
`createMany` call deriving `unit` from `code` (asserts the exact `data`
array, confirming no client-supplied unit is ever passed through), and
returns every reading for the encounter afterward; `patientVitals`
rejects a different patient, rejects a clinician who never treated the
patient, and returns one code's readings chronologically across
encounters.

`frontend/src/pages/clinician/EncounterWorkspace.test.jsx`: 3 new cases
— renders real recorded vitals as chips; records a batch via the real
`recordVitals` mutation and confirms the list refetches to show it;
opens the growth chart and confirms real (mocked-`PATIENT_VITALS`) trend
data renders, including an honest per-series empty state. Needed a local
`ResizeObserver` stub in the test file — jsdom has none, and `recharts`'
`ResponsiveContainer` requires it to measure before rendering a chart at
all; without the stub, the chart section throws inside its
`ErrorBoundary` instead of rendering.

Full backend unit suite: 92/92 suites, 1505/1505 tests (6 new).
Integration suite: 4/4 suites, 387/387 unchanged — the new migration
applies cleanly via `test:int`'s own `global-setup.ts`; no new
tenancy-matrix row needed (`encounters` domain already classified).
`tsc --noEmit`/`eslint` clean on backend. Frontend:
`EncounterWorkspace.test.jsx` 12/12 (3 new), `eslint` clean on both
touched files (3 warnings, unchanged from `REQ128`'s own baseline — the
new chart lines used real theme colors, not new hex literals).

## Documentation

`REQ130` (this requirement), `PLAN170` (this plan), `TP190`/`TR190`
(verification), a context bundle, and index updates across all five doc
roots plus the `clinical-records` feature README.
