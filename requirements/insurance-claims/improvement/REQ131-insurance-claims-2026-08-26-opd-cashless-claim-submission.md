---
id: REQ131
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ031
related: [PLAN171, TP191, TR191]
---

# REQ131 — OPD cashless claim submission and tracking (basic state machine)

## Why this slice

`REQ031`'s own doc explicitly reserves a "claim state machine" as its own
P2 follow-on requirement, not this codebase's P1 scope: *"the P2 scope
(IPD pre-authorisation, hospital claim submission/tracking/settlement,
NHCX integration, insurance desk cockpit/analytics) ... should be written
as separate follow-on requirement documents (`REQ0XX`, to be numbered
when planning begins for them) once P1 has shipped."* Confirmed still
open before starting: `insurance.service.ts`'s own header comment already
says "No claim/pre-auth state machine (that's the requirement doc's own
explicit P2 follow-on...)", and `REQ100`'s `estimatedPayerCharge` method
has an inline comment naming the exact same gap. `grep Claim
schema.prisma` had no hits beyond unrelated names (`ClientOrganizations`,
`clientOrganization`).

## Scope, per the PRD's own R11 risk mitigation

The PRD's own risk register (§17, restated in `REQ031`'s doc) names R11:
*"most insurers and TPAs still work through bespoke portals and email, so
'integration' degrades to manual submission... Design the workflow to be
valuable without APIs."* This slice is deliberately manual/portal-assist
throughout — a human submits a claim and a human (insurance desk/manager)
decides its outcome — not a degraded fallback but the intended day-one
design.

## User story

As front-desk/insurance-desk staff, I can submit an OPD cashless claim for
a patient's visit against a payer, track it through a defined state
machine (submitted → under review → approved/rejected → settled), and see
every claim's current status at a glance.

## Acceptance criteria

- **Given** a completed appointment, **when** staff submit a claim against
  a payer (and optionally a specific patient policy), **then** a `Claims`
  row is created with `status: 'submitted'`.
- **Given** a caller-supplied policy, **when** it belongs to a different
  patient than the appointment, **then** submission is rejected (Hard
  Rule 6).
- **Given** a claim's current status, **when** a status update is
  attempted, **then** only the legal next state(s) are accepted:
  `submitted → under_review`, `under_review → approved|rejected`,
  `approved → settled`; `rejected`/`settled` are terminal.
- **Given** a transition to `approved`, **then** an `approved_amount` is
  required. **Given** a transition to `rejected`, **then** a
  `rejection_reason` is required.
- **Given** the caller's own org, **then** every claim read/write is
  scoped to it via the claim's own appointment → clinic → org chain — no
  cross-tenant visibility.

## In scope

- `Claims` table + `submitClaim`/`claims`/`claim`/`updateClaimStatus`
  on the existing `insurance` domain.
- A new "Insurance Claims" desk page (`manager/claims/index.jsx`):
  submit (patient search → appointment → payer/policy/amount) and
  advance a claim through its status.

## Deliberately out of scope

- Real payer API integration — per R11, submission/decisions are always
  human-driven this slice.
- Benefit-wallet/co-pay auto-adjudication (`US-INS-05`) — needs
  `REQ023`'s bill-split mechanism as its own foundation first, per
  `REQ031`'s own stated dependency; not attempted here.
- Reimbursement-pack PDF generation — a natural follow-on once claims
  exist to generate a pack *for*, not bundled into this slice.
- Auto-attaching a signed prescription/diagnostics as claim evidence
  (`US-INS-06`) — a real follow-on, not built this slice.
- IPD pre-authorisation, NHCX, government schemes — all explicitly P2/P3
  in the PRD, untouched.
