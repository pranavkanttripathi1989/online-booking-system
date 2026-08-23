---
id: BUG020
type: bug
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: open
parent: REQ018
related: [BUG019]
---

# BUG020 — `manager-appointments.spec.js`'s "No Show" filter test assumes zero real no-show appointments exist, which breaks at realistic volume

Found while verifying `BUG019`'s fix against the isolated e2e stack's
2,000-appointment realistic dataset — a real test-fragility defect,
separate from `BUG019` itself.

## Symptom

`manager-appointments.spec.js`'s "a real filter with zero matches shows a
real empty state, not fabricated mock rows" test filters the appointments
list to `status: No Show` and asserts `.MuiDataGrid-row` count is `0`. This
assumption held against the shared dev stack's ~4 hand-created appointments
(none happened to be `no_show`), but at realistic volume the isolated
stack's ~2,000-row seed genuinely includes no-show appointments as part of
a realistic status distribution — the assertion consistently receives `20`
(a full page) instead of `0`.

## Root cause

The test's own assumption ("zero real no_show appointments exist for this
org") was only ever true by accident of the shared dev stack's tiny,
hand-curated dataset. It was never a property the application guarantees,
and a realistic seed correctly includes no-show appointments — the
resolver, the filter, and the UI are all behaving correctly here; only the
test's premise is stale.

## Why not fixed in this pass

Discovered incidentally while verifying an unrelated fix (`BUG019`'s
date-window wiring); fixing the test properly means picking a status this
specific org's isolated-stack seed genuinely has zero of (auditing
`seed-e2e.ts`'s status distribution) or restructuring the assertion to
filter by a combination guaranteed empty (e.g. a fictitious clinician id),
which is its own small piece of test-design work deserving its own look
rather than a guess bolted onto this pass.

## Verification

Reproduced live and repeatedly against the isolated stack's realistic
dataset (`docker exec medibook_postgres_e2e psql ...` confirms real
`no_show` rows exist for this org); not reproducible against the shared
dev stack's small dataset. No fix implemented; status remains `open`.
