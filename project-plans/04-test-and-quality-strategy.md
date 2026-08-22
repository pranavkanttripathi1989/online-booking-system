---
id: PP004
type: analysis
feature: project-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: PP000
related: [PP001, PP002, PP006]
---

# 04 — Test and quality strategy

## 1. Measured state

Everything in this table was executed in this session, not read from a document.

| Layer | Measured | Verdict |
|---|---|---|
| Backend unit | 49 suites, **602 tests**, all pass, 140s (host) | Broad by domain, shallow by depth, and structurally unable to test isolation |
| Backend integration / API | **0** — no `supertest`, no test database | Missing; this is where the real bugs live |
| Frontend unit | 1 suite, **4 tests**, one 51-line component | Effectively absent |
| Playwright e2e | 31 files, **66 tests, 218 assertions** (160, or 73%, `toBeVisible`) | Good smoke coverage, thin verification |
| Backend lint | clean | Good |
| Frontend lint | **`npm run lint` exits 1** — broken script; real run shows 12 errors under 2,880 spurious warnings | Broken control |
| Typecheck in CI | none | Missing |
| CI | none | Missing |

Domain-by-domain backend test depth (test cases per spec) shows where the risk
concentrates:

```
auth 35   products 33   users 30   account 30   rooms 24   org-settings 22
appointment-payments 22   staff 20   organizations 20   services 15
cancellation-rules 15   appointments 14   reviews 13   messages 13
languages 13   clinics 12   availability 12   dashboard 11   lookups 10
patients 8    analytics 8   public 7    blocks 4    test-results 4
clinicians 3
```

`appointments` — the core domain, a 368-line service holding slot conflict
detection, status transitions, and notification dispatch — has 14 tests.
`clinicians` has 3. `blocks` has 4. `patients`, the most PHI-sensitive domain,
has 8. Meanwhile `products` has 33 because a real IDOR was found there and
properly regression-tested. That pattern is telling: coverage tracks *where bugs
were already found*, not where risk is highest.

## 2. Why 602 green tests coexist with a live cross-tenant read

This is the most important thing in this document.

Every backend spec replaces `PrismaService` with a `jest.fn()` mock and asserts
the shape of the `where` object passed to it. For example, from
`patients.service.spec.ts`:

```ts
await service.findAll(undefined, 20, 1, patientUser);
const where = prisma.patients.findMany.mock.calls[0][0].where;
expect(where.id).toBe('pat-1');
```

That is a genuinely useful regression test for the self-scoping fix. But note
what it can and cannot establish. It proves *this service asked Prisma for a
filter of this shape*. It cannot prove *PostgreSQL returns only this tenant's
rows*, because there is no PostgreSQL in the run.

So a filter that is *correctly shaped but semantically wrong* passes. `F-01` is
exactly that: `{}` is a perfectly well-formed filter, and every test that asserts
"an org-less caller gets no org filter" passes — the tests assert the buggy
behaviour as intended behaviour, because from inside the mock there is no way to
see that `{}` means "all tenants".

The corollary: **no amount of additional unit testing will find this bug class.**
It requires a real database with more than one tenant in it.

## 3. Target test pyramid

```
                    ┌──────────────────────────────┐
   e2e (Playwright) │  ~40 flows, value assertions │  keep + deepen
                    │  incl. negative RBAC         │
                    ├──────────────────────────────┤
   API integration  │  tenancy matrix: role ×      │  ★ BUILD THIS FIRST
   (supertest + PG) │  domain × own/other org      │
                    │  + booking concurrency       │
                    ├──────────────────────────────┤
   unit (backend)   │  602 → deepen appointments,  │  keep, redistribute
                    │  clinicians, blocks, patients│
                    ├──────────────────────────────┤
   unit (frontend)  │  guards, forms, formatters,  │  ★ NEARLY ABSENT
                    │  AuthContext, wizard steps   │
                    └──────────────────────────────┘
```

### 3.1 The tenancy matrix (highest leverage item in this plan)

One integration suite, a real PostgreSQL (Testcontainers or a dedicated compose
service), `prisma migrate deploy`, and a fixture with **two organisations** each
holding a clinic, clinician, patient, appointment, service, and room — plus one
platform admin and one self-registered org-less patient.

Then, table-driven, for every domain:

| Caller | Own-org read | Other-org read | Other-org write |
|---|---|---|---|
| `super_admin` (null org) | all | all | allowed |
| `admin` (null org) | all | all | allowed |
| `manager` (org A) | A only | empty / `FORBIDDEN` | rejected |
| `clinician` (org A) | own schedule | empty | rejected |
| `staff` (org A) | A only | empty | rejected |
| `patient` (org A, linked) | own records only | empty | rejected |
| `patient` (null org, self-registered) | **empty** | **empty** | rejected |
| unauthenticated | `UNAUTHENTICATED` except `@Public()` | — | — |

