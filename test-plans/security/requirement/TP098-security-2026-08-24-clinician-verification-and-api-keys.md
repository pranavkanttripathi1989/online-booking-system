---
id: TP098
type: requirement
feature: security
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ015
related: [PLAN071]
---

# TP098 — Test plan: clinician verification + org-scoped API keys

Direct test-plan; suggestion stage skipped per `CLAUDE.md` step 4.

## Unit — `clinicians.service.spec.ts` (`updateVerification`)

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | An invalid status string | `updateVerification` | Rejected before touching Prisma |
| TC-02 | A cross-org clinician | `updateVerification` | Rejected `NotFoundException`, no write |
| TC-03 | Moving to `'verified'` | `updateVerification` | `verified_at`/`verified_by_user_id` stamped from the caller |
| TC-04 | Moving away from `'verified'` (e.g. `'rejected'`) | `updateVerification` | `verified_at`/`verified_by_user_id` cleared to `null` |

## Unit — `api-keys.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-05 | `create()` | | Stores a genuine bcrypt hash (verified via `bcrypt.compare`), never the raw key; the raw key is returned exactly once, prefixed with `key_prefix` |
| TC-06 | A cross-org key | `revoke` | Rejected, no write |
| TC-07 | A malformed presented key (no `prefix.key` shape) | `verify` | Returns `null` |
| TC-08 | No active key matches the presented prefix | `verify` | Returns `null` |
| TC-09 | A genuinely matching key | `verify` | Returns `{client_org_id}`; `last_used_at` updated |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-10 | New `api-keys` domain-case (`apiKeys`), fixture keys per org | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; role-gated to `manager`/`admin`/`super_admin` |

## Static / build + full-suite gates

| Case | Command | Expected |
|---|---|---|
| TC-11 | `npx tsc --noEmit` | Clean |
| TC-12 | `npx eslint` | 0 errors |
| TC-13 | `npm test` | All green |
| TC-14 | `npm run test:int` | All green |
