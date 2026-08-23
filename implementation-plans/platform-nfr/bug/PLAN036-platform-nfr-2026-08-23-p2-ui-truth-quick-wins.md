---
id: PLAN036
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG015
related: [TP063, TR062]
---

# PLAN036 — P2 UI-truth quick wins

Mechanical fixes against already-established patterns (`TableContainer`,
the empty-vs-error mock-fallback fix already used twice this session) — no
test-suggestions stage per `REQ013` Phase D.

## 1. TableContainer wrappers

- `pages/patients/detail.jsx`: import `TableContainer`, wrap the
  Appointments-tab `<Table>`.
- `pages/settings/index.jsx`: import `TableContainer`, wrap the
  Notifications-tab `<Table>`, and remove the wrapping `<Paper>`'s
  `overflow: 'hidden'` (the actual clipping mechanism, not just a missing
  wrapper).
- `components/Dashboard/RecentAppointmentsTable.jsx`: import
  `TableContainer`, wrap the table, add a real empty state for when `rows`
  is empty.

## 2. RecentAppointmentsTable's mock fallback

Replace `(appointments && appointments.length > 0) ? appointments.slice(0,5) : MOCK`
with `(appointments ?? []).slice(0, 5)`, deleting the `MOCK` array entirely.
Add a conditional empty-state render (`rows.length === 0`) instead of
letting an empty table body render with just headers.

## 3. GlobalSearch.jsx deletion

Confirmed via repo-wide grep it has zero importers. Delete the file.

## 4. Apollo debug line

Remove the `console.debug('[MediBook] Backend offline — using mock data.')`
call in `apollo/client.js`'s `errorLink`; drop the now-unused `networkError`
destructure.

## Verification plan

See `TP063`.
