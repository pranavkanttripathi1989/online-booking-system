---
id: CTX-test-results-2026-09-03-req184-record-test-result
type: improvement
feature: test-results
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ184
related: [PLAN253, TP273, TR273]
---

# test-results — `recordTestResult`: the previously-missing completion path (P2-13)

`P2-13` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`, the
next unstarted slice per `phase-plans/README.md`'s own `▶ CURRENT POSITION`,
picked up via a bare `continue` right after the 5-slice IPD detour
(`REQ179`–`REQ183`) completed and was pushed.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ184 | [doc](../../requirements/test-results/improvement/REQ184-test-results-2026-09-03-record-test-result-completion.md) |
| implementation-plans | PLAN253 | [doc](../../implementation-plans/test-results/improvement/PLAN253-test-results-2026-09-03-record-test-result-completion.md) |
| test-plans | TP273 | [doc](../../test-plans/test-results/improvement/TP273-test-results-2026-09-03-record-test-result-completion.md) |
| test-results | TR273 | [doc](../../test-results/test-results/improvement/TR273-test-results-2026-09-03-record-test-result-completion.md) |

## The real finding

Verifying the phase tracker's own literal wording ("no results-inbox
worklist exists") against the real code — the `continue` protocol's own
step 4 — found something more fundamental: **no mutation anywhere in this
codebase could ever move a `TestResults` row past its default `'pending'`
status or attach a value.** `orderTest`/`orderInvestigation` (`REQ127`) both
only ever create a pending, empty-values row. `toGraphQL()`'s own "withheld
until completed" logic had never once returned real values against
production data. A results-inbox worklist built on top of this would have
been a filtered view onto data that could never change state.

## What shipped

- **`recordTestResult` mutation** — legal transitions only
  (`pending→processing`, `pending→completed`, `processing→completed`);
  `completed` is terminal (immutable, the `AdmissionNotes`/
  `DischargeSummaries`/`OtNotes` "locked once signed" precedent applied to
  lab data for the first time). Values required only when completing;
  `date_completed` derived server-side.
- **Frontend**: extended the existing `test-results/index.jsx` list — a new
  "Record Result" row action (hidden once completed) and a dialog for
  marking processing or completing with a dynamic parameter list. Status
  KPI cards are now real, accessible click-to-filter triggers.

## The scope decision

A codebase-wide survey found no Kanban/status-column layout anywhere in
this app. `manager/claims/index.jsx` (the claims desk) is the directly
analogous "queue of pending items to a terminal status" page, and it uses
the same flat table + status `Chip` + conditional action buttons + dialog
that `test-results/index.jsx` already had. Building a separate "inbox" page
would have duplicated the list rather than closed the actual gap. Full
account in `PLAN253`.

## Live browser verification

Logged in as `receptionist@medibook.dev` against the real dev stack.
Recorded a real value (Hemoglobin / 14.2 g/dL / 13.5-17.5 / Normal) against
a genuinely pending fixture row — the mutation succeeded, the row flipped
to Completed with a live-updating KPI count, and "View Result" displayed
the exact recorded value: the first time in this domain's history a real
completed result's values have ever been shown against production data.
The KPI-card click-to-filter was also confirmed live. One known, accepted
side effect: the fixture row mutated during this check is now permanently
`completed` by this slice's own deliberate immutability design — not
reverted, and not a data-integrity concern (a pre-existing test artifact,
not core seed data).

## Deliberately NOT built (recorded, not silently dropped)

A dedicated `/test-results/inbox` page or Kanban layout. Per-clinician
"my orders only" filtering. Editing/correcting an already-completed result.

## Verification

Backend: 9 new unit tests (30 total in the domain), full suite green,
`tsc`/`eslint` clean, full integration suite green (13/516) including the
domain's existing tenancy-matrix coverage. Frontend: 2 new tests, lint 0 new
warnings, build/size green, plus the live browser pass above.

## Next in the phase-plans spine

`P2-13` marked done in `02-phase2-win-the-midmarket.md`;
`phase-plans/README.md`'s `▶ CURRENT POSITION` advanced to `P2-14` (digital
intake → auto-populate EMR).

## Commits

`b52d802` (backend), `1759647` (frontend).
