---
id: PLAN171
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ131
related: [TP191, TR191]
---

# PLAN171 — Implementation plan: OPD cashless claim submission and tracking

## Change

**`backend/prisma/schema.prisma`**: new `Claims` model (`appointment_id`,
`patient_id` denormalized for query ergonomics, `payer_id`, optional
`policy_id`, `claim_amount`/`approved_amount` paise, `status` default
`'submitted'`, `rejection_reason`, `submitted_by_user_id`,
`submitted_at`/`decided_at`/`settled_at`, `notes`) — no `client_org_id`/
`clinic_id` column, scoped entirely via `appointment.clinic.client_org_id`.
Back-relations added on `Appointments`, `Patients`, `Payers`,
`PatientInsurancePolicies`, `UserProfiles`. New hand-written migration
`20260826220000_claims/migration.sql`.

**`backend/src/insurance/dto/insurance.input.ts`**: `CLAIM_STATUSES`
export, `SubmitClaimInput` (`appointment_id`, `payer_id`, optional
`policy_id`, `claim_amount`, optional `notes`), `UpdateClaimStatusInput`
(`status`, optional `approved_amount`/`rejection_reason`).

**`backend/src/insurance/entities/insurance.entity.ts`**: new `ClaimType`
— `claim_amount`/`approved_amount` cross the resolver boundary as rupees
(`Float`), same paise→rupees convention as `PayerTariffType.tariff_price`.
Also carries `patient_name`/`appointment_date` (flattened join fields —
this page's own list needs a human-readable row without a second query
per claim).

**`backend/src/insurance/insurance.service.ts`**: `CLAIM_TRANSITIONS`
map (`submitted→[under_review]`, `under_review→[approved,rejected]`,
`approved→[settled]`, terminal states map to `[]`). New
`claimsOrgScope(user)` — `{appointment: orgScopeVia(user, 'clinic')}`,
the same 2-level-nesting idiom `pharmacy.service.ts#pendingDispenseItems`
already established. `submitClaim` validates the appointment (org-scoped
via `isSameOrg`), the payer, and — Hard Rule 6 — a supplied policy
belongs to the same patient as the appointment; `patient_id` is derived
from the appointment, never trusted from the input. `claims`/`claim`
read with the same org scope; `updateClaimStatus` enforces
`CLAIM_TRANSITIONS`, requires `approved_amount` to approve and
`rejection_reason` to reject, and stamps `decided_at`/`settled_at`
appropriately.

**`backend/src/insurance/insurance.resolver.ts`**: `submitClaim`/
`claims`/`claim` gated `@Auth('staff', 'manager', 'admin', 'super_admin')`
(matching `payers`/`payerTariffs`/`estimatedPayerCharge`'s own gate);
`updateClaimStatus` gated `@Auth('manager', 'admin', 'super_admin')`
(matching `updatePayerEmpanelmentStatus`'s own asymmetry — deciding an
outcome is a higher-trust action than submitting).

**Real bug caught by the integration suite, not unit tests**: the first
draft of the `claims` query's `status` argument omitted an explicit
`{ type: () => String }` on its `@Args()` decorator, relying on implicit
reflection for a `string | undefined` parameter type — NestJS/GraphQL's
schema-factory reflection cannot infer a type from a union, and crashed
schema generation entirely (`test:int`'s `booking-concurrency`/
`tenancy`/`encounter-lock-trigger` specs all failed at app bootstrap, not
at any assertion). Every other nullable-string `@Args()` in this same
file already specifies its type explicitly (`{ type: () => ID, nullable:
true }`) for exactly this reason — missed on the one plain-`String` case.
Fixed by adding `{ type: () => String, nullable: true }`. **This is
invisible to any mocked-Prisma unit test**, since those never build the
real GraphQL schema — only a real app-bootstrap pass (the integration
suite) catches it, the same class of gap this codebase's own CLAUDE.md
already documents for undecorated DTO fields.

**`frontend/src/pages/manager/claims/index.jsx`** (new): a claims desk —
list (patient, payer, visit date, claim/approved amount, status chip,
next-action button), a "Submit Claim" dialog (patient-name search →
appointment card list → payer Autocomplete → optional policy dropdown →
amount/notes), and an approve/reject decision dialog. Routed at
`/manager/claims` inside `App.jsx`'s existing staff-inclusive
`RoleGuard roles={['admin','super_admin','staff','manager']}` block
(matching `/manager/pharmacy`'s own precedent — the backend `@Auth` gate
includes `staff`), and added to `AppShell.jsx`'s `NAV_CONFIG` as a
top-level "Insurance Claims" entry for the same reason.

## Testing

`backend/src/insurance/insurance.service.spec.ts`: 18 new cases —
`submitClaim` (unknown/cross-org appointment, unknown payer, a policy
belonging to a different patient, patient_id derived from the
appointment not the input, rupee→paise conversion, the flattened
`patient_name`); `claims`/`claim` (2-level org scoping, cross-org
rejection, rupee conversion on read); `updateClaimStatus` (illegal
transition, moving a terminal claim, missing `approved_amount`/
`rejection_reason`, and all three legal transitions with their correct
stamped fields).

`frontend/src/pages/manager/claims/index.test.jsx`: 4 new cases — real
claims render (not fabricated); an honest empty state; a full
submit-claim round trip via the real `submitClaim` mutation; an
under_review → approved transition via the real `updateClaimStatus`
mutation, confirmed by the row's own next-action button advancing to
"Mark Settled".

Full backend unit suite: 92/92 suites, 1521/1521 tests (16 net new).
Integration suite: 4/4 suites, 387/387 unchanged (after the `@Args` type
fix above) — the new migration applies cleanly via `test:int`'s own
`global-setup.ts`; no new tenancy-matrix row needed (`insurance` domain
already classified). `tsc --noEmit`/`eslint` clean on backend. Frontend:
new page's own suite 4/4, `eslint` clean (0 new warnings on the page
itself; the full ratchet run stayed at exactly 1911, the current
ceiling, confirming the 2-line `App.jsx`/`AppShell.jsx` additions added
none either).

## Documentation

`REQ131` (this requirement), `PLAN171` (this plan), `TP191`/`TR191`
(verification), a context bundle, and index updates across all five doc
roots plus the `insurance-claims` feature README.
