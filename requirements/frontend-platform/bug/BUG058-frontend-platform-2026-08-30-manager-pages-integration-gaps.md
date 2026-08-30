---
id: BUG058
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [PLAN233, TP253, TR253]
---

# BUG058 — `manager/Availability.jsx`, `manager/Blocks.jsx`, `manager/clinics/edit.jsx`, `manager/products/edit.jsx` violated DATA-13

## How it was found

The user asked directly: "check all fronend page and fix the backend
and fronend intgartionn gap" — a full-repo frontend/backend integration
audit. Executed as a fork sweeping `frontend/src/pages/manager/` first
against six gap classes (mock-fallback-on-empty-result, GraphQL
contract/DTO mismatches, missing refetch after mutation, frontend
`RoleGuard` narrower than backend `@Auth()`, missing `TableContainer`,
any other confirmed functional bug).

## What was found

**`DATA-13` violations (mock fallback fires on a genuine empty result,
not just a query error):**

1. `manager/Availability.jsx:357,516,519,520` — `availabilities`,
   `clinicians`, `clinics` (and, inside `loadRoomsForClinic`'s own
   `try` block, `rooms`) all used `data?.x?.length ? data.x : MOCK_X`.
   A real, legitimate empty result (e.g. no availability rows yet, or a
   clinic with no active rooms) rendered fabricated demo data instead
   of an empty state.
2. `manager/Blocks.jsx:402,403,404,409,412` — identical pattern for
   `clinicians`, `clinics`, `allRooms`, `spacerBlocks`, `roomBlocks`,
   with no try/catch gating at all.

**A missing not-found guard, compounding a `DATA-13` violation, on two
edit pages:**

3. `manager/clinics/edit.jsx` — `data?.clinic ?? MOCK_CLINIC_BY_ID[id]
   ?? DEFAULT_MOCK_CLINIC`, with no not-found guard anywhere in the
   file. A bad or deleted clinic id silently populated the edit form
   with a fabricated `DEFAULT_MOCK_CLINIC` (`name: 'Unknown Clinic'`,
   every other field blank) instead of a "Clinic not found" state — a
   user could then unknowingly "save" against a clinic id that doesn't
   exist.
4. `manager/products/edit.jsx` — the identical root cause
   (`DEFAULT_MOCK_PRODUCT`), same missing guard. This page's own save
   handler already correctly checked `updateProduct.success` before
   showing success, so only the "silently edits a fabricated record"
   half applied here.

**Ruled out as non-violations** (correctly error-gated, matching the
`DATA-13`-permitted exception): `manager/products/index.jsx`,
`manager/rooms/index.jsx`, `manager/services/index.jsx`,
`manager/Dashboard.jsx`. **Ruled out as a live bug** (mock keys never
match real UUIDs, and a real not-found guard already exists):
`manager/clinics/detail.jsx`.

**RBAC gate check (frontend `RoleGuard` vs. backend `@Auth()`):**
confirmed matching for `/manager/reports`, `/manager/revenue-share`,
and `/manager/imports` — all three gate `admin`/`super_admin`/`manager`
on both sides (`scheduled-reports.resolver.ts`,
`revenue-share.resolver.ts`, `analytics.resolver.ts`,
`imports.resolver.ts`'s own `IMPORT_ROLES`). No mismatch found this
pass.

All other manager pages audited (`claims`, `clinic-forms`, `clinics/
create`, `memberships`, `packages`, `pharmacy`, `registries`,
`rooms/{create,detail,edit}`, `services/{create,detail,edit}`) use
`client.mutate` + an explicit reload call, correctly check
`success`/`userErrors` where that convention applies, and have no mock
import at all — clean.

## Fix

- `Availability.jsx`/`Blocks.jsx`: destructure `error` from `useQuery`
  and gate every mock fallback on `error` instead of `.length`; a
  genuine empty array now renders as empty.
- `clinics/edit.jsx`/`products/edit.jsx`: removed the dangerous
  `DEFAULT_MOCK_*` catch-all (kept the dead, harmless
  `MOCK_*_BY_ID` map used only on a genuine query `error`, matching the
  sibling `detail.jsx` pages' own convention), and added a real
  not-found guard mirroring `detail.jsx`'s existing one.

See `PLAN233`/`TP253`/`TR253` for full detail.
