---
id: TP249
type: improvement
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN229
related: [TR249]
---

# TP249 — Patient Membership Plans verification

Test-suggestion stage skipped per Hard Rule 4 — a well-precedented
feature mirroring an already-proven, already-tested existing module
(`Packages`/REQ054) rather than an exploratory or ambiguous one.

## Backend unit tests (`memberships.service.spec.ts`)

1. `listPlans` — org-scoped with and without `clinic_id`; `[]` for a
   cross-org clinic; converts paise to rupees.
2. `createPlan`/`updatePlan`/`removePlan` — rejects a cross-org clinic/
   plan; rejects a clinic with no organization to anchor to; converts
   rupees to paise on create; soft-deletes on remove.
3. `patientMembership` — fails closed for an org-less caller (never a
   bare `{}`); a platform operator is unfiltered; returns `null` when no
   active membership exists; converts paise to rupees on a real row.
4. `enroll` — rejects a cross-org plan, an inactive plan, a cross-org
   patient; cancels any existing active membership before creating the
   new one; denormalizes price at enroll time.
5. `cancel` — a real error when no active membership exists; rejects a
   cross-org active membership; cancels a real one.

## Backend integration

New `memberships` tenancy-matrix row (`domain-cases.ts`) — cross-org
rejection and role-gating verified against the real `AppModule`/real
Postgres/real JWTs, same as every other domain.

## Frontend unit tests

`patients/detail.jsx`: shows "No membership" with no real active
membership; shows the real active plan+price; enrolls via the real
`enrollPatientMembership` mutation and refetches; cancels via the real
`cancelPatientMembership` mutation and refetches.

`manager/memberships/index.jsx`: empty state; lists a real plan with its
monthly price; opens the create-plan form.

## Live verification (manual + Chrome DevTools MCP, real dev stack)

As `manager@medibook.dev`, create a real membership plan on
`/manager/memberships`. As a clinician/manager viewing a real patient
detail page, enroll them via the dialog; confirm the header chip updates
and **survives a page reload**. Cancel via the dialog; confirm it
reverts to "No membership" and **also survives a reload**.
