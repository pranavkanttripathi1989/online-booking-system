---
id: TP102
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN075
related: [REQ052]
---

# TP102 — Test plan: auto-no-show sweep + configurable intake fields

Skipping the test-suggestion stage per CLAUDE.md's conditional rule — an
additive extension to already-real, already-tested domains
(`appointments`, plus a routine config-table CRUD matching `checklist`'s
already-proven pattern). Going straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | Sweep — appointment past its org's grace period, `confirmed`, no check-in | Marked `no_show`; patient's `no_show_count` incremented |
| 2 | Sweep — appointment still within its grace period | Left untouched |
| 3 | Sweep — org has no `no_show_grace_minutes` configured | Falls back to the 30-minute default |
| 4 | Sweep — one row throws during processing | Sweep continues to the remaining rows |
| 5 | Sweep query | Only ever targets `status: 'confirmed', is_deleted: false` |
| 6 | `create()` — patient's `no_show_count` at or above the org's threshold | `awaiting_payment`, regardless of the service's own `prepayment_policy` |
| 7 | `create()` — below the threshold | Normal `scheduled`/policy-driven status |
| 8 | `create()` — a per-org configured (non-default) threshold | Respected, not a hardcoded value |
| 9 | `create()` — intake responses submitted | Stored as the appointment's `intake_responses` JSON |
| 10 | `create()` — a required intake field for this clinic/service not answered | Rejected, naming the missing field |
| 11 | `create()` — every required field answered | Succeeds |
| 12 | `create()` — an optional field left unanswered | Succeeds (not required) |
| 13 | Intake fields `list()` — clinic in caller's own org | Returns that clinic's fields |
| 14 | Intake fields `list()` — cross-org clinic | Returns `[]`, does not throw |
| 15 | Intake fields `list()` — no `clinic_id` | Every field across the caller's own org only |
| 16 | Intake fields `create()`/`update()`/`remove()` — cross-org | Rejected, `{success:false}` |
| 17 | Intake fields `create()` — a `product_id` from a different clinic | Rejected |
| 18 | `forBooking()` | Clinic-wide + this product's own fields only |
| 19 | Org booking policies — read/update `no_show_grace_minutes`/`no_show_prepayment_threshold` | Round-trips correctly, org-scoped |
| 20 | Tenancy matrix — `intake-fields` domain, every role in `allowedRoles` | Own-org-only visibility enforced |

## Out of scope

Frontend UI (backend-only slice, per this session's confirmed direction —
a dedicated frontend-completion pass follows once all 8 slices ship).
