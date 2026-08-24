---
id: TP097
type: requirement
feature: insurance-claims
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ031
related: [PLAN070]
---

# TP097 — Test plan: payer/TPA master + empanelment + patient policy capture

Direct test-plan; suggestion stage skipped per `CLAUDE.md` step 4.

## Unit — `insurance.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | `findPayers` | | Applies **no** org filter at all — confirms the global-directory design decision |
| TC-02 | An unknown `payer_id` | `createEmpanelment` | Rejected |
| TC-03 | A `clinic_id` belonging to a different org | `createEmpanelment` | Rejected (Hard Rule 6) |
| TC-04 | Valid empanelment | `createEmpanelment` | `client_org_id` stamped from the validated clinic |
| TC-05 | A cross-org empanelment | `updateEmpanelmentStatus` | Rejected `NotFoundException` |
| TC-06 | A `'patient'`-role caller reading an arbitrary `patient_id`'s policies | `findPolicies` | Rejected |
| TC-07 | An unknown `payer_id` | `createPolicy` | Rejected |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-08 | New `insurance` domain-case (`payerEmpanelments` — the tenant-scoped half; `Payers` itself is `EXEMPT`-shaped global data but the directory only needs one shared fixture row, not a matrix case), fixture empanelments per org against a shared `payer1` fixture row | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; role-gated to `staff`/`manager`/`admin`/`super_admin` |

## Static / build + full-suite gates

| Case | Command | Expected |
|---|---|---|
| TC-09 | `npx tsc --noEmit` | Clean |
| TC-10 | `npx eslint` | 0 errors |
| TC-11 | `npm test` | All green |
| TC-12 | `npm run test:int` | All green |
