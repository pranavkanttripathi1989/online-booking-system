---
id: TECH001
type: technical-plan
feature: technical-plans
created: 2026-08-22
updated: 2026-08-23
status: active
parent: TECH000
related: [PP002, PP006, TECH005, TECH006]
---

# 00 — Phase F: Foundation hardening

**Duration estimate:** ~3.5 weeks (P0 ≈ 2 weeks, P1 ≈ 1.5 weeks)
**Blocks:** every phase below. Not optional sequencing advice — see README §"The one hard prerequisite".
**Source:** `project-plans/analysis/06-execution-plan.md` P0+P1, restated at implementation detail.

This phase fixes nothing the PRD asked for. It exists because the PRD asks for
~40 new tenant-scoped tables, and the current foundation would replicate three
known defects into every one of them.

## 1. Secrets and configuration (F-11 — partially done)

**Status re-verified 2026-08-23 against the real repo, not re-stated from
memory — this section was stale (unchanged since 2026-08-22 despite
`CLAUDE.md` separately declaring "Phase F COMPLETE"; that declaration is
correct for F-11's core fix, but three items below that were always in this
doc's own scope for item 1 were never actually done):**

`docker-compose.yml`'s `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` have no
guessable fallback (confirmed: `${JWT_ACCESS_SECRET}` with no `:-default`,
same for the refresh secret) — the core `BUG002` fix holds, and has been
exercised repeatedly this session (multiple `docker restart
medibook_backend` cycles, all booting clean with real logins succeeding).
Five previously-unset variables (`SETTINGS_ENCRYPTION_KEY`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `OTP_TTL_SECONDS`,
`OTP_MAX_ATTEMPTS`) pass through from a root `.env` as designed.

- [x] Recreate `medibook_backend` and verify a clean boot + a successful fresh login — re-confirmed 2026-08-23 as an incidental side effect of this session's `auth.resolver.ts` throttle-removal work (restart, then a real `login` mutation succeeded).
- [ ] **Still not done.** Rewrite the root `.env.example` for the Postgres/Nest stack — re-checked 2026-08-23, it still opens with `MYSQL_ROOT_PASSWORD`/`MYSQL_DATABASE`/`NGINX_PORT` etc., the abandoned pre-pivot stack verbatim. A fresh environment following this file today would misconfigure itself.
- [ ] **Still not done.** Delete the pre-pivot `Makefile` — confirmed still present at repo root. `CLAUDE.md` documents it as "stale... don't use it" rather than removing it; that's a workaround, not this item's DoD.
- [ ] **Still not done — F-33.** `docker-compose.yml`'s `POSTGRES_PASSWORD` still defaults to the published `medibook_secret` string in three places (`postgres`, and the test/e2e services use their own equally-guessable `medibook_test_secret`/`medibook_e2e_secret`). No `ALTER ROLE` + `DATABASE_URL` rotation has happened against the real dev database.

## 2. The tenant-scoping helper (F-01, F-04, F-05) — the keystone fix

Currently ~12 services independently implement
`user.client_org_id ? { client_org_id: user.client_org_id } : {}`. That ternary
means "an org-less caller sees everything", which was safe when only platform
admins had a null org — and stopped being safe when `@Public() register` began
minting org-less `patient` accounts on demand.

### New file: `backend/src/common/scoping/tenant-scope.ts`

```ts
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

// Platform-wide roles legitimately see across tenants. Everything else must be
// scoped. Deliberately an allow-list of role names, NOT the absence of an org —
// inferring privilege from a missing field is what F-01 actually was.
const PLATFORM_ROLES = ['admin', 'super_admin'] as const;

export function isPlatformOperator(user: JwtPayload): boolean {
  return user?.roles?.some((r) => (PLATFORM_ROLES as readonly string[]).includes(r)) ?? false;
}

// Sentinel that cannot match any real uuid — fails closed for a non-operator
// with no org, rather than degrading to an unscoped query.
const NO_ORG = '__no_org__';

/** Direct-column scoping: the model has its own client_org_id. */
export function orgScope(user: JwtPayload, column = 'client_org_id') {
  if (isPlatformOperator(user)) return {};
  return { [column]: user?.client_org_id ?? NO_ORG };
}

/** Relation scoping: the model reaches its org through a relation (e.g. clinic). */
export function orgScopeVia(user: JwtPayload, relation: string, column = 'client_org_id') {
  if (isPlatformOperator(user)) return {};
  return { [relation]: { [column]: user?.client_org_id ?? NO_ORG } };
}

/** Write-path ownership assertion. Throws NotFound (never Forbidden — don't confirm existence). */
export async function assertOwned<T extends { client_org_id: string | null }>(
  user: JwtPayload,
  record: T | null,
  entityLabel: string,
): Promise<T> {
  if (!record) throw new NotFoundException(`${entityLabel} not found`);
  if (isPlatformOperator(user)) return record;
  if (record.client_org_id !== user?.client_org_id) {
    throw new NotFoundException(`${entityLabel} not found`);
  }
  return record;
}
```

### Migration approach

Do **not** attempt all ~12 call sites in one commit. Per domain:

1. Replace the inline ternary with `orgScope(user)` / `orgScopeVia(user, 'clinic')`.
2. Add a spec case asserting a non-operator with `client_org_id: null` gets the sentinel filter, not `{}`.
3. Add `@Auth()` to catalogue queries no anonymous/patient caller needs (`clinics`, `rooms`, `services`, `products`, `clinicians`, `languages`, `roomTypes`, `clinicianTypes`).
4. Commit. Next domain.

**Order:** the leaked domains first (`clinics`, `rooms`, `services`, `products`,
`clinicians`, `lookups`, `languages`), then the rest.

### Also in this workstream

- `createPatient` gains `@CurrentUser()` + org stamping (F-04). Requires `Patients.client_org_id`, backfilled from appointment history exactly as `BUG001` did for `Products` — see `04-data-model-evolution.md` §2.1.
- `Patient.appointments` resolve-field gains `@CurrentUser()` and the same scoping the top-level query uses (F-05).
- `users.service.ts`: `is_system` guard on `updateRolePermissions`, permission-id validation, `@CurrentUser()` threaded through `updateUser`/`updateRole`/`deleteRole`/`getAuditLogs` (F-06).
- `createRazorpayOrder` gains authentication + ownership check (F-07).

## 3. The index migration (F-13) — ✅ DONE 2026-08-22

`grep -c "@@index" schema.prisma` → **0**, across 41 models. PostgreSQL does not
auto-index foreign-key columns.

**Delivered:** `20260822130000_add_indexes`, 69 indexes across 30 of 41 models
(`BUG005` / `PLAN027` / `TR053`). Measured on a scratch database at 50,000
appointments: the clinician-schedule query went from a sequential scan with a
`top-N heapsort` and 2,755 buffer hits, to an index scan with no sort and 34.

The two results worth carrying forward, because they contradict the obvious
approach and apply to all ~40 new tenant-scoped tables:

- **Don't lead a composite index with `client_org_id`, or index it alone.** The
  tenant predicate matches ~20% of rows; a sequential scan is genuinely optimal
  and the planner ignores the index. Lead with the selective column.
- **Don't blanket-index every foreign key** — that yields ~120 indexes here
  instead of 69, most unused, all costing write amplification forever.

**Sequencing note (recorded because the original advice here was wrong):** this
said to land the migration *before* seeding so the "before" plan is measurable.
In practice the better method is the opposite — seed first, then produce "before"
by setting `enable_indexscan` / `enable_bitmapscan` / `enable_indexonlyscan` to
`off` on the *same* data. That holds volume and distribution constant so index
availability is the only variable, and it means the before/after can be re-run at
any time instead of only once at a migration boundary.

## 4. Integration-test harness + tenancy matrix (F-25) — highest leverage item

**Status: ✅ done.** Harness landed 2026-08-22 (`BUG007`) — real PostgreSQL
(`postgres_test`, port 5433), `supertest` against the real `AppModule`, the
deterministic two-org fixture described below. The matrix itself closed
2026-08-23 (`BUG012`): all 21 tenant-scoped domains classified (covered or
EXEMPT with a stated reason), `KNOWN_GAPS` is `[]`, and
`matrix-coverage.int-spec.ts` fails the build if a new resolver domain is
added without a matrix row — exactly the "otherwise it rots" requirement
below. Three real, previously-unknown cross-tenant/self-scoping bugs were
found and fixed while writing the remaining rows (`availability`/`blocks`
resolvers) — see `BUG012`'s own doc for detail. The booking-concurrency
subsection below is unaffected by this closure — still open, tracked as its
own item.

The existing 602 tests all mock `PrismaService` and assert the shape of the
`where` object. That design cannot fail an isolation test, which is precisely why
F-01 was live while the suite was green.

### Setup

- Real PostgreSQL for tests: Testcontainers, or a dedicated `postgres_test` compose service on a separate port/volume.
- `prisma migrate deploy` against it in global setup.
- A deterministic two-org fixture: Org A and Org B, each with a clinic, clinician, patient, appointment, service, room; plus one platform admin and one self-registered org-less patient.
- `supertest` against the Nest app for real GraphQL requests (no `supertest` dependency exists today — new).

### The matrix

Table-driven over every domain × caller archetype. One parameterised test so a
new domain is one row, not a new suite:

| Caller | Own-org read | Other-org read | Other-org write |
|---|---|---|---|
| `super_admin` (null org) | all | all | allowed |
| `admin` (null org) | all | all | allowed |
| `manager` (org A) | A only | empty / `FORBIDDEN` | rejected |
| `clinician` (org A) | own schedule | empty | rejected |
| `staff` (org A) | A only | empty | rejected |
| `patient` (org A, linked) | own records only | empty | rejected |
| **`patient` (null org, self-registered)** | **empty** | **empty** | **rejected** |
| unauthenticated | `UNAUTHENTICATED` except `@Public()` | — | — |

The bolded row is the one that fails today. Make CI fail when a domain has no
matrix row — otherwise it rots.

### Booking-concurrency test

Fire N concurrent `createAppointment` calls at one slot; assert exactly one
succeeds. **Expected to fail until Phase 1 §3.3 adds the exclusion constraint** —
write it now, as that constraint's acceptance criterion.

## 5. Frontend auth bypass (F-02)

**Status: ✅ done (`BUG003`, 2026-08-22).** `MOCK_USERS`, the `mock_` token
branch, `MOCK_OTP`, and `login-legacy.jsx` were all deleted rather than
hardened, matching this section's own prescription below exactly. A failed
`ME_QUERY` now logs out instead of falling back to the cached user — see
`context/security-2026-08-22-f02/manifest.md`.

Remediation is deletion, not hardening:

- `AuthContext.jsx`: delete the `token.startsWith('mock_')` branch in `getInitialState()`; on `ME_QUERY` error, **log out** instead of falling back to the cached user; delete the `MOCK_USERS` export.
- `login.jsx`: delete the `MOCK_USERS` offline fallback (accepts `"password"`/`"demo"` universally) and `MOCK_OTP = '123456'`; wire the OTP path to the real `requestOtp`/`verifyOtp` resolvers, which already exist.
- Gate `DEMO_ACCOUNTS` chips behind `import.meta.env.DEV`. Playwright runs against the dev server, so `e2e/helpers.js`'s `loginAs()` keeps working unchanged — verify this rather than assuming.
- `login-legacy.jsx` also imports `MOCK_USERS` — it is routed at `/login-legacy`. Either delete the route and the file, or fix it identically. Don't leave a second bypass behind a less-obvious URL.

New frontend unit tests (there is currently **1 suite, 4 tests** in the whole
frontend): `AuthContext` rejects a `mock_` token, logs out on `ME_QUERY` failure,
and cannot be granted a role by a forged cached user.

## 6. CI (F-26)

**Status: ✅ done (`BUG008`, 2026-08-22)**, with one standing caveat that
does not block this item's own DoD but matters for how much to trust it:
`.github/workflows/ci.yml` has never executed on GitHub — every command in
it has only been run locally. F-29 (Jest OOM/worker-exit) and F-22 (frontend
lint script) are both fixed — see their own notes below. The structural
data-wiring gate (last paragraph of this section) is also done —
`scripts/check-page-data-wiring.mjs`, wired into the CI workflow's
structural-gates job (confirmed 2026-08-23 during a `project-plans/06`
P2/P3 audit).

No `.github/workflows` exists. One required workflow:

```
lint-backend      : npx eslint "src/**/*.ts"          # currently clean
typecheck-backend : npx tsc --noEmit
test-backend      : npx jest --ci                      # needs F-29 fixed first
schema            : npx prisma validate && npx prisma migrate deploy   # against a PG service
integration       : the tenancy matrix (§4)
lint-frontend     : npx eslint .                       # needs F-22 fixed first
test-frontend     : npx jest --coverage                # with real collectCoverageFrom
e2e               : npx playwright test                # composed stack, seeded DB
```

Two prerequisites inside this phase — **both ✅ done (`BUG008`)**:

- **F-29**: fixed — `npm test` (default workers) still OOM-kills on this host (exit 137, a host-resource-contention issue, not a code leak), but `npx jest --maxWorkers=2` is confirmed the reliable invocation (645 tests / 50 suites, ~130s) and is what CI actually runs.
- **F-22**: fixed — lint script corrected, `eslint-plugin-react` added to the flat config, and the real underlying errors resolved; `frontend/package.json`'s lint script now runs with an explicit `--max-warnings 177` ratchet (177, down from 197 pre-`BUG009`) rather than failing outright on the pre-existing warning backlog.

Add one structural gate that grep-based audits structurally cannot do: **fail if
a file under `frontend/src/pages` renders a list/detail view with no GraphQL
operation reference.** Ten lines of script; it is what would have caught the 14
fabricated-data pages (F-18).

## Phase F Definition of Done

**Overall: the security/testing core is done; three secondary hygiene items
from §1 are not (see that section) — "Phase F COMPLETE" in `CLAUDE.md`
refers to the six numbered findings (F-11/F-02/F-01/F-13/F-25/F-26), all of
which are genuinely closed. It does not mean every checkbox this document
itself lists.**

- ✅ A self-registered org-less account provably reads nothing outside its scope — asserted by the tenancy matrix (`BUG012`), not by inspection.
- ✅ No `mock_`-token path exists in the frontend bundle (`BUG003`).
- ✅ `EXPLAIN ANALYZE` on the core appointment query shows an index scan (`TR053`, TC-09: Index Scan Backward, buffers 2755 → 34).
- ✅ CI is required on the default branch and green **locally** (`BUG008`) — not yet proven on GitHub itself; the first push will be its first real remote run.
- ✅ The booking-concurrency test exists and its failure is recorded as Phase 1's/P3's acceptance criterion (`booking-concurrency.int-spec.ts`, still deliberately `it.failing` — see `06-execution-plan.md` P3.1).
- ✅ `docker compose up` without a root `.env` fails loudly rather than booting with a known key (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` have no fallback) — **but** the Postgres password still defaults to a known, published string (`medibook_secret`/`medibook_test_secret`/`medibook_e2e_secret`), which this same phase's own §1 flags as F-33, still open.
