---
id: TP272
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: approved
parent: PLAN252
related: [REQ183]
---

# TP272 — Test plan: IPD slice 5 (TPA cashless insurance)

Suggestion stage skipped, same grounds as `TP268`–`TP271`: this slice's
own full technical design (schema, the bind-race fix, the settlement
funnel reuse) was reviewed and approved via `ExitPlanMode` before any
code was written.

## `IpdInsuranceService` — pre-authorizations

| # | Case | Expected |
|---|---|---|
| 1 | `createPreAuthorization` against a cross-org clinic | Rejected |
| 2 | `createPreAuthorization` against a cross-org patient | Rejected |
| 3 | `createPreAuthorization` with a policy not belonging to the patient | Rejected |
| 4 | `createPreAuthorization` with an `admission_id` for a different patient | Rejected |
| 5 | `createPreAuthorization` with an `admission_id` that already has a pre-auth | Rejected |
| 6 | `createPreAuthorization` with no admission | Created, `admission_id` null |
| 7 | `updatePreAuthorizationStatus` on an illegal transition | Rejected |
| 8 | `updatePreAuthorizationStatus` approve with no amount | Rejected |
| 9 | `updatePreAuthorizationStatus` reject with no reason | Rejected |
| 10 | `updatePreAuthorizationStatus` on a cross-org pre-auth | Rejected |
| 11 | `updatePreAuthorizationStatus` approve | Status/approved_amount updated |
| 12 | `bindPreAuthorizationToAdmission` on a not-yet-approved pre-auth | Rejected |
| 13 | `bindPreAuthorizationToAdmission` on an already-bound pre-auth | Rejected |
| 14 | `bindPreAuthorizationToAdmission` to an admission for a different patient | Rejected |
| 15 | `bindPreAuthorizationToAdmission` success | `admission_id` set via an atomic `updateMany` |
| 16 | `bindPreAuthorizationToAdmission` when `updateMany` matches 0 rows (lost the race) | Rejected |
| 17 | `bindPreAuthorizationToAdmission` on a real unique-constraint collision (`P2002`) | Rejected, clean message |

## `IpdInsuranceService` — enhancements

| # | Case | Expected |
|---|---|---|
| 18 | `requestPreAuthEnhancement` on a not-approved/not-bound pre-auth | Rejected |
| 19 | `requestPreAuthEnhancement` snapshots the real `IpdBills.gross_paise` | `bill_amount_at_request_paise` matches, never caller-supplied |
| 20 | `requestPreAuthEnhancement` with no bill yet | Snapshots 0 |
| 21 | `requestPreAuthEnhancement` sequence numbering | Increments from the last existing enhancement |
| 22 | `decidePreAuthEnhancement` on an illegal transition | Rejected |
| 23 | `decidePreAuthEnhancement` approve with no amount | Rejected |
| 24 | `decidePreAuthEnhancement` approve | Status/approved_amount updated |

## `IpdInsuranceService` — claims

| # | Case | Expected |
|---|---|---|
| 25 | `createIpdClaim` on an admission that already has a claim | Rejected |
| 26 | `createIpdClaim` with no payer given and none on the admission | Rejected |
| 27 | `createIpdClaim` defaults payer/policy from the admission, links an existing pre-auth | Data reflects the defaults |
| 28 | `submitIpdClaim` from a non-draft status | Rejected |
| 29 | `submitIpdClaim` | `claim_number` assigned via `nextDocumentNumber`, status `submitted` |
| 30 | `updateIpdClaimStatus` approve with no amount | Rejected |
| 31 | `updateIpdClaimStatus` reject with no reason | Rejected |
| 32 | `updateIpdClaimStatus` approve | `approved_amount_paise` stored correctly |
| 33 | `settleIpdClaim` on a not-yet-approved claim | Rejected |
| 34 | `settleIpdClaim` | Calls `IpdBillingService#recordPayment` with `payment_type: 'payer_settlement'`, status becomes `settled` |
| 35 | `addIpdClaimDeduction` on a settled claim | Rejected |
| 36 | `addIpdClaimDeduction` with a charge from a different admission | Rejected |
| 37 | `addIpdClaimDeduction` success | Row created |
| 38 | `removeIpdClaimDeduction` on a settled claim | Rejected |
| 39 | `removeIpdClaimDeduction` success | Row deleted |

## `IpdInsuranceService` — documents and reads

| # | Case | Expected |
|---|---|---|
| 40 | `createIpdInsuranceDocument` with neither `preauth_id` nor `claim_id` | Rejected |
| 41 | `createIpdInsuranceDocument` with both | Rejected |
| 42 | `createIpdInsuranceDocument` against a pre-authorization | Created |
| 43 | `findPreAuthorization` on a cross-org pre-auth | Rejected |
| 44 | `findIpdClaim` on a cross-org claim | Rejected |
| 45 | `authorized_total` derivation | Sums the pre-auth's own approved amount with only `approved`-status enhancements, never `requested`/`rejected` ones |

## `PreAuthUtilizationSweepService`

| # | Case | Expected |
|---|---|---|
| 46 | `sweep()` with no approved, admission-bound pre-auth | No-op |
| 47 | Query shape | Filters `status: 'approved'`, `admission_id: { not: null }` |
| 48 | Utilization below 80% | No notification |
| 49 | Utilization at/above 80% | Every manager/admin at the clinic notified |
| 50 | Authorized total includes only `approved` enhancements | `requested`/`rejected` ones excluded from the denominator |
| 51 | No bill exists yet | Skipped (zero billed amount) |
| 52 | Same-day dedup | No re-notification the same day |
| 53 | One bad row does not abort the sweep | Remaining rows still processed |

## Live-only checks (not unit-testable against a mocked Prisma client)

- A pre-authorization approved with no admission, later bound to a real
  admission created separately through the real `createAdmission`
  mutation.
- Two admissions racing (`Promise.all`) to bind the SAME approved
  pre-auth — exactly one succeeds, the other's error matches
  `/already bound/i` — the real atomic `UPDATE ... WHERE admission_id
  IS NULL`, not a mocked check-then-write.
- `requestPreAuthEnhancement`'s `bill_amount_at_request` matching a REAL
  `admissionIpdBill`-computed gross total, not a value fabricated in the
  test.
- `settleIpdClaim` posting a REAL `IpdPayments` row and incrementing the
  REAL `IpdBills.paid_paise` — proving the slice-4 funnel is genuinely
  reused end-to-end, not merely called with plausible-looking arguments.
- `Payers`/`PayerTariffs`/`PayerEmpanelments`/`PatientInsurancePolicies`
  rows created for `REQ031`, long before this slice existed, still
  queryable with their exact original shape — zero schema drift.
- Container boot after schema generation — confirms no `@Args`
  reflection failure and no missing-provider crash (the real
  `AuthModule` bug found this slice).
- Live introspection of `Query`/`Mutation` confirming every new
  operation is genuinely served.
- `matrix-coverage.int-spec.ts` — confirms `ipd-insurance` is classified.
