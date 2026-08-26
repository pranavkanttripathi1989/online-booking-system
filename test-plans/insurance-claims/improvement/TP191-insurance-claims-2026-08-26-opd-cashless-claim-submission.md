---
id: TP191
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN171
related: []
---

# TP191 — Test plan: OPD cashless claim submission and tracking

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Unknown/cross-org appointment rejected | `submitClaim` | `BadRequestException`; `claims.create` never called |
| 2 | Unknown payer rejected | `submitClaim` | `BadRequestException` |
| 3 | Policy/patient mismatch rejected (Hard Rule 6) | `submitClaim` with a foreign policy | `BadRequestException` |
| 4 | patient_id derived from appointment | `submitClaim` | `data.patient_id` matches the appointment, not any input |
| 5 | Rupee→paise conversion on write | `submitClaim` | `claim_amount` stored ×100 |
| 6 | Rupee conversion + patient_name on read | `submitClaim`/`claim` result | `claim_amount` is rupees; `patient_name` flattened |
| 7 | 2-level org scoping on list | `claims` | `where: {appointment: {clinic: {client_org_id}}}` |
| 8 | Cross-org claim read rejected | `claim` | `NotFoundException` |
| 9 | Illegal transition rejected | `submitted → approved` | `BadRequestException`; `claims.update` never called |
| 10 | Terminal claim rejected | `rejected → anything` | `BadRequestException` |
| 11 | Missing approved_amount rejected | `→ approved` with no amount | `BadRequestException` |
| 12 | Missing rejection_reason rejected | `→ rejected` with no reason | `BadRequestException` |
| 13 | Legal transitions stamp correctly | `submitted→under_review`, `under_review→approved`, `approved→settled` | correct `decided_at`/`settled_at`/`approved_amount` per transition |
| 14 | Frontend renders real claims | `manager/claims` list | Real data shown, not fabricated |
| 15 | Frontend empty state | No claims | "No claims submitted yet." shown |
| 16 | Frontend submits end-to-end | Search → select → payer → amount → submit | Real `submitClaim` call; list refetches |
| 17 | Frontend approves via real mutation | `under_review` → Approve dialog → submit | Real `updateClaimStatus` call; row advances to "Mark Settled" |
| 18 | Real GraphQL schema builds | `npm run test:int` | All 4 suites green (catches `@Args` reflection errors unit tests cannot) |
| 19 | Full suite regression | Backend unit + integration; frontend claims page suite | 92/92 / 1521/1521; integration 4/4 / 387/387; frontend 4/4 |
| 20 | Lint/typecheck clean | All touched files | 0 errors; frontend ratchet still exactly 1911 |
