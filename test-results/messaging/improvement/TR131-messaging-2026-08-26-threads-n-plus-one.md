---
id: TR131
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP132
related: [REQ074, PLAN105]
---

# TR131 — Results for the `threads()` N+1 fix (F-15)

Executed 2026-08-25/26 against `medibook_backend`/`medibook_postgres` on
`master`, as part of a 10-finding pick-up from
`project-plans/analysis/02-findings-register.md`.

## Unit

`messages.service.spec.ts`: 43/43 pass (1 new). Full backend suite:
84/84 suites, 1317/1317 tests. Integration: 4/4 suites, 369/369 tests.
`eslint`/`tsc --noEmit`: clean.

## Live verification

`threads` query as `manager@medibook.dev` (2 real threads) — returned
correct `last_message`, `unread_count`, and `participants` for both,
confirming the batched path produces the same output as before.

## Commits

See the commits immediately following this test-results doc in `git log`.
