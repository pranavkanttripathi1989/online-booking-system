---
id: TP161
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN144
related: [REQ104]
---

# TP161 — Test plan: hook unit test coverage

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
straightforward unit tests for two already-built, well-understood hooks
with no ambiguous contract. Going straight to this approved test plan.

## Cases

See `REQ104`'s own acceptance criteria and `PLAN144`'s own case list —
14 cases total across `useInactivityLogout.test.js` (5 cases: warn at
15min, logout at 15min+60s and countdown stops, activity resets the
timer, `enabled:false` never fires, unmount clears timers/listeners) and
`usePagination.test.js` (9 cases: populate from a resolved result,
default fallback on missing `pageInfo`, rejected fetch doesn't throw,
debounced search, `nextPage`/`previousPage`/`goToPage` offset math,
`nextPage` no-op when `hasNextPage:false`, `currentPage`/`totalPages`
computation).
