---
id: CTX-platform-nfr-2026-08-22-f25
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: BUG007
related: [F-25, F-01, BUG006, REQ035, REQ015]
---

# platform-nfr — F-25, integration harness and tenancy matrix (2026-08-22)

Spans two feature slugs because one slice closed both: the harness gap
(`platform-nfr`) and the leaks it found (`security`).

## Documents

| Root | ID | Feature | Doc |
|---|---|---|---|
| requirements | BUG007 | platform-nfr | [no-integration-tests](../../requirements/platform-nfr/bug/BUG007-platform-nfr-2026-08-22-no-integration-tests-tenancy-proven-against-a-mock.md) |
| requirements | BUG006 | security | [org-less caller leaks](../../requirements/security/bug/BUG006-security-2026-08-22-org-less-caller-leaks-in-nine-services.md) |
| implementation-plans | PLAN028 | platform-nfr | [harness and matrix](../../implementation-plans/platform-nfr/bug/PLAN028-platform-nfr-2026-08-22-integration-harness-and-tenancy-matrix.md) |
| test-plans | TP055 | platform-nfr | [matrix verification](../../test-plans/platform-nfr/bug/TP055-platform-nfr-2026-08-22-tenancy-matrix-verification.md) |
| test-results | TR054 | platform-nfr | [matrix results](../../test-results/platform-nfr/bug/TR054-platform-nfr-2026-08-22-tenancy-matrix-verification.md) |
| test-suggestions | — | — | skipped — verification method fully prescribed by `00-foundation-hardening.md` §4 |

## What changed in the code

| File | Change |
|---|---|
| `docker-compose.yml` | `postgres_test` (5433, tmpfs, `profiles: ["test"]`) |
| `backend/jest.integration.config.js` | second Jest project; `npm run test:int` |
| `backend/test/integration/**` | harness (env, global-setup, fixture, actors, app), the matrix, the coverage gate, the concurrency probe |
| `backend/src/common/scoping/tenant-scope.ts` | **new** `orgIdForWrite()` — the missing write-path counterpart |
| 12 services | migrated onto `orgScope`/`orgScopeVia`/`orgIdForWrite` |
| 3 unit specs | rewritten — they had asserted `client_org_id: undefined`, i.e. the bug |

## Outcome

Two live cross-tenant leaks found and closed, both reachable by an account
anyone can self-register: the full platform user directory
(`messageableContacts`) and lab results across tenants (`testResult(id)`). Ten
further instances of the same pattern fixed while latent.

Matrix: 2 failed → 0. Unit: 645/645. Integration: 120/120.

## What this does not do

- **No CI** — the last Phase F item. Nothing runs the matrix on the default
  branch. Blocked behind F-29 (open handle; the suite needs `--forceExit`) and
  F-22 (frontend lint exits 1).
- **10 of 22 tenant-scoped domains uncovered**, declared in a frozen
  `KNOWN_GAPS` list rather than silently absent.
- The ten latent BUG006 fixes are **not** matrix-proven — their role gates make
  them unreachable by the only org-less archetype that exists.
- `messages` and `test-results` still carry **no `@Auth()` at all**. Scoping is
  fixed; role-gating is a separate open question.

## Sequence

F-25 was the first of the two remaining Phase F items
(`technical-plans/00-foundation-hardening.md`), after F-11/`BUG002`,
F-02/`BUG003`, F-01/`BUG004` and F-13/`BUG005`. Only F-26 (CI) remains.
