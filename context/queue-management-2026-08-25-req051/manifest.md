---
id: CTX-queue-management-2026-08-25-req051
type: improvement
feature: queue-management
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ051
related: [REQ019, PLAN074, TP101, TR100]
---

# queue-management — REQ051: mandatory pre-consultation checklist (2026-08-25)

First slice in a new 8-slice batch picked from `project-plans/` (research
cross-checked against real code, not `requirements/README.md`'s Open/Done
counts — several turned out stale, e.g. `REQ016`/`REQ023`/`REQ014` all
already have real P0 shipments). Smallest/lowest-risk of the 8, done
first.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ051 | [pre-consultation checklist](../../requirements/queue-management/improvement/REQ051-queue-management-2026-08-25-pre-consultation-checklist.md) |
| implementation-plans | PLAN074 | [implementation plan](../../implementation-plans/queue-management/improvement/PLAN074-queue-management-2026-08-25-pre-consultation-checklist.md) |
| test-plans | TP101 | [verification plan](../../test-plans/queue-management/improvement/TP101-queue-management-2026-08-25-pre-consultation-checklist.md) |
| test-results | TR100 | [verification results — pass, 74/74 + 4/4 suites](../../test-results/queue-management/improvement/TR100-queue-management-2026-08-25-pre-consultation-checklist.md) |

## What shipped

New `backend/src/checklist/` module — `ChecklistItems`/
`ChecklistCompletions` models, full CRUD + a `completeChecklistItem`
mutation, wired into `QueueService.callNext()` as a pre-check that rejects
with the missing required items named. Backend-only, matching the Phase
G+2 precedent — frontend UI is a deferred follow-up.

## A real design correction, caught before writing code

Exploring `queue.service.ts`'s real `callNext()` first (the working
loop's own "explore before planning" step) found `Encounters` rows are
created on the same status-transition path `callNext` itself participates
in — an encounter usually doesn't exist yet at call-next time. The
original sketch assumed gating on "the encounter"; corrected to gate on
`appointment_id` instead before any schema/code existed.

## A real lint error, turned into a genuine test-coverage fix

`checklist.service.spec.ts`'s first draft had an unused `orgBUser` test
fixture, caught by `eslint`. Rather than delete it, added the real test it
was implicitly missing — an org-B caller's no-args "list my org's own
items" call is scoped to org B only, never org A's.

## Verification

Backend unit: 74/74 suites, 1071/1071 tests (was 73/1053). Integration
(from host, not `docker exec` — see PLAN073's earlier finding): 4/4
suites, 324/324 tests (was 315), including a new `checklist` tenancy-matrix
domain-case row. `eslint`/`tsc --noEmit` clean.
