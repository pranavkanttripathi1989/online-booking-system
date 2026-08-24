---
id: PLAN074
type: improvement
feature: queue-management
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ051
related: [REQ019, PLAN058]
---

# PLAN074 — Implementation plan: mandatory pre-consultation checklist

## Scope

`REQ051` (`US-QUE-06`, `REQ019`'s own P1 remainder) — a clinic-scoped,
optionally product-scoped, ordered checklist that must be complete before
`QueueService.callNext()` will call a patient in.

## Design

New top-level `backend/src/checklist/` module (module/resolver/service/
dto/entity — same flat scaffold as `departments`/`plans`/`consent`),
scaffolded after `cancellation-rules`' exact pattern: `{success,
userErrors, entity?}` mutation responses, a `findScopedClinic`/`findOwned`
pair returning `null` on cross-org mismatch rather than throwing.

Two new models: `ChecklistItems` (clinic_id, optional product_id, label,
is_required, sort_order) and `ChecklistCompletions` (checklist_item_id,
**appointment_id** — not encounter_id, see below — completed_by_user_id,
unique on the pair so marking twice is a no-op via `upsert`).

**Key design decision, made after reading the real `callNext` code**: gate
on `appointment_id`, not `encounter_id`. `QueueService.callNext()` and
`Encounters` creation both hang off the same
`transitionStatus('in_consultation')` path — an `Encounters` row for a
given appointment usually does not exist yet *at* call-next time, only
after it succeeds. Keying `ChecklistCompletions` by `encounter_id` would
have made every gate check a chicken-and-egg failure. `QueueEntries`
already carries `appointment_id`, so `ChecklistService
.getIncompleteRequiredItems(appointmentId)` reads the appointment's own
`clinic_id`/`product_id` directly.

`QueueModule` now imports `ChecklistModule` and `QueueService`'s
constructor takes `ChecklistService`; `callNext()` calls
`getIncompleteRequiredItems(next.appointment_id)` immediately after
finding the next `waiting` entry and before the `$transaction` that would
otherwise call them in — rejecting with `BadRequestException` naming every
missing required item, matching `US-QUE-06`'s own acceptance criterion
("disabled with a clear reason shown to staff").

**`checklistItems`'s `clinic_id` argument is optional, not required** —
found necessary while wiring the tenancy matrix (see Testing): omitted, it
returns every item across every clinic in the caller's own org
(`orgScopeVia(user, 'clinic')`, the same no-args "my org's own rows" shape
`queueEntries`/`rooms` already use); given, it scopes to that one clinic.
This is a genuine design improvement (an admin overview across clinics),
not just a testing workaround — a query requiring a caller-supplied
`clinic_id` can't serve both an org-A and an org-B tenancy-matrix actor
from one shared query/variables pair, since the matrix framework runs the
literal same query+variables for every actor and compares which rows each
can see.

## Real design correction found before writing any code

The original plan sketch (written before reading `queue.service.ts`)
assumed the checklist would gate on "the current encounter." Exploring the
real code first (per the working loop's own step 3) found this was wrong
— see Design above. Caught before a single line of the gate was written,
not after.

## Testing

`checklist.service.spec.ts` (new, 17 cases): list (own-clinic, cross-org
rejected returns `[]` not throws, platform-operator sees any clinic,
no-clinic-id org-wide path for both org A and org B), create (in-scope,
cross-org clinic rejected, a `product_id` belonging to a different clinic
rejected), update/remove (cross-org rejected), `completeItem` (in-scope
upsert, cross-org appointment rejected, an item from a different clinic
than the appointment rejected), `getIncompleteRequiredItems` (no items ->
`[]`, partial completion -> only the incomplete labels, full completion ->
`[]`, product-scoped filtering only includes clinic-wide + that product's
own items).

`queue.service.spec.ts` — 2 new cases in the existing `callNext` describe
block: rejects with the missing item's label named when
`getIncompleteRequiredItems` returns a non-empty list (and does **not**
call `queueEntries.update`, i.e. the transaction never starts); proceeds
normally when the list is empty (existing behavior, unaffected).

`test/integration/setup/domain-cases.ts` gained a `checklist` domain-case
row using the new no-args `{ checklistItems { id } }` query; `fixture.ts`
gained `IDS.checklistItemA`/`B` and one clinic-wide fixture row per org
(no explicit `TABLES` truncate-list entry needed — `ChecklistItems`/
`ChecklistCompletions` both reference already-listed tables, `Clinics`/
`Products`/`Appointments`, and are cleaned up automatically by the
existing `TRUNCATE ... CASCADE`).

Full suite: backend unit `npx jest --maxWorkers=2` — 74/74 suites,
1071/1071 tests (was 73/1053 before this slice — 18 net-new, matching 17
in `checklist.service.spec.ts` + 1 net addition to `queue.service.spec.ts`
after also removing none). `npm run test:int` (from the host) —
4/4 suites, 324/324 tests (was 315 — 9 net-new from the new tenancy-matrix
domain-case row across `tenancy.int-spec.ts` and
`matrix-coverage.int-spec.ts`). `eslint` clean (one real error caught and
fixed during this pass — an unused `orgBUser` test fixture variable;
turned into a genuine extra test case for the no-args org-wide list path
rather than deleted). `tsc --noEmit` clean.

## Out of scope (deferred, not silently dropped)

Frontend UI for checklist management/completion — this slice is
backend-only, matching the established Phase G+2 precedent; a future
follow-up pass (like the one that closed Phase G+2's own frontend gap)
would add an admin checklist-builder page and a "mark complete" control on
the live queue board. Vitals/triage structured capture (`US-QUE-08`, a
separate P1 story) — a checklist item can *reference* "vitals recorded" as
a plain label, but this slice does not build a structured vitals UI/flow.
