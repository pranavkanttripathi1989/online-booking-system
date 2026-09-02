---
id: REQ184
type: improvement
feature: test-results
created: 2026-09-03
updated: 2026-09-03
status: done
parent: —
related: [PLAN253, TP273, TR273]
---

# REQ184 — `recordTestResult`: the previously-missing test-result completion path

## Source

`P2-13` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md` (the
next unstarted, unblocked slice per `phase-plans/README.md`'s own `▶ CURRENT
POSITION`, picked up via a bare `continue`). Its tracker row (already
corrected once, 2026-08-30) framed the gap as a missing "results-inbox
worklist." Verifying that against the real code — the `continue` protocol's
own step 4 — found something more fundamental: **no mutation anywhere in
this codebase could ever move a `TestResults` row past its default
`'pending'` status or attach a value.**

- `orderTest` (`test-results.resolver.ts`) and `orderInvestigation`
  (`encounters.service.ts`, `REQ127`) both only ever `create()` a row with
  `status: 'pending'` and empty `values`.
- `TestResultsResolver` exposed exactly one mutation. No
  `updateTestResult`/`recordTestResult`/`testResults.update` existed anywhere
  in `frontend/src` or `backend/src`.
- `toGraphQL()`'s own comment says values are "withheld until `status ===
  'completed'`" — but nothing could ever set `'completed'`, so that gating
  logic had never once returned a non-empty `values` array against real
  data. The only "completed" result with values anywhere in this app was the
  frontend's own `MOCK_RESULTS` fallback (shown only on a genuine network
  error).
- `patients/detail.jsx`'s own Test Results tab has the identical gap:
  read-only, no completion path.

A results-inbox worklist built on top of this would have been a filtered
view onto data that could never change state. This requirement closes the
load-bearing gap.

## What this ships

- **`recordTestResult` mutation** — the only path anywhere that can move a
  `TestResults` row out of `'pending'`. Legal transitions:
  `pending→processing`, `pending→completed`, `processing→completed`.
  `completed` is terminal — immutable once completed, the
  `AdmissionNotes`/`DischargeSummaries`/`OtNotes` "locked once signed"
  precedent applied here for the first time to lab data integrity.
  `values` required only when completing; `date_completed` derived
  server-side, never caller-supplied.
- **`RecordTestResultInput`/`TestResultValueInput` DTOs** — `flag` restricted
  to the exact controlled vocabulary (`normal|high|low`) the frontend's own
  `flagColorsFor()` has always assumed, unenforced until now only because no
  row had ever been written with one.
- **Frontend**: `pages/test-results/index.jsx` gains a "Record Result" row
  action (hidden once completed) opening a dialog to mark processing or
  complete with a dynamic list of parameter/value/reference/flag rows.
  Clicking a status KPI card now filters the list to that status — the
  existing filterable list, once completion is possible, **is** the results
  inbox.

## Scope decision: extend the existing page, not a new "inbox" page

A codebase-wide survey found no Kanban/status-column layout anywhere in this
app. The directly analogous "staff works a queue of pending items to a
terminal status" page — `manager/claims/index.jsx` (the claims desk) — uses
exactly the same flat table + status `Chip` + status-conditional inline
action buttons + a `Dialog` for actions needing input that
`test-results/index.jsx` already had. There is no separate "claims inbox"
page next to the claims list. Building a second `test-results` page would
have duplicated the gap, not closed it, and introduced a UI pattern this
codebase deliberately doesn't use anywhere else. See `PLAN253` for the full
account.

## Deliberately NOT built (recorded, not silently dropped)

- A dedicated `/test-results/inbox` page or any Kanban/status-column layout.
- Per-clinician/"my orders only" filtering — the existing query has no
  `ordered_by_user_id` filter today, and the claims-desk precedent is also
  org-wide, not per-submitter.
- Editing/correcting an already-completed result — immutable once
  completed; a genuine correction path is its own future slice.

## Acceptance criteria

**US-LAB-01**: As a clinician or front-desk/lab staff member, I can record a
pending test's results and mark it complete.
- Given a `pending` test result, when `recordTestResult` is called with
  `status: 'completed'` and at least one value, then the row's status
  becomes `completed`, its values are stored, and `date_completed` is set.
- Given the same call with zero values, then it is rejected.

**US-LAB-02**: As the same caller, I can mark a result as in-progress before
values are ready.
- Given a `pending` result, when moved to `processing` with no values, then
  it succeeds and no `date_completed` is set.

**US-LAB-03**: A completed result cannot be altered.
- Given a `completed` result, when any further transition is attempted, then
  it is rejected.

**US-LAB-04**: This is tenant-scoped like every other mutation on this
domain.
- Given a test result belonging to a different org, when a caller attempts
  to record a result against it, then it is rejected with a not-found error,
  never confirming the row's existence.

## Data model impact

None — `TestResults.status`/`values`/`date_completed` already existed on the
model; this is purely a new write path onto existing columns.

## Verification

Backend: 9 new unit tests (30 total in the domain). Full unit suite green,
`tsc`/`eslint` clean. Live schema introspection confirmed `recordTestResult`
genuinely served. Full integration suite (13 suites/516 tests) green,
including `matrix-coverage.int-spec.ts`'s existing `test-results` coverage —
unaffected by this same-domain addition. Frontend: 2 new tests, lint 0 new
warnings, build and `npm run size` green. See `TR273` for full detail.
