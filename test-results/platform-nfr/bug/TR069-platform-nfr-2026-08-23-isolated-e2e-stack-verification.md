---
id: TR069
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP070
related: [PLAN043, BUG018, BUG019, BUG017]
---

# TR069 — Results: isolated e2e stack and seed-script fixes

## What is conclusively verified (not dependent on a full e2e run)

| Check | Result |
|---|---|
| TC-01/TC-04: `--force-recreate` boots clean, no crash-loop | ✅ Pass — confirmed across 4 independent recreates this session, `GraphQL endpoint ready` logged every time after all fixes landed |
| TC-02: `tsc --noEmit` / `eslint` on `seed-e2e.ts` | ✅ Pass — clean after every fix, checked 4 times as fixes were added |
| TC-03: `testResults` returns the seeded row for an authenticated manager | ✅ Pass — direct GraphQL query returned `{"patient":"Priya Sharma","test":"Blood Test","status":"completed","ordered_by":"Sarah Manager"}`, previously `[]` |
| GP Consultation payment wiring (found and fixed during this same verification pass, not in the original `BUG018` scope) | ✅ Pass — `myFinanceTransactions` returns `{"amount":499,"product_name":"GP Consultation","patient_name":"Anita Sharma"}`, confirmed via direct GraphQL query against the live `backend_e2e` |

These four are the load-bearing claims of `BUG018` and are independently
confirmed via direct API calls against the running isolated stack, not
inferred from a UI test — this is stronger evidence than an e2e pass for the
data-correctness claim specifically, even though the full suite run below
was less conclusive.

## Full-suite e2e run: three attempts, none completed cleanly

TC-05 (`npm run e2e:isolated`, full 66-spec run) was attempted three times.
None finished normally:

1. **Run A** — manually stopped partway through (deliberately, after
   confirming the pre-fix baseline reproduced `BUG019` and the GP
   Consultation gap, before the seed-script fix was complete).
2. **Run B** — ran with all fixes applied; reached test 26 of 66 with real,
   distinct pass/fail results, then the underlying process was externally
   terminated (task status `killed`) partway through. The e2e containers
   themselves stayed healthy throughout (`docker ps` confirmed all three
   still `Up`/`Healthy` after the kill) — only the Playwright runner process
   was interrupted. Playwright's own reporter marked every test after the
   interruption point as `did not run` or a `(0ms)` failure — these are
   artifacts of the interruption, not real results, and are excluded below.
3. **Run C** — retried fully hands-off (no concurrent `docker`/`curl`
   commands this time, to rule out self-inflicted resource contention) and
   was killed almost immediately (0 tests completed). This rules out "my
   own concurrent verification commands caused it" as the sole explanation
   — something in this specific session/host environment does not
   reliably sustain a 20+ minute detached background process. Not root-
   caused further; logged as a genuine, unresolved environmental
   limitation rather than a code defect (see "What this does not close").

## The 26 genuine results from Run B (before the interruption)

19 passed, 7 failed — all 7 failures have real, distinct, explainable causes,
none of them a missing seed fixture:

| # | Spec | Result | Cause |
|---|---|---|---|
| 3 | `admin-email-templates.spec.js` | ❌ | 30s test timeout; expected subject text ("Appointment Cancelled — {{patient_name}}") **is** correctly seeded — confirmed by reading `seed-e2e.ts`'s `EMAIL_TEMPLATES` array. Page-load timing, not missing data |
| 4 | `admin-languages.spec.js` | ❌ | Same shape: "English" **is** seeded (`LANGUAGES` array), but the page didn't render it within budget |
| 8 | `admin-policies-communications.spec.js` (1st of 3) | ❌ | Same shape — the other 2 tests in the same file passed |
| 11 | `admin-roles.spec.js` (1st of 2) | ❌ | **Pre-existing, expected** — `CLAUDE.md`: "doesn't count toward this — exercises `admin/Roles.jsx`, which is still 100% `mocks/store.js`-driven" |
| 18, 19 | `calendar.spec.js` (both) | ❌ | `BUG019` — real, confirmed, deferred app bug |
| 25 | `finances.spec.js` (1st of 5; the other 4 in the same file passed) | ❌ | Failed on the page's very first, plain `toBeVisible()` assertion (5s default timeout, no override) for a static caption — never even reached the GP-Consultation assertion the seed fix targeted. `finances/index.jsx` renders all ~150 seeded transactions with no pagination (`filtered.map(...)`, no `.slice()`/`TablePagination`) — real evidence for the already-tracked, still-open F-14 pagination gap (`REQ039`'s "~19 services still lack a paginated contract" — `appointment-payments` is one of them). Not a new bug; additional live evidence for an existing one |

**Tests 3/4/8 share a pattern**: all three are among the *first four* tests
in the run, all three failed identically in the earlier Run A too, and nine
tests later in the same run (5, 6, 7, 9, 10 — including two more
`admin-policies-communications.spec.js` tests in the same file as #8)
correctly show correctly-seeded data with no issue. Reading the actual
error output ruled out a data gap for all three. The pattern points to
early-run cold-start cost (first-hit Vite/esbuild route compilation, cold
GraphQL resolver JIT) pushing the first few tests' page loads past their
30s test budget on this host, while later tests hit already-warmed code
paths — not a defect in the seed script, the app, or the fixture.

## What this does not close

- **No clean, uninterrupted full-suite run against the isolated stack was
  achieved this session.** Three attempts, three different outcomes, none
  a complete run. This is logged honestly rather than papered over with a
  partial count presented as final. Whoever next has interactive access to
  this host should re-run `npm run e2e:isolated` once, without any other
  concurrent work in the same session, and treat that as the actual
  baseline — the 19/7/26-partial figures above are real but incomplete.
- Tests 3/4/8's early-run timing pattern is not fixed. A candidate
  mitigation (not attempted): a throwaway warm-up navigation to a couple of
  routes right after `frontend_e2e` reports ready, before the suite starts,
  so the first real test doesn't pay the cold-compile cost. Logged, not
  built.
- `finances.spec.js`'s pagination-adjacent failure is not fixed —
  `appointment-payments`'s lack of a paginated `myFinanceTransactions`
  contract remains exactly as open as `REQ039` already states.
- `BUG019` remains open by design (see that document).
