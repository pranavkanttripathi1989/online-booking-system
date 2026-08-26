---
id: BUG015
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: [BUG009]
---

# BUG015 — P2 "Truth in the UI" quick wins: TableContainer wrappers, dead mock component, stale debug line

First slice of `project-plans/analysis/06-execution-plan.md` P2, picked for being the
cheapest, safest, highest-confidence items after the 2026-08-23 P2/P3 audit
(see that doc's own updated status table). Three independent, small fixes,
bundled into one bug doc since each is mechanical and low-risk — same
pattern `BUG009` used for its own batch of small fabricated-page fixes.

## 1. Three `<Table>`s with no `<TableContainer>` (F-20)

`patients/detail.jsx`, `settings/index.jsx`, and
`components/Dashboard/RecentAppointmentsTable.jsx` all rendered a raw
`<Table>` with no scrolling ancestor — Hard Rule 5's "no silent truncation"
violation, already measured in `technical-plans/06-frontend-architecture-and-mobile.md`:
`settings/index.jsx`'s Notifications tab clips the entire "In-App" column
off-screen at 360px (not just cosmetic — a mobile user cannot toggle
in-app notifications at all), and `RecentAppointmentsTable`'s rightmost
column is cut with no way to scroll to it. `document.scrollWidth >
clientWidth` reports clean on both — the documented reason a page-level
probe alone doesn't catch this class of bug.

**Fix:** wrapped each `<Table>` in `<TableContainer>`. `settings/index.jsx`
additionally had its own compounding bug: the `<Paper>` wrapping the table
had `overflow: 'hidden'`, which was the actual clipping mechanism — removed
that and let `TableContainer` own the scroll instead.

## 2. `RecentAppointmentsTable` also had its own empty-vs-mock bug (F-15-adjacent)

While touching this file for its `TableContainer` fix, found it was still
falling back to 5 fabricated rows (`"Emma Wilson"`, `"Dr Smith"`, ...)
whenever its `appointments` prop was a real, empty array — the same
empty-result-treated-as-no-backend defect class `BUG009` already fixed in
`appointments/index.jsx` and `calendar/index.jsx`. A dashboard with
genuinely zero upcoming appointments showed 5 fake ones instead of a real
empty state. Fixed: `rows = (appointments ?? []).slice(0, 5)`, with a real
"No upcoming appointments" message when that's empty.

## 3. `GlobalSearch.jsx` — dead mock-data component (F-18/2.3)

Hardcoded `MOCK_DATA` array, zero GraphQL, and (confirmed by a repo-wide
grep) not imported or rendered anywhere — already unreachable, just never
deleted. Building a real cross-domain search resolver is materially larger
scope (a new backend aggregation across every domain) and not attempted
here; the file added no value sitting unused, so it's deleted rather than
left as bait for someone to wire up believing it's live.

## 4. Apollo client's stale "Backend offline — using mock data" debug line (F-21/2.7)

`apollo/client.js`'s network-error handler logged this on every network
error, regardless of whether the failing domain has a real backend now (most
do) or ever had a mock fallback for that specific query. Removed — the
`errorPolicy: 'all'` default already lets a query's real error surface to
its own component; this line was narrating a fallback story that's mostly
no longer true and was never anything the network layer itself performed.

## What this does not close

- The rest of P2.7 (deciding whether to change the *global* `cache-first`
  default to `cache-and-network`, versus the 26 files that already override
  it per-query) — not touched. Changing the global default is a broader
  behavioral change (more background network traffic, possible loading-state
  flicker) that needs testing across every list page, not a one-line
  mechanical fix; left as still open in `06-execution-plan.md`.
- 2.1 (the 4 still-fabricated pages), 2.2 (the 3 backend-less pages), 2.5
  (the 88-file theme sweep) are unrelated, larger items — tracked
  separately, not folded into this bundle.

## Verification

`npx eslint` on all 4 touched files: 0 errors, only pre-existing unrelated
warnings (confirmed via `git diff` that none of the warned lines were
touched by this change). See `TR062`.
