---
id: PLAN167
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ127
related: [TP187, TR187]
---

# PLAN167 — Implementation plan: investigation orders

## Change

**`backend/prisma/schema.prisma`**: `TestResults` gains `encounter_id
String?` + a relation to `Encounters`, and `urgency String @default
("routine")`; `@@index([encounter_id])`. `Encounters` gains the
`investigationOrders TestResults[]` back-relation. New hand-written
migration `20260826184000_investigation_orders/migration.sql` (`ALTER
TABLE`, index, `ON DELETE SET NULL` FK — matching this table's existing
nullable-FK convention, not a hard dependency).

**`backend/src/encounters/entities/encounter.entity.ts`**: new
`InvestigationOrderType` — a lightweight, module-owned flattened type
(`id`, `encounter_id`, `test_name`, `test_type`, `urgency`, `status`,
`date_ordered`), deliberately not importing `TestResultType` across
modules, matching this file's own `TimelineEventType` precedent for
cross-domain data. Added `investigation_orders: InvestigationOrderType[]`
to `EncounterType`.

**`backend/src/encounters/dto/encounter.input.ts`**: new
`OrderInvestigationInput` (`encounter_id`, `test_name`, `test_type`,
optional `urgency` restricted to `routine|urgent|stat`).

**`backend/src/encounters/encounters.service.ts`**: new
`orderInvestigation(input, user)` — loads the encounter via the existing
`loadEncounterForUser` (org/self-scope already enforced there, no new
logic needed), rejects on `encounter.locked` with the same message
`createDiagnosis` uses, then creates a `TestResults` row (`status:
'pending'`, `patient_id`/`patient_name` from the encounter's own
patient, `ordered_by_*` from the calling user). `withRelations()` now
also loads `testResults` for the encounter (`orderBy: {date_ordered:
'asc'}`) alongside notes/addenda/diagnoses/attachments.

**`backend/src/encounters/encounters.resolver.ts`**: new
`orderInvestigation` mutation, `@Auth('clinician')` — same gate as
`createDiagnosis`/`saveEncounterNote`/`signEncounter`.

**`frontend/src/pages/clinician/EncounterWorkspace.jsx`**: `ENCOUNTER_QUERY`
now selects `investigation_orders`; new `ORDER_INVESTIGATION` mutation.
`NotesPane` gains an "Investigations" section directly below Diagnoses,
structurally identical (empty state, list, "Order Investigation" dialog
with test name/type/urgency fields) — new `onAddInvestigation` prop, new
`handleAddInvestigation` callback in the main component wired the same
way as `handleAddDiagnosis`. Used the `'grey.50'` MUI palette token
(not a `#FAFAFA` literal) for the new list item background, to avoid
adding a fresh hex-literal warning to the frontend lint ratchet.

## Testing

`backend/src/encounters/encounters.service.spec.ts`: 4 new cases —
rejects on a locked encounter (asserts `testResults.create` never
called); creates a pending row with default `urgency: 'routine'`
(asserts the exact `data` shape); honours an explicit `urgency: 'stat'`;
confirms a newly-ordered investigation appears in the same encounter's
own `investigation_orders` field on a subsequent `encounter()` fetch.

`frontend/src/pages/clinician/EncounterWorkspace.test.jsx`: 2 new cases
— renders a real ordered investigation (not just the empty state);
orders one via the real `orderInvestigation` mutation, confirms the
dialog submits the typed fields and the list refetches to show it.

Full backend unit suite: 92/92 suites, 1484/1484 tests (4 new).
Integration suite: 4/4 suites, 387/387 unchanged — the new migration
applies cleanly via `test:int`'s own `global-setup.ts`
(`prisma migrate deploy` against `postgres_test`); no new tenancy-matrix
row needed (`encounters` domain already classified). `tsc --noEmit`/
`eslint` clean on backend. Frontend: `EncounterWorkspace.test.jsx` 7/7
(2 new), `eslint` clean on both touched files (no new warnings —
verified the new list item's hex-literal count against the pre-existing
Diagnoses/Addenda pattern before committing).

## Documentation

`REQ127` (this requirement, includes the TestResults-reuse scope
correction), `PLAN167` (this plan), `TP187`/`TR187` (verification), a
context bundle, and index updates across all five doc roots plus the
`clinical-records` feature README.
