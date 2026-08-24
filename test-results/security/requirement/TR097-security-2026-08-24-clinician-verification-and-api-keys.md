---
id: TR097
type: requirement
feature: security
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP098
related: [REQ015, PLAN071]
---

# TR097 — Results: clinician verification + org-scoped API keys

Executed 2026-08-24, consolidated verification pass (all 8 slices).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `rejects an invalid status value before touching Prisma` |
| TC-02 | pass | `rejects verifying a cross-org clinician` |
| TC-03 | pass | `stamps verified_at/verified_by_user_id when moving to verified` |
| TC-04 | pass | `clears verified_at/verified_by_user_id when moving away from verified` |
| TC-05 | pass | `create() stores a bcrypt hash, never the raw key, and returns the raw key exactly once`. **A test-authoring bug caught and fixed before merging**: the first draft asserted against a hand-picked literal `key_prefix` (`'mbk_abc'`) that didn't match what the service actually generates — fixed to echo the service's real generated prefix from a mock `create` implementation instead of a disconnected literal. |
| TC-06 | pass | `rejects revoking a cross-org key` |
| TC-07 | pass | `returns null for a malformed key` |
| TC-08 | pass | `returns null when no active key matches the presented prefix` |
| TC-09 | pass | `verifies a matching key and updates last_used_at, scoped to that key org` |
| TC-10 | pass | New `api-keys`/`apiKeys` domain-case — matrix + tenancy suites both green |
| TC-11 | pass | `npx tsc --noEmit` — clean |
| TC-12 | pass | `npx eslint` — 0 errors |
| TC-13 | pass | `npm test` — 73/73 suites, 1053/1053 tests |
| TC-14 | pass | `npm run test:int` — 4/4 suites, 315/315 tests |

## A real finding: `admin`-only gating made this domain's own tenant-isolation check unreachable

Identical root cause to `TR095`'s own account, found by the same review
pass across both new admin-gated domains (`webhooks`, `api-keys`) at once:
`isPlatformOperator()` treats every `admin`/`super_admin` caller as
platform-wide unconditionally, so an admin-only `@Auth()` gate made
`api-keys.service.ts`'s `isSameOrg()` cross-org rejection unreachable by
any caller who could actually call the mutation. The first draft of
`api-keys.service.spec.ts` used an `'admin'`-role test actor for the
cross-org `revoke` rejection test and it passed — for the wrong reason,
the same vacuous-pass shape `TR095` describes. Fixed by widening
`api-keys.resolver.ts`'s `@Auth()` to include `'manager'` and switching the
test actor to `'manager'`, with an inline comment recording why.

## Live verification (2026-08-24, follow-up)

The backend container recovered after a full Docker Desktop restart (see
`TR092`'s environment note). Live-tested against real data:

- `updateClinicianVerification` on the real reference clinician (Sarah
  Mitchell, `admin@medibook.dev`) — `verified` correctly stamped
  `verified_at`/`verified_by_user_id`; reverted to `unverified`
  afterward, since this clinician is a widely-referenced fixture across
  this codebase's own tests and dev sessions.
- `createApiKey` (`manager@medibook.dev`) — succeeded, the raw key
  returned exactly once, confirmed absent from the subsequent `apiKeys`
  list read.
