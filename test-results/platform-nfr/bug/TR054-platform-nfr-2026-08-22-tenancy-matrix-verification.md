---
id: TR054
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: pass
parent: TP055
related: [BUG006, BUG007, PLAN028, F-25, F-01]
---

# TR054 — Integration harness and tenancy matrix results

Executed 2026-08-22 on the host (Node v24.19.0) against `medibook_postgres_test`
(compose service, port 5433) and `medibook_redis`.

## Harness integrity

| Case | Result | Evidence |
|---|---|---|
| TC-01 test DB isolated | **pass** | `migrate deploy` applied all migrations to `medibook_test`; dev `medibook_db` untouched |
| TC-02 dev-URL guard | **pass** | `env.ts` throws on a `5432`/`medibook_db` URL before connecting |
| TC-03 **the matrix can fail** | **pass** | see "Before the fix" — 2 real failures, each naming the leaked row id |
| TC-04 real guard chain | **pass** | unauthenticated → `UNAUTHENTICATED` from the real `GqlAuthGuard` |
| TC-05 real database | **pass** | `clientOrganizations.count()` = 2, read back through Prisma |
| TC-06 unit config unaffected | **pass** | 50 suites / 645 tests still discovered from `src/` |

## Before the fix — the matrix reporting real leaks

First trustworthy run (after correcting four of my own test bugs, below):
**2 failed, 113 passed.** Both failures are genuine cross-tenant disclosure,
reproduced over real HTTP against real PostgreSQL:

```
● tenancy matrix › messages: messageableContacts
    › patient (self-registered — NO org, NO patient link) -> empty

  Expected value: not "00000000-0000-4000-8000-000000000u04"
  Received array: ["…u01","…u02","…u03","…u04","…u05","…u06","…u07"]
```

All seven fixture users, spanning both tenants — the entire platform directory.

```
● tenancy matrix › single-record cross-tenant reads
    › test-results: testResult(id) with NULL patient_id,
      read by a self-registered account is not readable

  expect(received).toBeFalsy()
  Received: {"id": "00000000-0000-4000-8000-000000000b12"}
```

`…b12` is org B's free-text lab result, returned to an account with no
relationship to org B whatsoever.

### The four failures that were mine, not the code's

Recorded because they are the reason the first run's 6 failures cannot be quoted
as "6 leaks", and because three of them are traps a future matrix row will hit:

| Failure | Cause |
|---|---|
| `patients` × 2 | I declared `patient` an inadmissible role. The `patients` query is deliberately ungated and narrows a patient caller via `selfScope()` instead. Expectation wrong, code right. |
| `messageableContacts` × 1 (clinicianA) | The assertion target was the caller. That read excludes self, so a legitimate absence read as a leak. |
| `messageableContacts` × 1 (managerB) | Org B had exactly one user, so an empty list was correct. Fixture gap. |

Fixed by adding non-actor members to both orgs and correcting the role
expectation. **Only then** was the run used as evidence.

## After the fix

| Case | Result | Evidence |
|---|---|---|
| TC-07 platform operator sees both orgs | **pass** | `admin` and `super_admin` across all 12 domain reads |
| TC-08 org-A caller: own only | **pass** | contains A, **does not contain** B |
| TC-09 org-B caller: own only | **pass** | mirror |
| TC-10 **self-registered, org-less: nothing** | **pass** | neither org's ids, all 12 domains |
| TC-11 unauthenticated | **pass** | `UNAUTHENTICATED` |
| TC-12 wrong role | **pass** | `FORBIDDEN` |
| TC-13 cross-tenant read by id | **pass** | 5 cases, all falsy |
| TC-14 cross-tenant write | **pass** | rejected **and** absent from the database |
| TC-15 coverage classification | **pass** | no unclassified domain |
| TC-16 `KNOWN_GAPS` exact | **pass** | 10 declared, matches exactly |
| TC-17 booking concurrency | **pass as specified** | `it.failing` — double-booking still possible; see below |
| TC-18 unit suite | **pass** | **645/645, 50 suites** |
| TC-19 sentinel regressions | **pass** | `'__no_org__'` / `'__no_patient_link__'` asserted present, not absent |
| TC-20 eslint | **pass** | exit 0 |
| TC-21 `tsc --noEmit` | **pass** | exit 0 — `isolatedModules` is not masking type errors |

```
Test Suites: 3 passed, 3 total
Tests:       120 passed, 120 total
Time:        116.89 s
```

### TC-17 is a green result recording a real defect

`booking-concurrency.int-spec.ts` fires 5 simultaneous `createAppointment` calls
at one slot. All five currently succeed — availability is checked and the row
inserted in separate statements, so every request passes the check before any
writes. Written as `it.failing` exactly as
`00-foundation-hardening.md` §4 directs, so the suite is green while the defect
exists and **turns red when the behaviour becomes correct**, forcing whoever adds
Phase 1 §3.3's exclusion constraint to come here and acknowledge it.

## Caveats stated rather than buried

- **The ten latent BUG006 instances are fixed but not matrix-proven.** Their role
  gates make them unreachable by the only org-less archetype that exists today.
  The matrix reports current exposure accurately; it does not, and should not be
  read to, vouch for those ten.
- **Coverage is 12 of 22 tenant-scoped domains.** The other ten are declared in
  `KNOWN_GAPS` and asserted by exact equality, so the debt is visible and cannot
  grow silently. It is still debt.
- **`--forceExit` is required.** Something holds a handle after teardown
  (`Cannot log after tests are done`). Cosmetic here, blocking for CI — same
  family as F-29, and it must be fixed before F-26.
- **`account` and `staff` unit suites failed on the first full run** and passed
  in isolation. bcrypt at the app's cost factor times out under `--maxWorkers=2`
  contention on this host. Not caused by this change, but it makes a bare full
  run unreliable to read, and it will matter for CI.
- **Wall-clock is indicative.** ~117s for the integration suite on a loaded dev
  machine, single worker by design.
