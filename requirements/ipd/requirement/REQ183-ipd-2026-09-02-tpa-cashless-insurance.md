---
id: REQ183
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ179
related: [REQ180, REQ181, REQ182]
---

# In-patient department (IPD) slice 5: TPA cashless insurance

## Source

Continuation of the approved, `ExitPlanMode`-confirmed 5-slice IPD plan
(`REQ179`'s own source note) — slice 5 of 5, the **final slice**. Driven
by a bare `continue` after slice 4 (`REQ182`) shipped, tested,
documented, and was pushed, per the working loop's own resumption
protocol.

## What this ships

- **`PreAuthorizations`** — `admission_id` nullable and `@unique`:
  nullable because a real pre-auth is requested days before the
  admission it will eventually cover even exists; unique because once
  bound, an admission has exactly one live pre-auth. Status:
  `requested|approved|rejected|expired|cancelled`, every forward
  transition a real human decision (no automated payer submission
  exists anywhere in this codebase, matching the pre-existing OPD
  `Claims` domain's own stance verbatim).
- **`PreAuthEnhancements`** — a mid-stay top-up request when the running
  bill exceeds the currently authorized total.
  `bill_amount_at_request_paise` is snapshotted **server-side** from the
  real `IpdBills.gross_paise` at request time, never a caller-supplied
  figure. `@@unique([preauth_id, sequence_no])` gives each request a
  stable, gapless-within-preauth identity.
- **`IpdClaims`** — one per admission (`admission_id @unique`), the real
  claim filed against the finalized (or finalizing) stay.
  `preauth_id` links back when one exists (nullable+`@unique` — most
  cashless claims trace to a real pre-auth, but the shape stays
  representable without one).
- **`IpdClaimDeductions`** — **line-level disallowance**, the one thing
  the pre-existing OPD `Claims` model structurally cannot express (a
  single scalar `claim_amount`, no line items at all).
- **`IpdInsuranceDocuments`** — pre-auth forms, discharge summaries,
  payer correspondence, id proof, policy copies. REST upload (magic-byte
  signature check, matching `encounters/attachments.controller.ts`'s own
  pattern) + a GraphQL mutation persisting the metadata row — the
  same two-step split every prior attachment domain in this codebase
  uses. A CHECK constraint enforces exactly one of `preauth_id`/
  `claim_id` set.
- **`bindPreAuthorizationToAdmission`** — a dedicated mutation, not
  folded into `admissions.service.ts`'s own `createAdmission`, so this
  slice stays fully additive with zero change to that already-shipped
  module. The bind itself is a single atomic
  `UPDATE ... WHERE admission_id IS NULL`, not a read-then-write — see
  the real race-condition bug found and fixed in `PLAN252`.
- **`settleIpdClaim`** — reuses `IpdBillingService#recordPayment()`
  verbatim (`payment_type: 'payer_settlement'`, already a live tender
  type from slice 4). The real payer payout posts as a genuine
  `IpdPayments` row against the actual bill, never a bare status flip
  on the claim.
- **`PreAuthUtilizationSweepService`** — a 4-hourly sweep notifying the
  insurance desk once a running bill crosses 80% of its currently
  authorized total (`approved_amount_paise` + every `approved`
  enhancement's own amount), the plan's own confirmed threshold. Same
  per-row try/catch, same-day dedup shape as `mlc-police-intimation
  -sweep.service.ts`.
- **Frontend** — `pages/ipd/IpdInsurance.jsx`, desktop-dense tier: two
  tabs (Pre-Authorizations, Claims), full lifecycle UI for both,
  document upload, reachable via a top-level nav entry and a deep-link
  from the admissions detail dialog.

## Reuse decisions (do not rebuild)

- `Payers`/`PayerTariffs`/`PayerEmpanelments`/`PatientInsurancePolicies`
  (`REQ031`) — reused **completely unchanged**. Zero schema change to
  any of the four, asserted directly by a live integration test reading
  pre-existing fixture rows created for `REQ031` long before this slice
  existed.
- `nextDocumentNumber()`/`DOCUMENT_SERIES.IPD_CLAIM` (`'IPC'`) —
  pre-reserved in slice 1, used here for the first time for gapless
  `claim_number` allocation.
- `IpdBillingService#recordPayment()` — the settlement funnel, not
  reimplemented.
- The REST-upload-then-GraphQL-persist two-step split
  (`encounters/attachments.controller.ts`, `messages/message-attachments
  .controller.ts`).
- Tenant scoping via `assertSameOrg`/`isSameOrg`/`orgScope` throughout;
  small per-service scope guards, the `REQ181` convention.

## Deliberately NOT built in this slice (recorded, not silently dropped)

- Any real payer/NHCX API integration or auto-submission — every
  transition is a human decision, per the plan's own confirmed design
  and `Claims`' own pre-existing stance.
- Government-scheme claim workflows (PMJAY/CGHS) — the plan's own
  confirmed scope throughout all 5 slices is hospital-defined billing,
  not government schemes.
- `IpdClaimAppeals` — explicitly cut in the original plan.

## Acceptance criteria

**US-IPD-18**: As an insurance desk executive, I can request a
pre-authorization before a patient is even admitted, and bind it once
the real admission exists.
- Given a pre-authorization approved with no admission set, when a real
  admission for the same patient is created separately and then bound
  to it, then the pre-authorization's `admission_id` reflects the real
  admission.
- Given that pre-authorization is already bound, when a second, different
  admission attempts to bind to it, then it is rejected — even under
  real concurrency, exactly one of two racing bind attempts succeeds.

**US-IPD-19**: As an insurance desk executive, requesting a mid-stay
enhancement snapshots the real running bill, not a number I could
fabricate.
- Given a real, non-zero `IpdBills.gross_paise` for the bound admission,
  when an enhancement is requested, then its own
  `bill_amount_at_request` exactly matches the real bill total at that
  moment.

**US-IPD-20**: As an insurance desk executive, I am notified before a
pre-authorization's headroom runs out.
- Given a pre-authorization's running bill reaches or exceeds 80% of its
  currently authorized total (base approval plus every approved
  enhancement), when the sweep runs, then every manager/admin at the
  clinic is notified once per day while it remains at or above that
  threshold.

**US-IPD-21**: As a billing clerk, settling an approved claim posts a
real payment against the actual bill.
- Given an approved claim, when settled with a tender split, then a
  real `payer_settlement` `IpdPayments` row exists and the bill's own
  `paid_paise` increments by exactly the settled amount.

**US-IPD-22**: As an insurance desk executive, I can record why a payer
disallowed part of a claim, at the line level.
- Given a claim under review, when a deduction is added against a
  specific charge, then it is recorded with its own description and
  amount, distinct from every other charge on the claim.

## Data model impact

New: `PreAuthorizations`, `PreAuthEnhancements` (+
`@@unique([preauth_id, sequence_no])`), `IpdClaims`, `IpdClaimDeductions`,
`IpdInsuranceDocuments` (+ 1 CHECK constraint). One new
`NotificationEventType` value (`preauth_enhancement_needed`, its own
migration, applied before any code referenced it — the
`break_glass_requested`/`mlc_police_intimation_due` precedent). Zero
changes to `Payers`/`PayerTariffs`/`PayerEmpanelments`/
`PatientInsurancePolicies`. See `PLAN252` for full field lists, the
migration SQL, and the real race-condition bug found and fixed.

## Verification

Backend: 53 new unit tests (`ipd-insurance.service.spec.ts` 45,
`preauth-utilization-sweep.service.spec.ts` 8). Full suite: 166
suites/2637 tests (up from 164/2584). New `ipd-insurance.int-spec.ts`,
5/5 gates against real Postgres. Full integration suite: 13
suites/516 tests (up from 502). `tsc`/`eslint` clean throughout. Live
schema introspection confirmed every new query/mutation genuinely
served. Frontend: build/lint/size-limit green, 2 new tests. This closes
the 5-slice IPD plan in full — see `TR272` for complete detail.
