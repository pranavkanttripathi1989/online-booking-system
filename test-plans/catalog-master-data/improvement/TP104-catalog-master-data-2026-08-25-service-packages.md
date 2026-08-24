---
id: TP104
type: improvement
feature: catalog-master-data
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN077
related: [REQ054]
---

# TP104 — Test plan: multi-sitting service packages

Skipping the test-suggestion stage per CLAUDE.md's conditional rule —
routine config-table CRUD matching `checklist`/`intake-fields`'s already-
proven pattern, plus a redemption flow matching `DrugBatches`' already-
proven decrement-on-use shape. Going straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `packages()` — clinic in caller's org | Returns that clinic's packages |
| 2 | `packages()` — cross-org clinic | `[]`, no throw |
| 3 | `packages()` — no `clinic_id`, org A vs org B | Each scoped to their own org only |
| 4 | `createPackage` — clinic in scope | Succeeds, `Packages` + `PackageItems` in one transaction |
| 5 | `createPackage` — cross-org clinic | Rejected |
| 6 | `createPackage` — clinic with no organization | Rejected (nothing to anchor to) |
| 7 | `createPackage` — a product from a different clinic | Rejected |
| 8 | `createPackage` — a nonexistent product id | Rejected |
| 9 | `updatePackage`/`deletePackage` — cross-org | Rejected |
| 10 | `purchasePackage` — cross-org package | Rejected |
| 11 | `purchasePackage` — inactive package | Rejected |
| 12 | `purchasePackage` — nonexistent patient | Rejected |
| 13 | `purchasePackage` — happy path | `sittings_total`/`purchase_amount_paise` denormalized correctly; `expires_at` ≈ purchase + `validity_days` |
| 14 | `patientPackages()` | Org-scoped; `is_expired` computed from `expires_at` |
| 15 | `redeemPackageSitting` — nonexistent appointment | Rejected |
| 16 | `redeemPackageSitting` — cross-org appointment | Rejected |
| 17 | `redeemPackageSitting` — nonexistent/cross-org package | Rejected |
| 18 | `redeemPackageSitting` — package belongs to a different patient than the appointment | Rejected |
| 19 | `redeemPackageSitting` — expired package | Rejected |
| 20 | `redeemPackageSitting` — no sittings remaining | Rejected, transaction never starts |
| 21 | `redeemPackageSitting` — happy path | `sittings_remaining` decremented; zero-amount `succeeded` `AppointmentPayments` row created; appointment confirmed if `awaiting_payment` |
| 22 | Tenancy matrix — `packages` domain, every role in `allowedRoles` | Own-org-only visibility enforced |

## Out of scope

Partial-sitting packages, package transfer/refund/renewal, multi-tender
purchase collection, frontend UI (backend-only per this batch's confirmed
direction).
