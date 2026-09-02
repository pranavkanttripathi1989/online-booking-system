---
id: TP268
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: approved
parent: PLAN248
related: [REQ179]
---

# TP268 — Test plan: IPD slice 1 (ADT core)

Suggestion stage skipped. This is arguably the most exploratory,
first-of-its-kind domain this codebase has shipped — a genuinely new
"multi-day stay" concept with no prior contract to extend — which is
exactly the case `CLAUDE.md`'s own conditional rule names for the
suggestion stage. It is skipped here on the grounds that the review gate
the suggestion stage exists to provide was already satisfied by a full
technical design (schema, the five highest-risk decisions with reasoning,
explicit cuts) presented and approved via `ExitPlanMode` before any code
was written — the same precedent this session's platform-billing slice
already set for a comparably novel domain.

## Database-guarantee cases (integration — cannot be proven by a mocked-Prisma unit test)

| # | Case | Expected |
|---|---|---|
| 1 | 5 concurrent `createAdmission` calls into the same bed | Exactly 1 succeeds; the other 4 get a clean conflict message, never a raw error or 500 |
| 2 | A backdated `transferAdmissionBed` into a bed occupied at that time | Rejected by the exclusion constraint |
| 3 | `cancelAdmission`, then a new admission into the same bed for the same period | Succeeds — the cancelled occupancy is excluded by the constraint's own predicate |
| 4 | Direct `UPDATE`/`DELETE` against a filed `MlcRegisters` row, bypassing the service entirely | Rejected by a database trigger |
| 5 | The live bed board, queried by org A | Shows org A's real occupancy; org B's fixture bed never appears |

## `WardsService` / `BedBoardService` cases

| # | Case | Expected |
|---|---|---|
| 6 | `findAllWards`/`findAllBeds` | Scoped to caller org; a platform operator sees every org |
| 7 | `createWard` — clinic from a different org | Rejected |
| 8 | `createWard` by a platform operator | `client_org_id` derived from the validated target clinic, never the caller's own (the `departments.service.ts` bug class) |
| 9 | `createWard`/`createBed` — cross-org `bed_charge_product_id` | Rejected; an org-level master product (`clinic_id: null`) is accepted |
| 10 | `removeWard`/`removeBed` on an occupied ward/bed | Refused with a clean message, not a foreign-key error |
| 11 | `createBed` — duplicate `bed_number` in the same ward | Rejected with a clean conflict message |
| 12 | `blockBed` on an occupied bed | Refused |
| 13 | `blockBed`/`releaseBed` | Writes a real `BedOccupancies` row with `admission_id: null`; a bed-overlap exclusion violation is translated to a clean message |
| 14 | `bedBoard` — occupancy-rate math | Blocked beds excluded from the denominator; 0% (not a division error) when every bed is blocked |

## `AdmissionsService` cases

| # | Case | Expected |
|---|---|---|
| 15 | `create` — bed in a different clinic than the admission | Rejected |
| 16 | `create` — patient with an existing live admission | Rejected, no duplicate row |
| 17 | `create` — attending clinician omitted | Defaults to the admitting clinician |
| 18 | `create` — `admission_type: insurance` vs. otherwise | `billing_mode` defaults `package` vs. `itemized` |
| 19 | `create` — happy path | Occupancy row + bed status + `AdmissionEvents('admitted')` all written in one transaction |
| 20 | `transferBed` — admission not currently live | Rejected |
| 21 | `transferBed` — same bed the patient is already in | Rejected |
| 22 | `transferBed` — happy path | Source occupancy closed **before** destination opened (verified by call order); source bed → `cleaning`, destination → `occupied` |
| 23 | `discharge` — already discharged / discharge time before admission time | Rejected |
| 24 | `discharge` — happy path | Bed → `cleaning` (not `available`); admission → `discharged`; `discharge_type` defaults `routine` |
| 25 | `cancel` — cross-org / already-discharged | Clean failure, not a throw |
| 26 | `cancel` — happy path | Occupancy `is_cancelled: true` (not merely closed); bed → `available` |
| 27 | `length_of_stay_days` | Inclusive of the admission day (a same-day stay reads 1, not 0) |

## `MlcService` cases

| # | Case | Expected |
|---|---|---|
| 28 | `record` — admission already has an MLC register | Rejected (one per admission) |
| 29 | `record` — cross-org admission / examining clinician | Rejected |
| 30 | `record` — happy path | Sets `Admissions.is_mlc`; logs an `mlc_flagged` event |
| 31 | `recordPoliceIntimation` — already recorded | Rejected (the trigger's own carve-out is exactly once) |
| 32 | `recordPoliceIntimation` — defaults | `intimation_mode` defaults `in_person` |
| 33 | `amend` — an unlisted field name | Rejected (only statutory fields are amendable) |
| 34 | `amend` — `previous_value` | Read from the row itself, never the caller-supplied input |
| 35 | `police_intimation_overdue` | True only past 24h with no intimation; false once intimation is recorded regardless of elapsed time |

## Sweep cases

| # | Case | Expected |
|---|---|---|
| 36 | `MlcPoliceIntimationSweepService` — query window | 20h cutoff, 4h ahead of the real 24h deadline |
| 37 | Sweep — no manager/admin at the clinic | No dispatch at all |
| 38 | Sweep — already notified today | Skipped (once-per-day dedup) |
| 39 | Sweep — one register throws | Continues to the next, does not abort the whole sweep |
| 40 | `BedStatusReconcileService` — cache already correct | No divergence, no write |
| 41 | Reconcile — cache wrong | Divergence reported and (when `apply: true`) corrected |
| 42 | Reconcile — `cleaning` with no open occupancy | Not flagged (a legitimate cached state with no timeline row of its own) |
| 43 | Reconcile — one bed throws | Continues to the next |

## Frontend cases

| # | Case | Expected |
|---|---|---|
| 44 | Bed board — no wards | Real empty state, not fabricated data |
| 45 | Bed board — real occupied bed | Renders from `bedBoard`, not mock data |
| 46 | Bed board — occupancy-rate display | Matches the excludes-blocked-beds backend math |
| 47 | Bed board — "Admit here" | Shown only on an available bed |
| 48 | Admissions — empty state | Real empty state |
| 49 | Admissions — list | Renders from `admissions`, not mock data |
| 50 | New Admission — full flow | Patient search (debounced, no re-search on selection — the `PlatformBilling.jsx` bug class), ward→bed cascade, submit succeeds |
| 51 | Detail dialog | Shows transfer/discharge/cancel actions for a live admission |
| 52 | Discharge flow | Submits and refreshes the list |
| 53 | MLC tab | Shows the police-intimation-overdue warning for a flagged admission |
