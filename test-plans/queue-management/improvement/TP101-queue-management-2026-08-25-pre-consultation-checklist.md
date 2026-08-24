---
id: TP101
type: improvement
feature: queue-management
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN074
related: [REQ051]
---

# TP101 — Test plan: mandatory pre-consultation checklist

Skipping the test-suggestion stage per CLAUDE.md's conditional rule — a
routine config-table CRUD domain matching an already-proven pattern
(`cancellation-rules`), plus a single additive gate on an already-real,
already-tested service method. Going straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `list()` for a clinic in the caller's own org | Returns that clinic's items |
| 2 | `list()` for a cross-org clinic | Returns `[]`, does not throw |
| 3 | `list()` with no `clinic_id`, org-A caller | Returns only org A's items across all its clinics |
| 4 | `list()` with no `clinic_id`, org-B caller | Returns only org B's items — never org A's |
| 5 | `list()` as a platform operator | Can see any clinic's items |
| 6 | `create()` for a clinic in scope | Succeeds |
| 7 | `create()` for a cross-org clinic | `{success:false}`, no row created |
| 8 | `create()` with a `product_id` belonging to a different clinic | `{success:false}`, no row created |
| 9 | `update()`/`remove()` on a cross-org item | `{success:false}`, no mutation |
| 10 | `completeItem()` for an in-scope appointment/item pair | Succeeds, `upsert` called with the caller's own id |
| 11 | `completeItem()` for a cross-org appointment | `{success:false}` |
| 12 | `completeItem()` with an item from a different clinic than the appointment | `{success:false}` |
| 13 | `getIncompleteRequiredItems()` — no items configured | `[]` |
| 14 | `getIncompleteRequiredItems()` — some items complete, some not | Only the incomplete items' labels |
| 15 | `getIncompleteRequiredItems()` — all items complete | `[]` |
| 16 | `getIncompleteRequiredItems()` — product-scoped appointment | Only clinic-wide + that product's own items considered |
| 17 | `QueueService.callNext()` — a required item is incomplete | Rejects with `BadRequestException` naming the missing item; `queueEntries.update` never called |
| 18 | `QueueService.callNext()` — checklist complete or none configured | Proceeds exactly as before this slice |
| 19 | Tenancy matrix — `checklist` domain, every role in `allowedRoles` | Own-org-only visibility enforced; every other role rejected |

## Out of scope

Frontend UI (backend-only slice, matching Phase G+2 precedent). Structured
vitals/triage capture (`US-QUE-08`, separate P1 story).
