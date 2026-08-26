---
id: PLAN151
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ111
related: [TP162, TR162]
---

# PLAN151 — Admin UI for per-branch product price overrides

Implementation plan for `REQ111`.

## Backend — one small, additive field exposure (not a new endpoint)

`backend/src/services/entities/service.entity.ts`'s `ServiceType` has
no `clinic_id` field today, even though the underlying `Products` row
already carries one and `services.service.ts#toGraphQL()`'s `...rest`
spread already passes it through untouched — it's simply not declared
on the GraphQL entity, so the gateway strips it. Add:

```ts
@Field(() => ID, { nullable: true }) clinic_id?: string;
```

No service-layer change needed — the value is already there. This is
the only backend change in this slice; `productBranchOverrides` and
`setProductBranchOverride` (both from `REQ055`) are used exactly as
they already exist, no modification.

## Frontend — `frontend/src/pages/manager/services/index.jsx`

**Query changes:**
- `GET_SERVICES_DATA`: add `clinic_id` to the `services` selection, so
  the UI can decide per-card whether "Branch pricing" is enabled.
- New `GET_BRANCH_OVERRIDES = gql\`query { productBranchOverrides { id product_id clinic_id mode override_price } }\`` — org-wide (no `clinic_id` arg), loaded once alongside `GET_SERVICES_DATA` in `loadData()`, then filtered client-side by `product_id` when a dialog opens (avoids one query per service).
- Reuse the already-imported `CLINICS_QUERY` from `../../../graphql/queries.js` (currently this page has no clinics query at all — add the import) for the branch list.
- New `SET_BRANCH_OVERRIDE = gql\`mutation SetProductBranchOverride($input: SetProductBranchOverrideInput!) { setProductBranchOverride(input: $input) { success userErrors { message } } }\``.

**New UI:**
- A new `IconButton` (a branch/store icon, e.g. `StoreIcon` from
  `@mui/icons-material`) in each service `Card`'s `CardActions`,
  alongside the existing Edit button. `disabled` (with a `Tooltip`
  explaining why) when `svc.clinic_id != null`.
- A new `Dialog` (`branchDialogOpen`, `branchDialogService` state):
  for each clinic in `clinics`, a row with the clinic name, a `Select`
  (`inherit` / `override` / `skip`) seeded from the matching
  `branchOverrides` row (default `inherit` if none exists), and — only
  when that row's mode is `override` — a price `TextField`.
- Local per-row edit state (`Map<clinic_id, {mode, price}>` seeded on
  open); "Save" iterates only the rows that changed and fires
  `SET_BRANCH_OVERRIDE` for each, matching this file's existing
  sequential-mutation pattern (see `handleSaveCategory`).
- Client-side validation before any mutation fires: an `override` row
  with no price entered shows an inline error and blocks save,
  mirroring the backend's own rejection message verbatim.
- After save, reload branch overrides (not the whole page) and close
  the dialog on full success; on a partial failure, show which
  branch(es) failed via `userErrors` and leave the dialog open.

## Testing

Frontend-only slice (no new backend logic — `branch-overrides.service.spec.ts`
already covers `list`/`set` from `REQ055`). New test cases, added to a
new `manager/services/index.test.jsx` if one doesn't already exist
(check first — this page may not have unit coverage yet):

1. A master service (`clinic_id: null`) shows an enabled "Branch
   pricing" button; a clinic-scoped service shows it disabled with a
   tooltip.
2. Opening the dialog renders one row per clinic, correctly seeded from
   an existing override (mode + price) or defaulting to Inherit when
   none exists.
3. Switching a row to Override reveals the price field; leaving it
   empty and clicking Save shows the inline validation error and does
   NOT call the mutation.
4. Saving a valid changed row calls `setProductBranchOverride` with the
   correct `{product_id, clinic_id, mode, override_price}` shape.
5. A `userErrors` response (e.g. backend rejects because the service
   became clinic-scoped between page load and save) surfaces the
   message and keeps the dialog open.

E2e (Playwright, real backend): one new scenario in a new or existing
`manager-services` spec — set a real branch override for a real
service at a real seeded clinic, reload, confirm the persisted stance
survives a refresh; confirm the action is disabled for a clinic-scoped
service.

## Out of scope for verification

Category/channel override editing is not built in this slice (see
`REQ111`'s own "Deliberately out of scope"), so no test coverage is
needed for it here.
