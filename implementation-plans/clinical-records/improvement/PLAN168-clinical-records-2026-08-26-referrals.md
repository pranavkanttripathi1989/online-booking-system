---
id: PLAN168
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ128
related: [TP188, TR188]
---

# PLAN168 — Implementation plan: referrals

## Change

**`backend/prisma/schema.prisma`**: new `Referrals` model (`encounter_id`,
`patient_id`, `referred_to_specialty`, nullable `referred_to_clinician_id`,
`reason`, `urgency` default `'routine'`, `status` default `'pending'`) —
no `client_org_id` column, scoped entirely via the parent encounter,
matching `Diagnoses`' own established shape. Back-relations added on
`Encounters` (`referrals`), `Patients` (`referrals`), and `Clinicians`
(`referralsReceived`). New hand-written migration
`20260826190000_referrals/migration.sql` (`CREATE TABLE`, three indexes,
three FKs — `encounter_id` cascades on delete like `Diagnoses`,
`patient_id` restricts, `referred_to_clinician_id` sets null). Did not
add the `reject_write_if_encounter_locked()` DB trigger `Diagnoses`/
`EncounterNotes` carry — this slice has no update/delete mutation yet,
and `REQ127`'s own `TestResults` extension didn't add it either;
matching that more recent precedent rather than the original two P0
tables avoids inventing a new inconsistent hardening rule.

**`backend/src/encounters/entities/encounter.entity.ts`**: new
`ReferralType` (`id`, `encounter_id`, `referred_to_specialty`, optional
`referred_to_clinician_id`, `reason`, `urgency`, `status`,
`created_at`) — its own real dedicated table, unlike `InvestigationOrderType`
which flattens a reused `TestResults` row. Added
`referrals: ReferralType[]` to `EncounterType`.

**`backend/src/encounters/dto/encounter.input.ts`**: new
`CreateReferralInput` (`encounter_id`, `referred_to_specialty`, optional
`referred_to_clinician_id`, `reason`, optional `urgency` restricted to
`routine|urgent`).

**`backend/src/encounters/encounters.service.ts`**: new
`createReferral(input, user)` — loads the encounter via
`loadEncounterForUser` (org/self-scope already enforced), rejects on
`encounter.locked`, and — Hard Rule 6 — when `referred_to_clinician_id`
is supplied, validates that clinician's `clinic.client_org_id` against
the caller via `isSameOrg()` before write (mirroring
`appointments.service.ts#bulkReschedule`'s own established pattern for a
caller-supplied clinician id), throwing `NotFoundException` on a
cross-org or nonexistent id — never confirming a cross-tenant record's
existence, same convention as `assertSameOrg`. `withRelations()` now
also loads `referrals` for the encounter (`orderBy: {created_at: 'asc'}`).

**`backend/src/encounters/encounters.resolver.ts`**: new
`createReferral` mutation, `@Auth('clinician')`.

**`frontend/src/pages/clinician/EncounterWorkspace.jsx`**: `ENCOUNTER_QUERY`
now also selects `referrals`; new `CREATE_REFERRAL` mutation. `NotesPane`
gains a "Referrals" section directly below Investigations, structurally
identical to both (empty state, list, "Refer Patient" dialog with
specialty/reason/urgency fields) — new `onAddReferral` prop, new
`handleAddReferral` callback in the main component wired the same way as
`handleAddDiagnosis`/`handleAddInvestigation`.

## Testing

`backend/src/encounters/encounters.service.spec.ts`: 7 new cases —
rejects on a locked encounter (asserts `referrals.create` never called);
creates a pending referral with no named clinician, defaulting urgency
to `'routine'` (asserts the exact `data` shape, confirms
`clinicians.findUnique` is never called when no clinician is named);
honours an explicit `urgency: 'urgent'`; accepts a named clinician in
the same org; rejects a named clinician from a different org (Hard
Rule 6); rejects a named clinician that does not exist; confirms a
newly-created referral appears in the same encounter's own `referrals`
field on a subsequent `encounter()` fetch.

`frontend/src/pages/clinician/EncounterWorkspace.test.jsx`: 2 new cases
— renders a real referral (not just the empty state); refers a patient
via the real `createReferral` mutation, confirms the dialog submits the
typed fields and the list refetches to show it.

Full backend unit suite: 92/92 suites, 1491/1491 tests (7 new).
Integration suite: 4/4 suites, 387/387 unchanged — the new migration
applies cleanly via `test:int`'s own `global-setup.ts`; no new
tenancy-matrix row needed (`encounters` domain already classified).
`tsc --noEmit`/`eslint` clean on backend. Frontend:
`EncounterWorkspace.test.jsx` 9/9 (2 new), `eslint` clean on both
touched files (3 warnings, unchanged from `REQ127`'s own baseline — the
new list item reused the `'grey.50'` token, not a fresh hex literal).

## Documentation

`REQ128` (this requirement), `PLAN168` (this plan), `TP188`/`TR188`
(verification), a context bundle, and index updates across all five doc
roots plus the `clinical-records` feature README.
