---
id: TR129
type: bug
feature: security
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP130
related: [BUG026, PLAN103]
---

# TR129 — Results for the role/permission mutation guards (F-06)

Executed 2026-08-25/26 against `medibook_backend`/`medibook_postgres` on
`master`, as part of a 10-finding pick-up from
`project-plans/02-findings-register.md`.

## Unit

`users.service.spec.ts`: 30/30 pass (6 new). `users.resolver.spec.ts`:
25/25 pass (unchanged, resolver signature change didn't affect its own
tests). Full backend suite: 84/84 suites, 1317/1317 tests (one flaky,
pre-existing `account.service.spec.ts` failure under full-parallel
contention, confirmed passing 30/30 in isolation, not a regression).
Integration: 4/4 suites, 369/369 tests. `eslint`: 0 errors.
`tsc --noEmit`: clean.

## Live verification

`updateRolePermissions` on the real seeded `admin` role (`is_system:
true`) — rejected with "System roles cannot have their permissions
changed"; the role's real permission set confirmed unchanged via direct
DB check. Same mutation against a real non-system custom role with a
nonexistent permission id — rejected with "One or more permission ids do
not exist", no partial write. Same mutation with a real permission id —
succeeded.

## Commits

See the commits immediately following this test-results doc in `git log`.
