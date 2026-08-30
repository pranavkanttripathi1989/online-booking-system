---
id: PLAN233
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG058
related: [BUG058, TP253, TR253]
---

# PLAN233 — fix DATA-13/not-found-guard gaps in 4 manager pages

## Scope

`frontend/src/pages/manager/Availability.jsx`,
`frontend/src/pages/manager/Blocks.jsx`,
`frontend/src/pages/manager/clinics/edit.jsx`,
`frontend/src/pages/manager/products/edit.jsx`. No backend change —
all four already had real backend contracts; the bug was purely in
how the frontend treated an empty/null result.

## Approach

1. **`Availability.jsx`/`Blocks.jsx`**: add `error` to the `useQuery`
   destructure. Replace every `data?.x?.length ? data.x : MOCK_X`
   with `error ? MOCK_X : (data?.x ?? [])`. `Availability.jsx`'s
   `loadRoomsForClinic` also had a same-class violation inside its own
   `try` block (separate from its already-correct `catch`-block
   fallback) — fixed by trusting `liveRooms` unconditionally inside
   `try`, leaving the `catch` block's existing mock fallback as the
   only offline path.
2. **`clinics/edit.jsx`/`products/edit.jsx`**: add `error` to the
   `useQuery` destructure. Change the load effect to only populate
   `form` from `data?.x` (or, on a genuine `error`, the dead
   `MOCK_X_BY_ID` map) — never a `DEFAULT_MOCK_X` catch-all. Add a
   `!fetching && !form` not-found branch mirroring the sibling
   `detail.jsx` pages' own existing guard. Delete the now-unused
   `DEFAULT_MOCK_CLINIC`/`DEFAULT_MOCK_PRODUCT` constants.

## Why not just delete `MOCK_*_BY_ID` entirely

Left in place, gated on `error`, matching this codebase's own
established convention on the sibling `detail.jsx` pages for these
same two domains — an intentional, documented offline-degraded-mode
fallback, not something this slice's scope covers removing.

## Testing

- New `manager/clinics/edit.test.jsx` (2 tests): real clinic renders
  its real values; `clinic: null` (a real empty success result) shows
  "Clinic not found", never `DEFAULT_MOCK_CLINIC`'s fields.
- New `manager/products/edit.test.jsx` (2 tests): same shape for
  products.
- `Availability.jsx`/`Blocks.jsx` had no pre-existing test file; no
  new one was added this slice (see Test Suggestions below) — the fix
  was verified via `eslint`, the full `manager` Jest suite (unaffected,
  49/49), and a full `npm run build`.

## Test suggestions (not built this slice)

`Availability.jsx`/`Blocks.jsx` are both large (900+ line), heavily
stateful pages with real form/mutation flows beyond the scope of this
bug fix — a dedicated "empty result renders empty, not mock" test for
each belongs in a future test-plan slice for those pages specifically,
not bundled into this fix.

See `TP253`/`TR253`.
