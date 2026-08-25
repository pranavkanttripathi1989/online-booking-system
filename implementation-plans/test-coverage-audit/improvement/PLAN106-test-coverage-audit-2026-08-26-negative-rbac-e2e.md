---
id: PLAN106
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ075
related: []
---

# PLAN106 — Implementation plan for negative-RBAC e2e coverage (F-27)

New file only: `frontend/e2e/rbac-negative.spec.js`. Reuses
`loginAs()`/`helpers.js` and the `psql()`/`gql()` fixture pattern already
established in `gap-analysis-a4-a9.spec.js`. `test.describe.configure({
mode: 'serial' })` — same convention as that spec, needed after an
initial flaky run (see `TR132`'s own account) that resolved once tests
in this file stopped potentially racing each other.

## Changes

- Scenario 1: `loginAs(page, 'Patient')`, `page.goto('/admin/users')` /
  `/admin/roles`, assert `Forbidden403`'s own rendered text ("403",
  "Access Forbidden").
- Scenario 2: looks up a real second org id (`ClientOrganizations` where
  id != the seeded org with real data), inserts a throwaway `Patients`
  row directly via SQL (no UI/mutation path creates a patient in an
  arbitrary org), logs in as `manager@medibook.dev` via a raw `login`
  mutation call (not a page login — this scenario is API-level by
  design), queries `patient(id)`, asserts `null`, deletes the fixture
  row in a `finally` block.

## Testing (see `TP133`)

The spec itself is the test — no separate unit coverage needed for a
Playwright e2e spec. Fixed a real bug in the spec's own `psql()`-result
handling before it could be trusted (see `REQ075`'s own account).

## Live verification

All 3 scenarios run against the real dev stack, 3/3 passing, confirmed
zero residue left in the database afterward via a direct SQL check.
