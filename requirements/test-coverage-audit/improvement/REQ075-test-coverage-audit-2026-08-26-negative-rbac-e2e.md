---
id: REQ075
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# REQ075 — Negative-RBAC e2e coverage

## Source

`project-plans/02-findings-register.md` F-27, part of a 10-finding
pick-up. Scoped to just the two scenarios the finding's own text names —
general e2e cleanup hygiene across the existing ~30 specs is separate,
much larger churn, deliberately out of scope here.

## The gap

218 e2e assertions existed as of the original audit, 73% of them
`toBeVisible` — no spec proved a caller **without** a role was actually
rejected, only that a caller **with** one saw the right content. A
regression that accidentally widened a role gate (or removed one) had
no test that would catch it.

## What shipped

New `frontend/e2e/rbac-negative.spec.js`, two scenarios:

1. A `patient@medibook.dev` session hitting `/admin/users` and
   `/admin/roles` gets the app's own `Forbidden403` page, not the page
   content underneath.
2. A `manager@medibook.dev` (real org) attempting to read a real
   `Patients` row belonging to a **different** real org (via the real
   `patient(id)` query, not a page click — chosen deliberately to keep
   the assertion about the backend's own tenant boundary, not entangled
   with `patients/detail.jsx`'s own separate, already-documented partial
   mock-data state on unrelated tabs) gets `null`, not the record.

## A real bug found in the spec's own fixture helper, not the product

`psql -t -A` on an `INSERT ... RETURNING id` prints the id **and** a
second `INSERT 0 1` status line. The shared `psql()` helper's own
`.trim()` only strips leading/trailing whitespace, not that second line
— so the captured "id" was actually a two-line string. The cross-org
GraphQL query and the cleanup `DELETE` both silently used this malformed
value: the query still happened to return `null` (a garbage id matches
nothing either), so the assertion passed without proving what it
claimed, and the `DELETE` in the `finally` block silently failed to
match the real row, leaving residue. Fixed by taking the first line of
`psql()`'s output explicitly. Re-verified after the fix: the test still
passes, and a direct DB check now confirms the fixture row is gone.

## Acceptance criteria (Given/When/Then)

- **Given** a patient session, **when** it navigates to an admin-only
  route, **then** it sees `Forbidden403`, never the page content.
- **Given** a manager in org A, **when** they query a real patient
  belonging to org B by id, **then** the response is `null`.

## Traceability

`project-plans/02-findings-register.md` F-27.
