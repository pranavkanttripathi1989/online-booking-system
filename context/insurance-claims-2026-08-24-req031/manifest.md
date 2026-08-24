---
id: CTX-insurance-claims-2026-08-24-req031
type: requirement
feature: insurance-claims
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ031
related: [PLAN070, TP097, TR096]
---

# insurance-claims — REQ031 slice: payer/TPA master + empanelment + patient policy capture (2026-08-24)

Sixth of eight requirement slices in this pass (REQ018 → REQ032 → REQ034
→ REQ022 → REQ030 → **REQ031** → REQ015 → REQ029).

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN070 | [payer master + empanelment](../../implementation-plans/insurance-claims/requirement/PLAN070-insurance-claims-2026-08-24-payer-master-and-empanelment.md) |
| test-plans | TP097 | [verification plan](../../test-plans/insurance-claims/requirement/TP097-insurance-claims-2026-08-24-payer-master-and-empanelment.md) |
| test-results | TR096 | [verification results — pass](../../test-results/insurance-claims/requirement/TR096-insurance-claims-2026-08-24-payer-master-and-empanelment.md) |

## What shipped

The largest net-new PRD module's genuinely buildable foundation, per the
requirement doc's own risk mitigation ("valuable without any payer API
existing"): `Payers` (global reference data, like Languages — insurers/
TPAs are shared across every tenant), `PayerEmpanelments` (per-branch
status), `PatientInsurancePolicies` (manual capture, no OCR). Pure
master-data/CRUD, zero real payer/TPA API integration.

## What's deliberately NOT built

`US-INS-02` (payer-specific tariffs), OCR health-card pre-fill,
pre-visit eligibility badges, and the entire benefit-wallet/bill-split
adjudication engine — the requirement doc's own P1 scope built on top of
this foundation, correctly sequenced as follow-on work.

## Next in this pass

REQ015 (clinician verification + org-scoped API keys).
