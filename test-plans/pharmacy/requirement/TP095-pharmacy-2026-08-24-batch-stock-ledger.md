---
id: TP095
type: requirement
feature: pharmacy
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ022
related: [PLAN068]
---

# TP095 — Test plan: per-clinic drug batch/stock ledger

Direct test-plan; suggestion stage skipped per `CLAUDE.md` step 4 (matches
the already-proven Hard-Rule-6/`$transaction`-audit-trail pattern this
session's other new domains use).

## Unit — `pharmacy.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | `findBatches` | Tenant caller | Scoped to `client_org_id` |
| TC-02 | A `clinic_id` belonging to a different org | `receiveStock` | Rejected, no batch/movement created |
| TC-03 | Valid receive | `receiveStock` | Batch created with `quantity_remaining === quantity_received`; a matching `receipt` movement with the same `quantity_delta` |
| TC-04 | A cross-org batch | `adjustStock` | Rejected |
| TC-05 | An adjustment that would take remaining stock below zero | `adjustStock` | Rejected, no write |
| TC-06 | A valid negative adjustment | `adjustStock` | `quantity_remaining` decremented; an `adjustment` movement logged with notes |
| TC-07 | A batch/prescription-item drug mismatch | `dispensePrescriptionItem` | Rejected |
| TC-08 | Dispensing more than remains in the batch | `dispensePrescriptionItem` | Rejected |
| TC-09 | A valid dispense | `dispensePrescriptionItem` | `quantity_remaining` decremented; a `dispense` movement logged with `reference_type: 'prescription_item'`, `reference_id` set to the item's id |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-10 | New `pharmacy` domain-case (`drugBatches`, own `client_org_id`), fixture batches per org against the existing `drugA`/`drugB` fixture rows | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; role-gated to `staff`/`manager`/`admin`/`super_admin` |

## Static / build + full-suite gates

| Case | Command | Expected |
|---|---|---|
| TC-11 | `npx tsc --noEmit` | Clean |
| TC-12 | `npx eslint` | 0 errors |
| TC-13 | `npm test` | All green |
| TC-14 | `npm run test:int` | All green |
