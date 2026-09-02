---
id: CTX-ipd-2026-09-02-req181-operation-theatre
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ181
related: [PLAN250, TP270, TR270, REQ179, REQ180]
---

# ipd — slice 3: operation theatre scheduling (2026-09-02)

Slice 3 of the 5-slice IPD plan approved alongside slice 1 (`REQ179`,
`context/ipd-2026-09-02-req179/manifest.md`) and built directly on slice
2's nursing/discharge-summary work (`REQ180`,
`context/ipd-2026-09-02-req180-nursing-charting/manifest.md`) —
core-first sequencing. Triggered by a bare `continue` after slice 2
shipped, tested, documented, and was pushed.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ181 | [doc](../../requirements/ipd/requirement/REQ181-ipd-2026-09-02-operation-theatre-scheduling.md) |
| implementation-plans | PLAN250 | [doc](../../implementation-plans/ipd/requirement/PLAN250-ipd-2026-09-02-operation-theatre-scheduling.md) |
| test-plans | TP270 | [doc](../../test-plans/ipd/requirement/TP270-ipd-2026-09-02-operation-theatre-scheduling.md) |
| test-results | TR270 | [doc](../../test-results/ipd/requirement/TR270-ipd-2026-09-02-operation-theatre-scheduling.md) |

## What shipped

- **New `backend/src/operation-theatre/` module**: theatres, bookings
  (two GiST EXCLUDE constraints — theatre-overlap with turnaround folded
  into the excluded range, surgeon-overlap without it), the WHO Surgical
  Safety Checklist gating case completion, operative notes locked via the
  existing `reject_write_if_locked()` trigger, real stock-consuming
  consumables mirroring `mar.service.ts`'s own transaction shape.
- **`Drugs.item_type`** — additive, defaults to `'drug'`, zero call-site
  changes required at any existing drug picker.
- **A best-effort `assertSurgeonFree()`** catching an OPD/OT clash at
  create time — Postgres has no cross-table EXCLUDE, a stated limitation.
- **Frontend**: `pages/ipd/OperationTheatre.jsx`, a top-level nav entry
  (schedule board, not a drill-down), full lifecycle UI.

## The core database guarantee, proven under real concurrency

Two GiST EXCLUDE constraints on `OtBookings`, both verified live via
`ipd-ot.int-spec.ts` (6/6 gates): theatre-overlap (5 concurrent bookings
into one theatre, exactly one succeeds; the turnaround boundary itself
tested at the exact second — starting exactly at another's `end_at` is
rejected, starting 31 minutes later succeeds) and surgeon-overlap (the
same surgeon rejected across two different theatres, a guarantee the
theatre-only constraint alone cannot provide and no application-level
check could make atomic).

## Two real findings from this slice

1. **A pre-existing tenancy-matrix gap from slice 2, closed here.**
   `nursing` (REQ180) had shipped without ever being classified in
   `matrix-coverage.int-spec.ts` — the anti-rot gate was already silently
   red. Confirmed live before any slice-3 classification work: running
   the gate failed with `unclassified: ["nursing", "operation-theatre"]`.
   `nursing` is now `EXEMPT` (every query keyed by an id, not an org-wide
   list); `operation-theatre` is a real `CASES` entry.
2. **Applying the prior slice's own lesson prevented a repeat bug.**
   `REQ180` found a real `UndefinedTypeError` from a GraphQL `@Args`
   declared with a TypeScript union type and no explicit `type:`. Every
   new `@Args()` in this slice's resolver carries an explicit `type:`
   proactively, and the container booted cleanly on the first attempt —
   no repeat of the same class of bug.
3. **A retroactive frontend test-coverage gap closed.** `NursingChart.jsx`
   (slice 2) had shipped with no test file at all. Found while writing
   this slice's own frontend tests; a new `NursingChart.test.jsx` closes
   it rather than leaving it silently missing.

## Deliberately NOT built in this slice (recorded, not silently dropped)

OT billing (no bill exists for OT usage at all yet) — slice 4. Equipment/
ancillary booking alongside a theatre slot, prep/recovery room booking
(modelled as turnaround) — per the original plan's own cut. Notification
integration for OT events — no acceptance criterion required it.

## Verification

Backend: 57 new unit tests across 5 spec files + 2 `drugs.service.spec.ts`
cases, full suite 162 suites/2537 tests, `tsc`/`eslint` clean. Integration:
`ipd-ot.int-spec.ts` 6/6 gates, full suite 11/11 suites, 488/488 tests,
`matrix-coverage.int-spec.ts` green after closing both classification
gaps. Live schema introspection confirmed all 6 new queries and 15 new
mutations genuinely served on the first container boot. Frontend: build/
lint/size-limit green, `OperationTheatre`'s own lazy chunk 6.55kB gzipped;
15/15 tests across the 4 IPD-domain frontend suites.

## Commits

`31fbb1d` (backend), `dd5847f` (backend tests), `d95fe54` (frontend).
