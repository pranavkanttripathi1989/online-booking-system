---
id: REQ127
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ020
related: [PLAN167, TP187, TR187]
---

# REQ127 — Investigation orders (FR-EMR-08)

## Why this slice

`REQ020`'s own P1/P2 deferral list named "investigation orders" as
unbuilt scope. Confirmed still true before starting: `EncountersService`
had no way for a clinician to order a lab/imaging test from within a
consultation — the only related table, `TestResults`, is written to
exclusively by the pre-existing standalone `orderTest()` mutation and
lab-side result entry, with no link back to the encounter that
requested it.

## Scope correction, found before starting

This session's own batch plan (`project-plans/12-next-10-slice-batch.md`)
originally described this slice as "new table, links encounters →
test-results" — a parallel `InvestigationOrders` table. Reading
`TestResults`' real schema before writing any migration changed that:
`TestResultStatus` already models `pending → processing → completed`,
which is exactly the order→result lifecycle this story asks for. An
"order" and its eventual "result" are the same real-world row at two
different points in that lifecycle, not two related-but-distinct
entities. Building a second table would have meant either duplicating
that lifecycle or reconciling two tables' status fields by hand.

Shipped instead: `TestResults` gains `encounter_id` (nullable — most
existing rows predate this and were never tied to a specific
consultation, e.g. walk-in lab work via the pre-existing `orderTest()`)
and `urgency` (`routine | urgent | stat`, defaulting to `routine`). A
new `Encounters.orderInvestigation` mutation creates a `TestResults` row
with `status: 'pending'` and the calling encounter's `patient_id`.

## User story

As a clinician in a consultation, I can order a lab/imaging investigation
directly from the encounter workspace, see the investigations I've
already ordered for this encounter, and have that order become the same
row the lab later attaches its result to.

## Acceptance criteria

- **Given** an open (unsigned) encounter, **when** a clinician orders an
  investigation with a test name, test type, and urgency, **then** a
  `TestResults` row is created with `status: 'pending'`,
  `encounter_id` set, and the encounter's own `patient_id`.
- **Given** a locked (signed) encounter, **when** an order is attempted,
  **then** it is rejected with the same "signed and can no longer be
  edited" message every other clinical-content mutation on a locked
  encounter uses.
- **Given** an encounter with investigation orders, **when** it is
  fetched, **then** `investigation_orders` on the response includes
  every order tied to it, oldest first.
- **Given** no `urgency` supplied, **then** it defaults to `'routine'`.
- **Given** a caller who is not the encounter's own org, **then** the
  existing `loadEncounterForUser` org/self-scope check rejects the
  order — no new tenancy logic was written, since this reuses the same
  encounter-loading path every other clinical mutation already goes
  through.

## In scope

- `Encounters.orderInvestigation` mutation (clinician-only, matching
  every other clinical-content write on this domain).
- `encounter.investigation_orders` field.
- An "Investigations" section on `EncounterWorkspace.jsx`, mirroring the
  existing Diagnoses section's UI exactly (list + "Order Investigation"
  dialog).

## Deliberately out of scope

- Any change to the pre-existing standalone `orderTest()` mutation or
  the lab-result-entry flow — both continue to write/read the same
  `TestResults` table unchanged; `encounter_id` is simply null for rows
  created that way.
- A results view inside the encounter workspace — the order is visible
  with its current `status`, but viewing/uploading the actual result
  stays on the existing `test-results` domain's own pages, not
  duplicated here.
- ABHA/ABDM lab-order interoperability — out of this codebase's current
  scope entirely (see `abdm-interop`).
