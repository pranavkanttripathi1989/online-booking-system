---
id: PP006
type: plan
feature: project-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: PP000
related: [PP001, PP002, PP003, PP004, PP005]
---

# 06 — Execution plan

Six phases. Each is a vertical slice with its own Definition of Done, sequenced
so that later phases cannot silently undo earlier ones. Durations assume one
experienced full-stack engineer; they are calibration, not commitment.

Every item threads through the existing `CLAUDE.md` working loop: classify →
requirement doc → plan doc → test plan → implement → test result → context
bundle → indexes updated in the same change.

---

## P0 — Stabilise and secure · ~2 weeks · blocks everything

Nothing else should start until this is done. These are the five items that make
the current build unsafe to demonstrate to a real clinic, and all five are small.

| # | Item | Finding | Effort |
|---|---|---|---|
| 0.1 | Remove default JWT secrets from `docker-compose.yml`; fail to boot without real ones; rewrite root `.env.example` for the Postgres/Nest stack; delete the pre-pivot `Makefile` | F-11, F-31 | hours |
| 0.2 | Delete the frontend mock-auth path: `mock_` token branch, `MOCK_USERS` login fallback, `MOCK_OTP`; log out on `ME_QUERY` failure; gate demo chips behind `import.meta.env.DEV` | F-02 | 1 day |
| 0.3 | Central `orgScope()` / `isPlatformOperator()` helper; migrate all ~12 ternary call sites; add `@Auth()` to catalogue queries | F-01 | 1–2 days |
| 0.4 | Index migration across all 41 models; verify with `EXPLAIN ANALYZE` against a seeded dataset | F-13, F-28 | 1–2 days |
| 0.5 | CI pipeline: backend lint + `tsc --noEmit` + Jest; `prisma validate`; frontend lint + Jest; Playwright. Fix the leaked Jest worker and the broken frontend lint script first, or CI cannot go green | F-26, F-29, F-22 | 2–3 days |
| 0.6 | Scoping holes: `createPatient` org stamping, `Patient.appointments` resolve-field, `updateRolePermissions` `is_system` guard + id validation, `createRazorpayOrder` auth, `orderTest` `patient_id` | F-04–F-08 | 2–3 days |

**DoD.** A self-registered account reads nothing outside its own scope, proven by
an automated test, not by inspection. No `mock_`-token path exists in the
frontend bundle. `EXPLAIN ANALYZE` on the core appointment query shows an index
scan. CI is required on the default branch and green. All twelve a11y/lint errors
fixed. `docker compose up` without a root `.env` fails loudly instead of booting
with a known signing key.

**Ordering note.** 0.4 (indexes) is independent of the security items and can run
in parallel. 0.5 (CI) should land early even if incomplete, because it is what
makes every later phase's DoD checkable.

---

## P1 — Prove the boundary · ~1.5 weeks

The single highest-leverage phase in this plan. Without it, P0's fixes are
correct today and unverifiable tomorrow — which is exactly how `F-01` survived
602 green tests.

