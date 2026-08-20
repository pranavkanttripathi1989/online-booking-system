---
id: PLAN009
type: requirement
feature: communications-policies
created: 2026-08-20
updated: 2026-08-20
status: done
parent: REQ006
related: []
---

# Implementation plan — Cancellation Rules backend (REQ006, Policies tab)

Scopes only the Cancellation Rules tab of `admin/Policies.jsx` — the one piece of REQ006 that was unblocked (Notification Templates and Security-settings overlap questions remain open, tracked separately in REQ006/REQ005).

## Contract source

`admin/Policies.jsx` already had a real, working inline `gql` contract (query `cancellationRules`, mutations `createCancellationRule`/`updateCancellationRule`/`deleteCancellationRule`) with **zero matching backend resolvers** — confirmed by grepping the generated `backend/src/schema.gql` before starting. Built the backend to match that contract exactly, not the other way around (Hard Rule 7).

## Schema/frontend contract mismatch found mid-build

The pre-existing `ProductCancellationRules` model was product-scoped only (`product_id` required, no `name`/`description`/`clinic_id`/`priority`). The frontend's form has no product picker at all — only a clinic `<Select>` labelled **"Clinic (leave blank = global)"** with a **"Global (all clinics)"** option. Resolved via user decision: extend the schema so a rule can be product-scoped, clinic-scoped, **or** global (neither), rather than building a parallel model.

A second issue surfaced only after re-reading the frontend closely: a "global" rule (no clinic, no product) still needs a tenant anchor, or it becomes an unscoped cross-tenant read/write (Hard Rule 6) — a manager's "applies to all my clinics" rule must not be visible to another org's manager. Fixed by adding a direct `client_org_id` column to `ProductCancellationRules`, populated at create time:
- clinic-scoped rule → `client_org_id` derived from **the clinic's own org**, not the caller's JWT (so an admin creating a rule for a specific tenant's clinic doesn't accidentally orphan it with `client_org_id: null`)
- global rule → `client_org_id` = caller's own org (a manager's global rule stays confined to their org); `null` for a platform-wide admin/super_admin caller (consistent with the existing "org-less caller sees everything" convention used elsewhere)

## Schema changes

Two migrations (the first written before the global-rule gap was found, the second correcting it):
- `20260820120000_extend_cancellation_rules_clinic_scope` — nullable `product_id`, new `name`/`description`/`clinic_id`/`priority` columns, FK to `Clinics`, CHECK constraint (superseded below)
- `20260820121500_cancellation_rules_org_scope_and_global` — adds `client_org_id` (+ FK to `ClientOrganizations`), replaces the CHECK constraint to allow the global (both-null) case while still forbidding product+clinic simultaneously

Table had 0 rows in every environment checked, so no backfill was needed either time.

## Backend module (`backend/src/cancellation-rules/`)

- `entities/cancellation-rule.entity.ts` — `CancellationRuleType`, `CancellationRuleClinicType`, `CancellationRuleUserErrorType`, `CancellationRuleMutationResultType`, field names matching the frontend exactly (`hours_before`, not `hours_before_appointment`)
- `dto/cancellation-rule.input.ts` — `CreateCancellationRuleInput` (`clinic_id` optional — omitting/blanking it means global), `UpdateCancellationRuleInput` (all fields optional)
- `cancellation-rules.service.ts` — `list`/`create`/`update`/`remove`, all mutations **return** `{success, userErrors[, cancellationRule]}` rather than throwing (matches the established convention from `blocks.service.ts`, not NestJS exceptions — the frontend's `handleRuleSubmit` reads `r?.createCancellationRule?.success`, not a GraphQL error)
- `cancellation-rules.resolver.ts` — `@Auth('admin', 'super_admin', 'manager')` on all four operations, matching the role gating already used on `rooms`/`blocks` (the other admin/manager clinic-config domains)
- `cancellation-rules.module.ts`, registered in `app.module.ts`

## Verification

- 15 new unit tests (`cancellation-rules.service.spec.ts`): happy path, cross-tenant clinic rejection on create/update, org-scoped vs. platform-wide listing, global-rule org anchoring (manager vs. platform caller), org-anchor preservation when switching an existing rule to global, DB-error → `{success:false}` not a throw. Full backend suite: 38/38 suites, 420/420 tests green.
- Live-verified against the real running backend (not mocks) via authenticated GraphQL calls as both `admin@medibook.dev` and `manager@medibook.dev`: create clinic-scoped rule, create global rule, list correctly scoped per caller, cross-tenant create correctly rejected (`Clinic not found`), update-to-global preserves the original org anchor, delete works for both roles. Test rows cleaned up after verification — dev DB back to 0 rows.
- `npm run lint` clean.

See [TP039](../../../test-plans/communications-policies/requirement/TP039-communications-policies-2026-08-20-cancellation-rules.md) and [TR038](../../../test-results/communications-policies/requirement/TR038-communications-policies-2026-08-20-cancellation-rules.md).
