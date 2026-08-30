---
id: PLAN234
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG059
related: [BUG059, TP254, TR254]
---

# PLAN234 — network-only re-fetch for user.patient/user.clinician in 3 pages

## Scope

`frontend/src/pages/patient/Profile.jsx`,
`frontend/src/pages/clinician/Availability.jsx`,
`frontend/src/pages/clinician/Calendar.jsx`. No backend change.

## Approach

Same pattern as the existing `clinician/Dashboard.jsx` fix (`BUG021`):
a dedicated `gql` query selecting only `me { patient { id } }` (or
`me { clinician { id, full_name } }`), run with `fetchPolicy:
'network-only'` and `skip: !!user?.<field>?.id` (so it never fires once
the cached value is already present — no wasted request on a warm
session). The resolved id/name is used as the fallback, not the primary
source, so nothing changes for a session where the cache is already
populated.

`Availability.jsx` additionally keeps its existing `'clin-1'` literal
as the final fallback (after the real cached value and the network
re-fetch both come up empty) — for the documented non-clinician-role
dev/demo visit case, unchanged from before this fix.

## Testing

No pre-existing test files for `Profile.jsx`/`Availability.jsx`. New
tests were not added this slice for these two (see Test Suggestions
below) — verified via `eslint` (0 errors) and a full `npm run build`.
`clinician/Calendar.test.jsx` already exists and was re-run to confirm
no regression (7/7 pass) — its own mocks pre-date this fix and never
exercised `user.clinician`, so the new `GET_MY_CLINICIAN_LINK` query
correctly stays `skip`-ped throughout that suite.

## Test suggestions (not built this slice)

A dedicated "fresh login (user.clinician/patient undefined) still
resolves via the network fallback" test for each of the three files
belongs in a future, focused test-plan slice — the same discipline
already applied to `clinician/Dashboard.jsx`'s own test suite.

See `TP254`/`TR254`.