The last row-but-one is the one that fails today. Write it as a single
parameterised test over the domain list so a new domain is one line, not a new
suite — otherwise it will rot.

This suite would have caught `F-01`, `F-04`, `F-05`, and `F-08` in a single run,
and it is the only artefact that makes the tenancy property *continuously* true
rather than true-as-of-the-last-manual-audit.

### 3.2 Booking concurrency

A dedicated test that fires N concurrent `createAppointment` calls at the same
slot and asserts exactly one succeeds. This will fail today (`F-16`) and should
be written *before* the exclusion constraint, as the constraint's acceptance
criterion.

### 3.3 Frontend units worth having

Ranked by risk, not by ease:

1. `AuthContext` — after `F-02`: assert a `mock_` token is rejected, assert a
   `ME_QUERY` failure logs out, assert a forged cached user cannot grant a role.
2. `ProtectedRoute` / `RoleGuard` — allow, deny, loading.
3. Booking wizard step validation — the multi-step form with the most branches.
4. `utils/dateTime.js` / `dateUtils.js` — currency (paise→rupee) and date
   formatting, the two things that silently corrupt data everywhere.
5. Each zod schema in the form pages — cheap, and they encode business rules.

### 3.4 E2E deepening

Keep the 31 specs; they earned their place by finding real bugs. Add:

- **Negative RBAC**: a patient navigating to `/admin/*` and `/manager/*`; a
  manager opening another org's record by id.
- **Value assertions** rather than `toBeVisible` on the flows that matter —
  booking, payment, cancellation, availability.
- **Cleanup**: `afterEach` teardown or a per-run unique tenant. The two
  documented false failures (the `₹50.00` page-wide locator; `admin@` falling off
  page 1 as the user count grew) were both caused by accumulated state, and both
  will recur in a different form otherwise.
- **A seeded dataset** (`F-28`): the dev DB currently holds 4 appointments and 4
  patients, so most specs prove empty-state rendering. Two orgs, ~5 clinicians,
  ~200 patients, ~2,000 appointments across a date range makes pagination,
  filtering, and performance testable at all.

## 4. CI pipeline

Nothing else in this document is enforceable without this. One workflow,
required on the default branch:

```
lint-backend      : eslint src/**/*.ts
typecheck-backend : tsc --noEmit
test-backend      : jest --ci  (needs F-29 fixed, or it hangs)
schema            : prisma validate  +  migrate deploy against a PG service
integration       : the tenancy matrix (§3.1)
lint-frontend     : eslint . (after F-22 fixes the script and the config)
test-frontend     : jest --coverage with real collectCoverageFrom + thresholds
e2e               : playwright against a composed stack, seeded DB
```

Two pipeline-shaped fixes are prerequisites: `F-29` (the leaked Jest worker will
hang the runner) and `F-22` (the frontend lint script exits 1 before linting
anything).

Add a small structural gate too, because it is what would have caught `F-18`
when grep could not: **fail the build if a file under `src/pages` renders a list
or detail view with no GraphQL operation reference.** Ten lines of script, and it
closes the exact hole that four audits walked past.

## 5. Coverage targets

Not percentages for their own sake — percentages that mean something:

| Target | Now | Goal | Gate |
|---|---|---|---|
| Tenancy matrix domains covered | 0 / 29 | 29 / 29 | hard fail |
| Backend line coverage (real number) | unmeasured | ≥ 80% on `*.service.ts` | hard fail |
| Frontend line coverage | ~unmeasurable (1 file) | ≥ 50% overall, ≥ 90% on guards/utils | warn then fail |
| Pages with fabricated data | 14 | 0 | hard fail (structural gate) |
| Playwright value-assertion ratio | 27% (58/218) | ≥ 50% | review |
| Concurrency test on booking | none | passing | hard fail |

## 6. Process observations

The document discipline in this repo is genuinely above average — a requirement,
a plan, a test plan, a result with a commit SHA, and a context bundle per
feature, with an explicit conditional rule for when the suggestion stage applies.
Keep it. Two adjustments would make it match reality:

1. **Stop hand-writing measured numbers.** `CLAUDE.md` says 405 tests / 37
   suites; the truth is 602 / 49. Have CI emit a generated status file and link
   it, so the count cannot drift from the claim (`F-30`).
2. **Make "green" a pipeline state, not a prose state.** A test-result document
   asserting a pass is evidence about one machine at one moment. That is fine as
   a record; it is not a control. CI is the control.
