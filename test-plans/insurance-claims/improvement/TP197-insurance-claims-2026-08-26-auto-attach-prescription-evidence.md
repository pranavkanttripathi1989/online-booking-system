---
id: TP197
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN177
related: []
---

# TP197 — Test plan: auto-attach a claim's issued prescriptions as evidence

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Cross-org rejection | `claimEvidencePrescriptions` for a claim in another org | `NotFoundException`; `encounters.findUnique` never called |
| 2 | No encounter yet | Claim whose appointment has no `Encounters` row | Returns `[]`; `PrescriptionsService.prescriptionsForEncounter` never called |
| 3 | Real evidence returned | Claim whose appointment has an encounter with prescriptions | Looks up the encounter by `appointment_id`, delegates to `prescriptionsForEncounter(encounter.id)`, returns its result |
| 4 | `prescriptionsForEncounter` fetch shape | Direct unit call | `findMany({where: {encounter_id}, include: {items: true}, orderBy: {issued_at: 'desc'}})`, drug names resolved onto items |
| 5 | Empty encounter | `prescriptionsForEncounter` for an encounter with no prescriptions | Returns `[]` |
| 6 | Full suite regression | Backend unit + integration | 92/92 suites / 1544/1544 tests; integration 4/4 / 387/387 unchanged |
| 7 | Lint/typecheck clean | All touched files | 0 errors |
