---
id: TP269
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: approved
parent: PLAN249
related: [REQ180]
---

# TP269 — Test plan: IPD slice 2 (nursing charting, MAR, discharge summary)

Suggestion stage skipped, same grounds as `TP268`: this slice's own full
technical design (schema, the two real deviations found by exploration, the
riskiest migration's own pre-migration audit) was reviewed and approved via
`ExitPlanMode` before any code was written.

## `NursingService` cases

| # | Case | Expected |
|---|---|---|
| 1 | `recordAdmissionVitals` against a cross-org admission | Rejected (`NotFoundException`) |
| 2 | `recordAdmissionVitals` with a valid reading | `unit` derived server-side from `VITAL_UNITS`, never client-supplied |
| 3 | `recordIntakeOutput` with a category not valid for the given direction | Rejected |
| 4 | `recordIntakeOutput` with a valid output category | Created, scoped to the admission's own org |
| 5 | `intakeOutputBalance` over a set of intake/output rows | Sums intake and output independently into a correctly signed `balance_ml` |
| 6 | `createAdmissionNote` by a clinician | `author_clinician_id` stamped from the caller's own JWT, never a client-supplied argument |
| 7 | `signAdmissionNote` on an already-signed note | Rejected |
| 8 | `signAdmissionNote` on a cross-org note | Rejected |
| 9 | `addAdmissionNoteAddendum` on a locked note | Succeeds — append-only regardless of lock state |
| 10 | `createShiftHandover` against a cross-org ward | Rejected |
| 11 | `acknowledgeShiftHandover` on an already-acknowledged handover | Rejected |

## `MedicationOrdersService` cases

| # | Case | Expected |
|---|---|---|
| 12 | `create` against a cross-org admission | Rejected |
| 13 | `create` by a non-clinician caller | Rejected |
| 14 | `create` for a non-PRN order with no schedule times | Rejected |
| 15 | `create` for a discharged admission | Rejected |
| 16 | `create` | `ordered_by_clinician_id` stamped from the caller's own JWT, never a client-supplied argument |
| 17 | `create` for a PRN order with no schedule times | Allowed |
| 18 | `hold` on a non-active order | Rejected |
| 19 | `hold` on a cross-org order | Rejected |
| 20 | `hold` on an active order | Order status becomes `held` with the given reason |
| 21 | `resume` on a non-held order | Rejected |
| 22 | `stop` on an already-stopped/completed order | Rejected |
| 23 | `stop` | Future scheduled MAR rows marked `not_available`, never deleted |
| 24 | `findAllForAdmission` cross-org | Rejected |
| 25 | `findAllForAdmission(activeOnly: true)` | Filters to `active`/`held` only |

## `MarService` cases

| # | Case | Expected |
|---|---|---|
| 26 | `administer` on a cross-org dose | Rejected |
| 27 | `administer` on an already-recorded dose | Rejected |
| 28 | `administer(status: 'given')` on a high-alert order with no witness | Rejected |
| 29 | `administer(status: 'given')` on a high-alert order with a witness | Succeeds |
| 30 | `administer(status: 'refused'/'held'/'missed')` on a high-alert order, no witness | Succeeds — the witness gate applies only to `given` |
| 31 | `administer(status: 'given', batch_id)` | `DrugBatches.quantity_remaining` decremented by 1; a `StockMovements` row created with `reference_type: 'medication_administration'` |
| 32 | `administer` with a batch belonging to a different drug | Rejected |
| 33 | `administer` with a batch with zero remaining stock | Rejected |
| 34 | `recordPrn` on a non-PRN order | Rejected |
| 35 | `recordPrn` on a cross-org order | Rejected |
| 36 | `recordPrn` | Creates a MAR row with `scheduled_at === administered_at` |
| 37 | `admissionMar` cross-org | Rejected |

## `MarScheduleSweepService` cases

| # | Case | Expected |
|---|---|---|
| 38 | No eligible orders | No-op |
| 39 | Query shape | Filters to `status: 'active'`, `is_prn: false` |
| 40 | An order whose admission is no longer live | Skipped |
| 41 | An order with no schedule times | Skipped |
| 42 | A normal active order | One `upsert` per schedule time within the 24h window, keyed on the `(order_id, scheduled_at)` composite |
| 43 | The sweep run twice against the same order | Identical upsert call count — idempotent, matching the migration's own `@@unique` guarantee |
| 44 | An order whose `stop_at` falls inside the window | No slot materialised past `stop_at` |

## `DischargeSummaryService` cases

| # | Case | Expected |
|---|---|---|
| 45 | `create` for a cross-org admission | Rejected |
| 46 | `create` for an admission that already has a summary | Rejected (`ConflictException`) |
| 47 | `create` | `final_diagnosis` pre-filled from the admission; `course_in_hospital`/`discharge_medications` built from real `AdmissionEvents`/active orders |
| 48 | `create` with a cross-org template | Rejected |
| 49 | `update` on a locked (signed) summary | Rejected |
| 50 | `update` on a cross-org summary | Rejected |
| 51 | `update` on an unlocked summary | Fields persisted |
| 52 | `sign` on an already-signed summary | Rejected |
| 53 | `sign` by a non-clinician caller | Rejected |
| 54 | `sign` | `locked: true`, `signed_by_clinician_id` stamped from the caller, `pdf_hash` a 64-char hex SHA-256 |
| 55 | `sign` on identical content twice / differing content | Same hash both times; different content produces a different hash |
| 56 | `createDischargeSummaryTemplate` with a cross-org clinic | Rejected |
| 57 | `createDischargeSummaryTemplate` with no `clinic_id` | Created as an org-wide template |

## Regression

| # | Case | Expected |
|---|---|---|
| 58 | `encounters.service.ts#patientVitals` after the `Vitals` nullability change | Widened `OR` across `encounter`/`admission` relations; every pre-existing OPD-only assertion still holds |

## Live-only checks (not unit-testable against a mocked Prisma client)

- Container boot after schema generation — the GraphQL schema factory
  actually resolves every new type (this is where the `@Args` union-type
  bug was caught, not by `tsc` or a unit test).
- Live introspection of `Query`/`Mutation` confirming all 11 new queries
  and 17 new mutations are genuinely served.