| # | Item | Finding | Status |
|---|---|---|---|
| 1.1 | Test database (Testcontainers or a dedicated compose service) + `migrate deploy` + deterministic two-org fixture | F-25, F-28 | ✅ done (`BUG007`) |
| 1.2 | `supertest` GraphQL integration harness | F-25 | ✅ done (`BUG007`) |
| 1.3 | **Tenancy matrix**: parameterised over 29 domains × 8 caller archetypes, asserting own-org read succeeds and cross-org read returns empty or `FORBIDDEN` | F-25 | ✅ done 2026-08-23 (`BUG012`) — all 21 tenant-scoped domains now classified (covered or exempt with a stated reason); `KNOWN_GAPS` is `[]` |
| 1.4 | Booking concurrency test: N simultaneous bookings on one slot, exactly one succeeds (expected to fail until P3) | F-16 | ✅ **done (`BUG017`)** — flipped from `it.failing` to a real, green `it` once P3.1's exclusion constraint landed. Its own input shape was found stale (never matched the real `AppointmentInput` contract — failing GraphQL validation, not the intended assertion) and fixed in the same slice |
| 1.5 | Seed script: 2 orgs, ~5 clinicians, ~200 patients, ~2,000 appointments, payments, messages; separate e2e database with reset between runs | F-28 | ✅ **done (`PLAN043`/`BUG018`)** — new `docker-compose.yml` `e2e` profile (`postgres_e2e` tmpfs + `backend_e2e` + `frontend_e2e`, ports 5435/4001/3101), `backend/prisma/seed-e2e.ts` (2 orgs, 5 clinicians, 200 patients, 2,000 appointments across a -30..+60 day window, payments, messages — one clinician fixture kept identical to the dev DB so 8 pre-existing specs needed zero edits), `npm run e2e:isolated`. Building it at real volume found two real exclusion-constraint collisions in the seed script's own slot generation (room-level and clinician-level, `BUG018`) and a genuine `test-results` scoping gap — plus, running the full suite against it, a real, previously-invisible app bug (`BUG019`: no date filter + `desc` ordering hides "today" once there are enough rows) that 4-row dev-stack testing could never have surfaced. See `TR069` for the full run results |
| 1.6 | Frontend unit tests where risk concentrates: `AuthContext`, `ProtectedRoute`/`RoleGuard`, booking-wizard validation, currency/date utils; real `collectCoverageFrom` and thresholds | F-24 | ✅ done 2026-08-23 (`BUG013`) — guards (94.1% branch) and formatters (97.9% branch) both clear 90%; `collectCoverageFrom` now measures the whole tree with a ratchet-floor `global` threshold |

**DoD.** The tenancy matrix covers every domain and is required in CI. Adding a
new domain without a matrix entry fails the build. Frontend coverage is measured
against the whole source tree, with guards and formatters above 90%. The
concurrency test exists and its current failure is recorded as the acceptance
criterion for P3.

