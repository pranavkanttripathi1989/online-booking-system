---
id: TR179
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP179
related: []
---

# TR179 — Test results: hybrid-mode walk-in interleaving

All 11 `TP179` cases pass.

`npx jest src/common/scheduling --maxWorkers=2`: 8/8 tests pass.
`npx jest src/queue --maxWorkers=2`: 42/42 tests pass (3 new for
interleaving).
`npx jest src/availability --maxWorkers=2`: 31/31 tests pass, unaffected.

Full backend unit suite: 92/92 suites, 1464/1464 tests. Integration
suite: 4/4 suites, 387/387 tests — a first run showed one failure in
`tenancy.int-spec.ts` referencing `rightsRequestA`/`rightsRequestB`
(`domain-cases.ts:375`), a file confirmed under active, uncommitted
edit by a concurrent session on this machine (`git status` shows it
modified, unrelated to anything this slice touched). An immediate clean
re-run passed 387/387 with no changes on this session's side, confirming
it was a transient collision with the other session's concurrent write,
not a regression from this slice.

`tsc --noEmit`/`eslint` clean on backend. `eslint` clean on
`frontend/src/pages/manager/Availability.jsx` (one pre-existing,
unrelated `Divider` unused-import warning) and
`frontend/src/pages/queue/index.jsx` (clean).

## No dedicated frontend test

No pre-existing `.test.jsx` file exists for `manager/Availability.jsx`;
the new form field was verified by lint + manual read against the
GraphQL contract, matching the precedent this batch already established
for `pages/queue/index.jsx`.

## Live verification

Not performed against the real dev stack — the shared `medibook_backend`
container remains mid-flight on unrelated, uncommitted concurrent work
(same noted blocker as `REQ116`/`REQ117`/`REQ118`).
