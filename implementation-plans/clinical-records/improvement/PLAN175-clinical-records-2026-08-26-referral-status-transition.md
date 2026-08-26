---
id: PLAN175
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ135
related: [TP195, TR195]
---

# PLAN175 — Implementation plan: referral status-transition mutation

## Change

**`backend/src/encounters/dto/encounter.input.ts`**: `REFERRAL_STATUSES`
export (`pending|scheduled|completed|declined`, matching `Referrals.status`'s
existing values verbatim) and `UpdateReferralStatusInput` (`status` only
— no schema addition needed).

**`backend/src/encounters/encounters.service.ts`**: module-level
`REFERRAL_TRANSITIONS` map — deliberately more permissive than
`insurance.service.ts`'s own `CLAIM_TRANSITIONS` (`REQ131`): a referral
is tracking metadata, not a financial workflow, so `pending` may go
straight to `completed`/`declined` without a forced `scheduled` stop.
New `updateReferralStatus(id, input, user)` — loads the referral with
its parent `encounter` included, asserts org access via
`referral.encounter.client_org_id` (`assertSameOrg`, one join deep,
same reasoning `Diagnoses`/other encounter-children already use),
validates the transition against the map, and updates.

**`backend/src/encounters/encounters.resolver.ts`**: new
`updateReferralStatus` mutation, `@Auth('clinician', 'manager', 'admin',
'super_admin', 'staff')` — deliberately broader than `createReferral`'s
own clinician-only gate, since recording a referral's real-world
outcome is administrative follow-up, not new clinical content.

**`frontend/src/pages/clinician/EncounterWorkspace.jsx`**: new
`REFERRAL_TRANSITIONS` client-side mirror (display-only — the backend
remains the real enforcement) drives which "Mark {status}" buttons
render per referral in the existing Referrals list. New
`UPDATE_REFERRAL_STATUS` mutation, `handleUpdateReferralStatus`
callback wired the same way as every other mutation handler in this
file, threaded through `NotesPane`'s new `onUpdateReferralStatus` prop.

## Testing

`backend/src/encounters/encounters.service.spec.ts`: 9 new cases —
unknown/cross-org referral rejected; all three legal `pending` exits;
`scheduled → completed`; an illegal backward transition (`scheduled →
pending`) rejected; both terminal states (`completed`, `declined`)
reject any further transition.

`frontend/src/pages/clinician/EncounterWorkspace.test.jsx`: 3 new cases
— a `pending` referral shows all three legal next-status buttons; a
`completed` referral shows none; clicking "Mark scheduled" calls the
real `updateReferralStatus` mutation and the list refetches to show the
new legal buttons for the `scheduled` state.

Full backend unit suite: 92/92 suites, 1539/1539 tests (9 new).
Integration suite: 4/4 suites, 387/387 unchanged (no schema change, no
tenancy-matrix fixture touch needed). `tsc --noEmit`/`eslint` clean on
backend. Frontend: `EncounterWorkspace.test.jsx` 15/15 (3 new), `eslint`
clean (3 warnings, unchanged from baseline); full `npm run lint`
unchanged at 1909.

## Documentation

`REQ135` (this requirement, includes the two real deliberate-scope-cut
notes), `PLAN175` (this plan), `TP195`/`TR195` (verification), a
context bundle, and index updates across all five doc roots plus the
`clinical-records` feature README.
