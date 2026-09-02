---
id: TP270
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: approved
parent: PLAN250
related: [REQ181]
---

# TP270 — Test plan: IPD slice 3 (operation theatre scheduling)

Suggestion stage skipped, same grounds as `TP268`/`TP269`: this slice's own
full technical design (schema, both EXCLUDE constraints, the tenancy-matrix
gap audit) was reviewed and approved via `ExitPlanMode` before any code was
written.

## `OperationTheatresService` cases

| # | Case | Expected |
|---|---|---|
| 1 | `create` against a cross-org clinic | Rejected |
| 2 | `create` with no turnaround supplied | Defaults to 30 minutes |
| 3 | `assertTheatreInScope` on a cross-org theatre | Rejected |
| 4 | `assertTheatreInScope` on an inactive theatre | Rejected, names the theatre |
| 5 | `assertTheatreInScope` on a valid, active, in-org theatre | Returns it |
| 6 | `update` on a cross-org theatre | Rejected |
| 7 | `remove` when the theatre has a scheduled/in-progress booking | Rejected, theatre not soft-deleted |
| 8 | `remove` with no live bookings | Soft-deleted |
| 9 | `remove` on a cross-org theatre | Not-found error, no existence confirmation |
| 10 | `findOne` on a cross-org theatre | Rejected |

## `OtBookingsService` cases

| # | Case | Expected |
|---|---|---|
| 11 | `create` with `end_at` not after `start_at` | Rejected |
| 12 | `create` against a cross-org admission | Rejected |
| 13 | `create` where the theatre and admission belong to different clinics | Rejected |
| 14 | `create` when the surgeon has a real overlapping OPD appointment | Rejected (`assertSurgeonFree`) |
| 15 | `create` when the surgeon's OPD appointment does not actually overlap | Allowed |
| 16 | `create` with no `turnaround_minutes` override | Snapshots the theatre's own default |
| 17 | `create` with a `turnaround_minutes` override | Uses the override, not the theatre default |
| 18 | `create` hitting the theatre-overlap exclusion constraint | Translated into a clean `ConflictException` |
| 19 | `create` hitting the surgeon-overlap exclusion constraint | Translated into a clean `ConflictException` |
| 20 | `start` on a non-`scheduled` booking | Rejected |
| 21 | `complete` on a non-`in_progress` booking | Rejected |
| 22 | `complete` with fewer than 3 checklist phases done | Rejected, names the missing phase(s) |
| 23 | `complete` with all 3 phases done | Status becomes `completed` |
| 24 | Any status transition on a cross-org booking | Rejected |
| 25 | `cancel` a `completed` booking | Rejected (`success: false`) |
| 26 | `cancel` a `scheduled` booking with a reason | Succeeds, `cancel_reason` persisted |
| 27 | `cancel` a cross-org booking | Not-found error |
| 28 | `assignStaff` with a cross-org user | Rejected |
| 29 | `assignStaff` with a valid in-org user | Row created |
| 30 | `removeStaff` from a cross-org booking | Rejected |
| 31 | `findAllForAdmission` cross-org | Rejected |
| 32 | `findOne` cross-org | Not-found, no existence confirmation |

## `OtChecklistsService` cases

| # | Case | Expected |
|---|---|---|
| 33 | `complete` on a cross-org booking | Rejected |
| 34 | `complete` on an already-completed phase | Rejected, no upsert issued |
| 35 | `complete` on a not-yet-completed phase | Upserted, stamped with the caller and now |
| 36 | `complete` re-attempting a phase row that exists but was never completed | Allowed (a partial draft is not "done") |

## `OtNotesService` cases

| # | Case | Expected |
|---|---|---|
| 37 | `create` on a cross-org booking | Rejected |
| 38 | `create` for a booking that already has a note | Rejected |
| 39 | `create` by a non-clinician caller | Rejected |
| 40 | `create` | `author_clinician_id` stamped from the caller, never a client-supplied argument |
| 41 | `update` on a locked note | Rejected |
| 42 | `update` on a cross-org note | Rejected |
| 43 | `update` on an unlocked note | Fields persisted |
| 44 | `sign` on an already-signed note | Rejected |
| 45 | `sign` by a non-clinician caller | Rejected |
| 46 | `sign` | `locked: true`, `signed_at` stamped |
| 47 | `findByBooking` on a cross-org booking | Rejected |
| 48 | `findByBooking` with no note yet | Returns `null` |

## `OtConsumablesService` cases

| # | Case | Expected |
|---|---|---|
| 49 | `record` on a cross-org booking | Rejected |
| 50 | `record` for a deleted item | Rejected |
| 51 | `record` with no batch supplied | No `StockMovements` row written |
| 52 | `record` with a batch | `DrugBatches.quantity_remaining` decremented; an append-only `StockMovements` row created with `reference_type: 'ot_consumable'` |
| 53 | `record` with a batch belonging to a different drug | Rejected |
| 54 | `record` with a batch with insufficient stock | Rejected |
| 55 | `remove` a record that already consumed real stock | Rejected — the audit trail must survive |
| 56 | `remove` a record with no stock movement attached | Deleted |
| 57 | `remove` on a cross-org record | Not-found error |

## `DrugsService` regression (the `item_type` default)

| # | Case | Expected |
|---|---|---|
| 58 | `findAll` with no `item_type` argument | Defaults to `'drug'` |
| 59 | `findAll` with an explicit `item_type` | Uses the caller-supplied value |

## Live-only checks (not unit-testable against a mocked Prisma client)

- 5 concurrent `createOtBooking` calls into one theatre with 5 distinct
  surgeons — exactly one succeeds, the other four get a clean conflict
  message naming the theatre, isolating the theatre-overlap constraint
  from the surgeon-overlap one.
- A booking starting exactly at another's `end_at` (no turnaround
  elapsed) — rejected. One starting `end_at` + 31 minutes later —
  succeeds.
- The same surgeon booked into two different theatres for an overlapping
  window — rejected by the surgeon-overlap constraint specifically (a
  guarantee no single-table constraint could provide, and no application
  check could make atomic).
- `completeOtBooking` end-to-end through the real resolver: rejected with
  0/3 checklist phases, succeeds once all 3 are recorded via
  `completeOtChecklist`.
- A signed `OtNotes` row attacked directly with `prisma.otNotes.update`,
  bypassing every service-layer check — rejected by the database trigger
  itself.
- Container boot after schema generation — confirms the GraphQL schema
  factory resolves every new type with no `@Args` reflection failure.
- Live introspection of `Query`/`Mutation` confirming all 6 new queries
  and 15 new mutations are genuinely served.
- `matrix-coverage.int-spec.ts` — confirms `nursing` and
  `operation-theatre` are both classified (the anti-rot gate was already
  silently red for `nursing` before this slice started).