**P1 status as of 2026-08-23: complete — 1.1–1.6 all done.** 1.5 (the
isolated e2e stack + realistic seed dataset) was the last item, closed by
`PLAN043`/`BUG018`/`BUG019` (see that row's detail above). P1 as a whole is
now closed, so `07-prd-gap-analysis-and-roadmap.md`'s "P0–P1 must complete
before any REQ014–035 implementation planning begins" gate is satisfied —
REQ014–REQ035 implementation planning may proceed.

---

## P2 — Truth in the UI · ~3 weeks

No screen may present data it did not fetch. This is a trust problem before it is
a technical one: a clinician reading an empty-but-authoritative clinical record
is worse than a clinician seeing an error.

**Status as of 2026-08-23** (audited live against the real codebase, not
inferred from this doc's own prior wording — see per-row evidence):

| # | Item | Finding | Status |
|---|---|---|---|
| 2.1 | Wire the eleven fabricated pages that already have a backend: `analytics`, `patients/detail`, `clinician/Patients`, `staff/Dashboard`, `staff/Appointments`, `patient/Appointments`, `patient/Profile`, `manager/Billing`, `auth/forgot-password`, `Settings/NotificationTemplates`, `public/landing` | F-18, F-23 | ⚠️ **partial, 10/11 resolved (`BUG009`, `BUG016`)** — 7 wired by `BUG009`; `manager/Billing` deleted (redirects to `/finances`); `patient/Profile.jsx` and `auth/forgot-password.jsx` wired by `BUG016` (the former surfaced and closed a real gap: `me` had no way to expose a patient's own `patient_id`, and `updatePatient` had no patient-self-service path at all); `Settings/NotificationTemplates.jsx` deleted as dead code (never routed, superseded by `admin/EmailTemplates.jsx`/`REQ011`). **Only `patients/detail.jsx` remains** — audited and found to be its own much larger, multi-domain feature (8 tabs, most backed by nothing — letters, membership, intake forms, structured allergy/diagnosis records — tied to `REQ020` and others), not a bug-fix-sized wire-up. Deliberately left open rather than half-wired; only its `TableContainer` fix landed (`BUG015`) |
| 2.2 | Decide and act on the three genuinely backend-less pages — `tasks`, `waiting-room`, `onboarding`: build the domain or remove the route. Do not leave them reachable | F-18 | ⚠️ **partial — `waiting-room` done (`REQ042`/`PLAN045`), `tasks`/`onboarding` still not started.** `waiting-room` now has a real backend (check-in/consultation/reset status transitions on `Appointments`) and is off `check-page-data-wiring.mjs`'s allowlist. `tasks` and `onboarding` remain confirmed backend-less — both still trace to the same open product-definition questions this row originally cited |
| 2.3 | `GlobalSearch`: add a real cross-domain search resolver, or remove the component from the shell | F-18 | ✅ **done (`BUG015`)** — deleted; a real cross-domain search resolver is separate, larger scope not attempted |
| 2.4 | Structural CI gate: fail if a page under `src/pages` renders a list/detail view with no GraphQL reference | F-18 | ✅ **done** — `scripts/check-page-data-wiring.mjs`, wired into `.github/workflows/ci.yml`'s structural-gates job. Its `useParams` "external source" heuristic is a known, documented false-negative (misses `patients/detail.jsx` above) — a gate-quality gap, not a CI-wiring gap |
| 2.5 | Theme-token sweep across the 88 files with hardcoded hex; drive the MUI theme from org branding at `ThemeContext`; add a `no-hardcoded-colors` lint rule | F-19 | ⬜ not started — re-measured 2026-08-23: 88 files, 2,084 raw hex occurrences (essentially unchanged from the figure this doc already cites); no lint rule exists |
| 2.6 | Add the three missing `TableContainer` wrappers; re-verify 360/768/1280px on every page touched | F-20 | ✅ **done (`BUG015`)** — all 3 wrapped; `settings/index.jsx`'s wrapping `Paper` also had its own `overflow:'hidden'`, the actual clipping mechanism, removed too. Full 360/768/1280 live-browser re-verification not done (lint + code review only — see `BUG015`'s "what this does not close") |
| 2.7 | Apollo policy: `cache-and-network` for lists, surface partial errors instead of swallowing them, remove the "backend offline" debug line | F-21 | ⚠️ **partial, debug line closed (`BUG015`)** — the "backend offline" line is gone. The global `cache-first` default is unchanged (still relies on 26 files' organic per-query overrides) — changing it needs cross-page testing, still open |

**DoD.** Zero pages render data without a query, enforced by the CI gate.
Changing an org's brand colour visibly re-themes the whole application, not just
the sidebar. Every page touched verified at all three breakpoints. Each page
wired against its existing contract verbatim, per Hard Rule 7.

---

## P3 — Booking integrity and scale · ~2.5 weeks

The engine is the product's strongest asset. This phase makes it correct under
concurrency and viable under load.

**Status as of 2026-08-23** (audited live against the real codebase):

| # | Item | Finding | Status |
|---|---|---|---|
| 3.1 | Database exclusion constraint on `(clinician_id, time range)` with `btree_gist`, excluding cancelled rows; map the violation to the existing user-facing message; P1's concurrency test turns green | F-16 | ✅ **done (`BUG017`)** — two `EXCLUDE USING gist` constraints added (migrations `20260823030000` clinician, `20260823031500` room — the second matching `technical-plans/01-phase1-mvp.md` §3.3's own "do this once, for both modes" design, and closing a real gap it exposed: `create()`'s room pick had zero availability check). `'[)'` bounds so back-to-back bookings stay allowed, scoped to exclude cancelled/no_show/soft-deleted rows. Maps the clean exclusion-violation error, a real deadlock observed live under genuine 5-way concurrency, *and* the room-constraint's own violation, all to the existing "This time slot is no longer available" message. Live-verified against the real dev database with 5 truly-parallel requests (separate OS processes), not just the test harness. Room-selection logic itself remains unfixed — open question #14 |
| 3.2 | Decide and implement the timezone model — `appointment_date` + `appointment_time` are currently two zone-less timestamps, which will not survive a multi-city tenant | F-16 | ⬜ not started — `schema.prisma`'s `Appointments.appointment_date`/`appointment_time` are still plain `DateTime` (`TIMESTAMP(3)`, not `TIMESTAMPTZ`, confirmed in the `init` migration SQL); no decision recorded anywhere |
| 3.3 | Pagination on every unbounded list resolver, matching each consumer's existing contract; server-side default and maximum `take` | F-14 | ⚠️ **partial — safety net done (`REQ039`), the real fix is not.** A Prisma `$use` middleware now clamps every `findMany` with no explicit `take` to 200 rows — no resolver can return a genuinely unbounded collection anymore, live-verified against a real unbounded query (`languages`) and against explicit/default-limit queries (unaffected). **Still open**: `patients`/`appointments`/`clinicians` already paginate for real (`take`/`skip` in their own GraphQL contract); ~19 other services (`staff`, `reviews`, `messages`, `products`, `rooms`, `services`, `test-results`, `notifications`, `lookups`, `languages`, `public`, `account`, `email-templates`, `notification-preferences`, `cancellation-rules`, ...) still have no real paginated contract a frontend could page through past 200 rows — each needs its own contract change matched against its actual consumer (Hard Rule 7), not attempted this session |
| 3.4 | Kill the N+1s: batch the `public` clinician fan-out; move dashboard/analytics counting into Prisma `groupBy`/`count` aggregates | F-15 | ✅ **done (`REQ036`)** — `dashboard.service.ts`/`analytics.service.ts` were already batched. `public.service.ts`'s `getClinicians()` now batches every clinician's rating into one `reviews.groupBy` call instead of one `reviews.aggregate()` per row |
| 3.5 | Razorpay webhook endpoint with signature verification, plus a reconciliation job for `pending` rows | F-07 | ✅ **done (`REQ040`/`PLAN044`)** — new `POST /webhooks/razorpay` (REST, `@Public()` — confirmed live that the global `GqlAuthGuard` genuinely 401s an unauthenticated REST request the same as GraphQL, not something to assume from a stale comment), HMAC-SHA256-verified against a real live-computed signature, idempotent by construction. New `@nestjs/schedule` `@Cron('*/15 * * * *')` reconciliation sweep for stale `pending` rows via Razorpay's own Payments API. F-07's full text (not just this row's own summary) also flagged `createRazorpayOrder`/`verifyRazorpayPayment` as unauthenticated abuse surface — kept `@Public()` (the anonymous public booking wizard genuinely needs it, per this session's own `BUG011`) but added a 10/60s throttle instead of an auth requirement. 38 new unit tests, 708/708 full suite green, live-verified end to end (a real signed webhook call flips a real `pending` row to `succeeded`) |
| 3.6 | Audit-log completeness: `resource_id`, `outcome`, sanitised `details`, `user_agent`, plus the two indexes | F-10 | ✅ **done (`REQ037`)** — `outcome`/`user_agent` columns added (migration `20260823020000`); the interceptor now populates `resource_id` (from the caller's own `id` arg, or the created entity's), sanitised `details` (a deny-list redacts password/token/OTP/secret-shaped keys), `outcome`, and `user_agent` on every row. Exposed on `AuditLogType` and the admin UI, which previously had no way to see any of it. The 3 pre-existing indexes already exceeded the "two indexes" ask |
| 3.7 | `helmet` + CSP + HSTS; per-operation throttles on `register`/`requestOtp`/`requestPasswordReset`; boot-time `NODE_ENV` assertion | F-09, F-12 | ✅ **done (`REQ038`)** — `helmet` added (CSP production-only to not break the Apollo Sandbox dev landing page; CORP relaxed to `cross-origin` so cross-origin avatar/logo `<img>` loads keep working — both deviations live-verified, not assumed). Boot-time `assertKnownNodeEnv()` throws on an unset/unrecognized value. Throttle redesigned rather than reinstated at the same value: `login`/`verifyTotpLogin` 20/60s, `requestOtp`/`forgotPassword` 10/60s (tighter — cost-bearing sends), `register` 10/60s (**new** — never had one, despite this item's own wording naming it). Live-verified: 15 rapid login attempts produce zero `ThrottlerException` now |

**DoD.** Concurrent booking of one slot yields exactly one appointment, proven by
the P1 test. No resolver returns an unbounded collection. `EXPLAIN ANALYZE` on
the ten hottest queries shows index usage at the seeded volume. Every mutation
produces an audit row that names its target and its outcome. Security headers
present on every response.

### P2/P3 status as of 2026-08-23 — what's deliberately still open, and why

**P2: 3/7 done (2.3, 2.4, 2.6), 3/7 partial (2.1, 2.2, 2.7), 1/7 not started
(2.5). P3: 5/7 done (3.1, 3.4, 3.5, 3.6, 3.7), 1/7 partial (3.3), 1/7 not
started (3.2).** 3.5 (`REQ040`/`PLAN044`) and 2.2's `waiting-room` third
(`REQ042`/`PLAN045`) closed 2026-08-23. The items below remain deliberately
not attempted — each is genuinely separate, larger-scoped work, not an
oversight:

- **P2.2, remaining two (`tasks`, `onboarding`).** `waiting-room` is closed
  (`REQ042`) — it turned out to have a genuinely small answer (an additive
  `Appointments.status` extension), not the full queue/token PRD scope
  `open-questions.md` #11(a) worried it might need. `tasks` and `onboarding`
  are different: each is its own real domain (a generic task system, an
  org-onboarding wizard) with no schema, no resolver, and no settled
  product definition yet. Each still needs its own requirement + plan
  cycle, not a shared page-wiring pass.
- **P2.5 (the theme-token sweep — 88 files, 2,084 raw hex occurrences).**
  A large, mechanical, but non-trivial sweep: `#RRGGBB` literals have to be
  mapped to the *correct* theme token per use (not a blind find-replace —
  `#006D77` alone appears 264 times across genuinely different semantic
  roles), plus a new `no-hardcoded-colors` lint rule to keep it from
  regressing. Big enough to deserve its own dedicated pass and its own
  verification (a re-theme actually re-themes the whole app, not just the
  files touched), not bundleable into this session's per-bug slices.
- **P3.2 (the timezone model).** `appointment_date`/`appointment_time` are
  zone-less `TIMESTAMP`, not `TIMESTAMPTZ`. Deciding to store UTC and
  convert at the boundary is the right long-term answer for a product that
  may eventually span more than one Indian timezone-adjacent market, but
  it's a product/architecture decision with broad blast radius — every
  appointment query, every existing row, every display format across the
  frontend. Not something to decide unilaterally inside an unattended
  hardening sweep; logged as still open, not guessed at.
- **P3.3, the real fix (per-resolver pagination).** This session shipped
  the safety-net half only (`REQ039` — no resolver can return an unbounded
  collection). The actual fix — a real paginated GraphQL contract on each
  of ~19 services — is per-domain, requirement-sized work: each one needs
  its contract checked against what its actual frontend consumer currently
  expects (Hard Rule 7), the same discipline every other domain in this
  codebase already got. Not something to rush through as one more bullet
  in a hardening pass.

---

## P4 — Make RBAC real · ~2 weeks

Its own phase because it is a cross-cutting authorisation change and must not be
attempted big-bang.

| # | Item | Finding |
|---|---|---|
| 4.1 | Resolve the caller's effective permission set at login (Redis-cached) and include it in the `me`/auth payload so `hasPermission()` stops being constant `false` | F-03 |
| 4.2 | `PermissionsGuard` + `@RequirePermission('resource:action')`, registered after `RolesGuard`, keeping `@Auth()` as the coarse gate | F-03 |
| 4.3 | Migrate resolvers domain by domain, extending the P1 tenancy matrix with a permission axis as each lands | F-03, F-25 |
| 4.4 | Frontend: hide or disable actions the caller lacks permission for, driven by the now-real `hasPermission()` | F-03 |
| 4.5 | Thread `@CurrentUser()` through the remaining admin mutations; scope `getAuditLogs` for non-platform callers | F-06 |

**DoD.** Revoking a permission in the matrix demonstrably prevents the operation,
proven by an automated test per migrated domain. A system role cannot be stripped
of its permissions. The UI reflects the caller's real permission set.

---

## P5 — India go-to-market · ~8–10 weeks, parallelisable

Detailed rationale in `05-competitive-analysis.md`. Sequenced by
impact-over-effort, not by technical interest.

**Wave A — cheap, visible, distinctly Indian (~4 weeks)**

| # | Item | Why now |
|---|---|---|
| 5.1 | **WhatsApp Business API provider** in the existing notification registry | Highest ROI in the entire document. The registry, per-org encrypted credentials, and preference plumbing already exist; WhatsApp is the channel every Indian competitor already has |
| 5.2 | **Reminder scheduler** (BullMQ + Redis, both already provisioned) | The mechanism by which 5.1 actually reduces no-shows; already identified as the missing piece for `appointment_reminder` |
| 5.3 | **Deposits / prepay at booking**, per-service configurable | Most direct no-show lever; Razorpay already integrated; pairs with the existing cancellation-rules engine |
| 5.4 | **Waitlist with auto-fill** on cancellation | Recovers revenue currently lost outright; the slot engine already exists |
| 5.5 | **Review submission + post-visit request** | `ReviewsService` has no creation path at all — the flywheel is missing step one, and the read side plus public profile already exist |
| 5.6 | **GST-compliant patient invoices** + per-org invoice numbering | Statutory requirement, currently impossible |

**Wave B — the moat (~6 weeks, runs in parallel)**

| # | Item |
|---|---|
| 5.7 | Clinical MVP: templated consultation notes, diagnosis coding, structured e-prescription with a drug master, printable Rx meeting NMC telemedicine expectations. `patients/detail.jsx` already has the UI shell |
| 5.8 | Real teleconsultation behind the existing `/video/:id` route, with consent capture and session records |
| 5.9 | ABDM/ABHA programme kickoff — ABHA linking on the patient record, HIP registration, consent framework, HPR/HFR registry entries. Long lead time, so start early; treat as a compliance programme |

**Wave C — parity and platform (continuous)**

Digital intake and patient journey (turning `waiting-room`/`tasks` real);
insurance/TPA and cashless; true slot-capacity utilisation replacing the
documented completion-rate proxy; i18n for Hindi and regional languages; plan
entitlement enforcement; observability and SLOs; the DPDP Act 2023 programme.

**DoD per wave item.** Same as every other slice in this repo: contract matched
verbatim, tenant isolation and permission gating tested, e2e path green against
the real backend, responsive at 360/768/1280px, no mock dependency, committed as
its own vertical slice.

---

## The first ten commits

If only one thing gets done this week, make it this list. In order:

1. `fix(infra): remove default JWT secrets from docker-compose; require real env` — F-11
2. `fix(frontend): remove mock-token auth bypass and demo password fallback` — F-02
3. `fix(frontend): repair the lint script and add eslint-plugin-react to flat config` — F-22
4. `fix(frontend): resolve the 12 real a11y lint errors` — F-22
5. `feat(backend): central orgScope/isPlatformOperator; fail closed for org-less callers` — F-01
6. `perf(db): add indexes across all 41 models` — F-13
7. `ci: add lint, typecheck, unit, schema, and e2e pipeline` — F-26
8. `fix(backend): tenant-stamp createPatient and scope Patient.appointments` — F-04, F-05
9. `test(backend): tenancy matrix over a real Postgres with two seeded orgs` — F-25
10. `fix(backend): guard updateRolePermissions against system roles; validate permission ids` — F-06

Commits 1–4 are hours of work each. Commit 9 is the one that keeps the rest
fixed.

---

## Risks and how to hold them

| Risk | Mitigation |
|---|---|
| The `orgScope` refactor (0.3) touches ~12 call sites and could regress a working scope | Land P1's tenancy matrix immediately after, and treat the refactor as unverified until it is green |
| The index migration is hand-written (no `prisma migrate dev` in this environment) | Read every statement against the schema diff before applying, per the existing documented rule; test on a copy of the dev database first |
| Wiring eleven pages (P2) is broad and touches many contracts | One page per commit, contract read verbatim from the page's own `gql` before writing, per Hard Rule 7 — the rule exists because skipping it has caused real bugs |
| CI will surface a large backlog of pre-existing warnings and go red | Set the initial `--max-warnings` budget at the current count, ratchet it down; hard-fail only on errors and the structural gates |
| The RBAC migration (P4) could lock out real users mid-flight | Ship `PermissionsGuard` in report-only mode first (log what it *would* deny), review a week of logs, then enforce per domain |
| ABDM certification has an external lead time nobody controls | Start 5.9's paperwork in Wave A even though the build lands in Wave B |
