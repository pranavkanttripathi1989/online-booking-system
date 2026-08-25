---
id: REQ051
type: improvement
feature: queue-management
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ019
related: [REQ019]
---

# Mandatory pre-consultation checklist gating "call next"

## Source

`REQ019`'s own `US-QUE-06` (P1, deliberately deferred when the P0 slice of
queue-management shipped 2026-08-24 — see `PLAN058`). PRD ref `FR-QUE-08`.

## Current state vs. PRD

`REQ019`'s P0 slice (`PLAN058`) shipped real check-in, token assignment,
the live queue board, and queue actions (call next, recall, skip/park,
transfer) — `QueueService.callNext()` is real and tested, but performs no
pre-condition check beyond queue-state itself. There is no concept
anywhere in the schema of a per-clinic/per-service required item that
must be satisfied before a patient can be called in.

## User story

**US-QUE-06** — As a Branch Manager, I want a mandatory pre-consultation
checklist (consent, vitals, ID, etc.) that can block "call next" until
complete, so that a clinician never starts a consult missing required
information.

- PRD ref: `FR-QUE-08`
- Priority: P1 (of `REQ019`), picked up now as its own improvement slice

### Acceptance criteria

- Given a service configured with a mandatory checklist, when a required
  item is incomplete for the patient's current queue entry, then "call
  next" for that patient is rejected with a clear reason identifying the
  missing item(s).
- Given a service with no checklist configured, "call next" behaves
  exactly as it does today (no regression on the common case).
- A manager/admin can define, for a given clinic (optionally scoped to a
  specific service), an ordered list of required checklist items.
- Front-desk/nursing staff can mark an item complete for a specific
  patient's current visit; completion is scoped to that one visit, not a
  standing patient-level flag.
- Cross-tenant: a checklist item defined for one org's clinic must never
  be visible or completable from another org's caller.

## Data-model impact

New `ChecklistItems` (org/clinic-scoped, optionally `service_id`-scoped,
ordered, `is_required`) and `ChecklistCompletions` (one row per
patient-visit × item, `completed_by_user_id`, `completed_at`) tables.
`QueueService.callNext()` gains a pre-check: if the target queue entry's
clinic/service has any `is_required` item without a matching
`ChecklistCompletions` row for that visit, reject with the missing
item(s) named.

## Out of scope (deferred, not silently dropped)

Vitals/triage capture itself (`US-QUE-08`, a separate P1 story — a
checklist item can reference "vitals recorded" as a label, but this slice
does not build a structured vitals-capture UI/flow) and any checklist
template library/reuse-across-clinics tooling — a flat per-clinic list is
sufficient for this slice.
