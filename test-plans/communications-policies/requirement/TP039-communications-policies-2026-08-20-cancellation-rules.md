---
id: TP039
type: requirement
feature: communications-policies
created: 2026-08-20
updated: 2026-08-20
status: approved
parent: REQ006
related: [PLAN009]
---

# Test plan — Cancellation Rules backend (REQ006/PLAN009)

Written and executed together under the user's "yes go ahead" authorization to implement REQ006's cancellation-rules piece; no separate test-suggestions → promotion step was inserted since these were authored directly against the already-approved implementation plan, not spec'd ahead of it.

## Unit tests (`backend/src/cancellation-rules/cancellation-rules.service.spec.ts`)

| Case | Expectation |
|---|---|
| `list` scopes by direct `client_org_id` column for an org caller | `findMany` called with `where.client_org_id: 'org-a'` |
| `list` does not scope for a platform-wide caller | `where.client_org_id` is `undefined` |
| `list` maps `hours_before_appointment` → `hours_before` on output | field renamed correctly |
| `create` rejects a clinic outside the caller's org | `{success:false}`, no DB write |
| `create` rejects a nonexistent clinic | `{success:false}` |
| `create` (clinic-scoped) stamps `client_org_id` from the **clinic's** org, not the caller's | works correctly even for a platform-wide (`client_org_id: null`) admin creating a rule for a specific tenant's clinic |
| `create` (global, org caller) anchors `client_org_id` to the caller's own org | manager's "all clinics" rule stays confined to their tenant |
| `create` (global, platform caller) leaves `client_org_id: null` | truly platform-wide, consistent with existing "org-less sees everything" convention |
| `create` returns `{success:false}` on a DB error instead of throwing | matches the frontend's `r?.createCancellationRule?.success` read pattern |
| `update` rejects a rule owned by another org | cross-tenant update rejected |
| `update` rejects reassigning to a clinic outside the caller's org | cross-tenant reassignment rejected |
| `update` leaves `client_org_id`/`clinic_id` untouched when `clinic_id` is omitted from input | partial updates don't clobber scope |
| `update` (switch to global) clears `clinic_id` but **preserves** the existing `client_org_id` anchor | going global doesn't strip tenant ownership |
| `remove` rejects a rule owned by another org | cross-tenant delete rejected |
| `remove` soft-deletes an owned rule | `is_deleted: true` |

## Live e2e verification (real backend, `admin@medibook.dev` / `manager@medibook.dev`, authenticated GraphQL calls)

1. List as admin — empty initially, real clinics returned alongside.
2. Create a clinic-scoped rule as admin — succeeds, returns full shape including nested `clinic{id name}`.
3. Create a global rule (no `clinic_id`) as admin — succeeds, `clinic_id: null`.
4. List again — both rules present.
5. Manager (org-scoped) attempts to create a rule against the seeded **foreign-org** clinic — rejected with `"Clinic not found"`.
6. Manager lists rules — sees only the clinic-scoped rule belonging to their own org (not the admin's platform-wide global rule, not any foreign-org data).
7. Manager updates their rule to global (`clinic_id: ''`) — succeeds; the rule's org anchor is preserved (still visible to the manager afterward).
8. Manager deletes their own rule — succeeds.
9. Admin deletes the remaining global test rule — succeeds; final list is empty (dev DB left clean).

## Non-goals for this plan

Notification Templates tab (Communications) and Security-settings tab (Policies) are explicitly out of scope — both are blocked on open questions logged against REQ006/REQ005 about overlap with `EmailTemplates` and REQ005's Account & Security tab respectively.
