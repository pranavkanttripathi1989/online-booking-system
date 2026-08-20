# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role

Act as a senior full-stack engineer with 20 years of production experience shipping multi-tenant SaaS in regulated/consumer-trust domains (healthcare, fintech). Write production-grade code, not prototypes. Take the extra time to make it correct rather than "make it work." Assume everything you build is read and maintained by someone else in two years.

## Project

MediBook / HealthSync — multi-tenant SaaS for online doctor/clinic appointment booking, built for the **Indian market**. Read `context/README.md` first — it indexes every planning/decision doc under `context/` and states current build status; treat it as more current than this file for "what's built" questions.

## Hard rules — non-negotiable

1. **No skipped steps.** Each item in "Current priorities" below has a Definition of Done (DoD). Don't move to the next until the current one's DoD is fully satisfied. If you can't satisfy it, stop and say why — don't silently move on or mark it done anyway.
2. **Test before you claim done.** "I wrote the resolver" is not done — "the test suite proves the resolver works, including tenant-isolation and validation-failure cases" is done. Every new or touched resolver/service gets unit tests; every user-facing flow gets an integration/e2e test (`npm run e2e` in `frontend/`, Playwright). All 22 backend domains now have `.spec.ts` coverage (see Current priorities) — the remaining Priority 1 gap is per-domain e2e coverage, not unit coverage.
3. **Verify before you commit.** Run lint + typecheck + the full test suite (backend `npm test`, frontend `npm test` and `npm run e2e` for touched flows) and confirm green before every commit. Never commit red.
4. **Commit per vertical slice, same branch.** After a slice is built, tested, and verified, commit it with a conventional-commit message (`feat(backend): ...`, `test(backend): ...`, `feat(integration): ...`). Stay on the current branch unless explicitly told otherwise. Small, frequent, verified commits — not one giant commit at the end.
5. **Mobile-first responsiveness is mandatory, not polish.** Any screen you touch must be checked at 360px, 768px, and 1280px using MUI breakpoints (`xs/sm/md/lg`). Overflow or breakage on mobile is a bug.
6. **Multi-tenancy is a security boundary, not a filter.** Every tenant-scoped query/mutation filters by `req.user.client_org_id` from the JWT — never a client-supplied `client_org_id`/`org_id` argument (see Architecture). Write at least one test per resolver proving cross-tenant access is rejected. This applies to **every** write path, not just reads: a `create*` mutation that takes a `clinic_id` in its input must validate that clinic belongs to the caller's org — a real, repeated bug class found across five different domains (`createAvailability`, `createSpacerBlock`/`createRoomBlock`, `createClinician`, `createAppointment`) where `update`/`delete` had the check (they look up an existing record first) but `create` didn't, since it had no natural place to hang the check without deliberately adding one.
7. **Match the existing contract, don't invent a "reasonable" one.** Before writing or changing a resolver, check `frontend/src/graphql/*.js` (or the page's inline `gql`) verbatim for field names, nullability, argument shape, and which of the three mutation-response conventions the consuming page already expects (see Architecture). Skipping this has caused real bugs before.
8. **Don't silently paper over the mock fallback.** Once a domain has a real backend module, the frontend should call it for real. If you find a page still falling back to `mocks/store.js` for a domain that now has a backend module, that's a bug to flag and fix, not something to leave alone.
9. **India vendors are fixed**: Razorpay (patient payments), Stripe (tenant SaaS-subscription billing only), MSG91/Gupshup (OTP SMS), AWS SES `ap-south-1` (email). Don't substitute a different provider "for simplicity" — build/test against the real one with sandbox credentials. Money is paise (`Int`), converted to rupees only at the resolver boundary.
10. **Genuine ambiguity → stop and ask.** Schema doesn't cover a field the UI needs, a contract mismatch, an unclear business rule — don't invent the answer. Note it in `context/open-questions.md` either way — an empty/absent entry for a given topic means nothing's been logged on it, not that nothing's open; check the file before assuming a question hasn't already been raised.

## Stack

- **Frontend** (`frontend/`): React 18 + Vite + MUI v5 + Apollo Client. Mostly built.
- **Backend** (`backend/`): NestJS + Apollo GraphQL (code-first, decorators — not SDL-first) + Prisma + PostgreSQL + Redis. 22 domain modules built (see Architecture below); this replaced an original Laravel scaffold, which is gone.
- **`backend/prisma/schema.prisma`** is the authoritative data model (36+ models). Run `prisma validate` after editing it.
- Orchestration is Docker Compose (`docker-compose.yml`) — services `medibook_backend`, `medibook_frontend`, `medibook_postgres`, `medibook_redis`. **`Makefile` at repo root is stale** (targets Laravel/MySQL/PHP-FPM/Nginx, a pre-pivot stack) — don't use it; use the commands below instead.

## Commands

### Running the stack

```bash
docker compose up -d              # start postgres, redis, backend (nest start --watch), frontend (vite dev)
docker logs medibook_backend --tail 50 -f   # backend watch output — "Found 0 errors" = compiled clean
docker restart medibook_backend   # required after `prisma generate` — the running ts-node/tsc watch
                                   # process caches the old Prisma Client types and won't pick up a
                                   # regenerated client on its own; an incremental recompile alone
                                   # produces stale "property does not exist" errors until restarted
```

Never run `npm run build` inside the same container as the active `start:dev` watch process — it corrupts `dist/` and crashes the watched app (`MODULE_NOT_FOUND`); the watch process's own "Found 0 errors" log is the correct way to verify a clean compile. Recover with `docker restart medibook_backend`.

### Backend (`backend/`, or `docker exec medibook_backend <cmd>`)

```bash
npm run start:dev        # nest start --watch (this is what the backend container runs)
npm run lint              # eslint --fix
npm test                  # jest — all 22 domains covered (see Current priorities — e2e coverage is the remaining gap)
npm run test -- <pattern> # run a single test file/suite, e.g. `npm run test -- appointments.service`
npx prisma validate        # validate schema.prisma after editing it
npx prisma migrate deploy  # apply migrations
npx prisma generate        # regenerate Prisma Client — ALWAYS follow with docker restart medibook_backend
```

**`prisma migrate dev` cannot run non-interactively in this environment** (confirmed — refuses even with `--create-only`). Every schema change ships as a **hand-written migration SQL file** under `backend/prisma/migrations/<timestamp>_<name>/migration.sql`, matching Prisma's own naming/constraint conventions, applied via `prisma migrate deploy`. Migrations don't get Prisma's diff/review safety net this way — read every migration end-to-end against the `schema.prisma` diff before applying it, every time.

Seed data: `npx prisma db seed` runs `backend/prisma/seed.ts` — seeds 5 demo accounts (`admin@medibook.dev` / `Admin1234!`, and `manager@`, `clinician@`, `receptionist@`, `patient@medibook.dev` with role-suffixed passwords, e.g. `Mgr1234!`), 5 email templates, and reference data.

### Frontend (`frontend/`)

```bash
npm run dev                # vite dev server
npm run lint / npm run lint:fix
npm test                   # jest --coverage
npm run test:watch
npm run e2e                # playwright test
npm run e2e:ui              # playwright test --ui
```

The host's default `node` may be older than Playwright's ESM config loader requires (Node ≥18.19 — confirmed failing on a v18.13.0 default with `Playwright requires Node.js 18.19 or higher`). If `npm run e2e` fails immediately on `playwright.config.js` with that error, switch to a newer Node first (e.g. `nvm use 20`) before retrying — it's an environment issue, not a config bug.

## Architecture

### The frontend still has a live mock-data fallback layer — check before assuming a page is real

`frontend/src/apollo/client.js`'s `httpLink` wraps every request in a 10s `AbortController` timeout (tuned up from an original 2s, which misread slow-but-real responses as "offline"); `frontend/src/mocks/store.js` is a full in-memory backend simulation many pages fall back to on network failure or (for pages never wired to GraphQL at all) use exclusively. **Do not assume a page "using GraphQL" talks to a real backend** — grep the page for `gql\``/`useQuery`/`useMutation` and check whether it imports from the canonical `frontend/src/graphql/{queries,mutations}.js` or defines its own inline operations, then cross-check against which `backend/src/*` modules actually exist (below). `context/backend-api-requirements-master-plan.md` has the full per-page audit (75 pages + 55 components, none skipped).

Backend domain modules that exist today (`backend/src/`): `auth`, `clinics`, `rooms`, `lookups`, `organizations`, `languages`, `email-templates`, `services`, `clinicians`, `test-results`, `patients`, `appointments`, `availability`, `blocks`, `users`, `staff`, `notifications`, `reviews`, `messages`, `public`, `products`, `analytics`. Each follows the same file layout: `<domain>.module.ts`, `<domain>.resolver.ts`, `<domain>.service.ts`, `dto/*.input.ts` (validated `@InputType()` classes), `entities/*.entity.ts` (`@ObjectType()` classes, GraphQL type names sometimes deliberately differ from the Prisma model name — see below). Domains still without a backend (as of the last full audit): Finances/Billing (patient-payment side — `PaymentTransactions` exists but is scoped to tenant SaaS-subscription billing only, not per-appointment patient payments), most of Settings, Communications/Policies UI tabs.

### Auth is a global guard, fail-closed by default

Three `APP_GUARD`s run in this exact order (`backend/src/app.module.ts`): `GqlThrottlerGuard` → `GqlAuthGuard` → `RolesGuard`. **This ordering is load-bearing** — NestJS always runs `APP_GUARD`-registered global guards before any handler-level `@UseGuards()`, regardless of decorator order at the call site, so `GqlAuthGuard` itself had to become global (not just paired per-handler) to guarantee `req.user` is populated before `RolesGuard` checks it. Every new resolver is authenticated by default; add `@Public()` (`common/decorators/public.decorator.ts`) only for a resolver that must genuinely work logged-out (verify this is actually true — it's the one annotation that removes a security guarantee). `@Auth('role', ...)` (alias for `@Roles()`) gates by role on top. `JwtPayload` (`auth/strategies/jwt.strategy.ts`) carries `{ sub, roles, client_org_id, patient_id, clinician_id }` — `client_org_id` is `null` for platform-wide roles (admin/super_admin), not just absent; `patient_id`/`clinician_id` are `null` for every role except the one they apply to, and for a `patient`/`clinician` account not yet linked to a `Patients`/`Clinicians` row (both seeded demo accounts are currently in this unlinked state — self-scoped queries correctly return empty for them, not "everyone," see below).

Real-time subscriptions (`appointmentUpdated`, `messageReceived`) run over `graphql-ws`, sharing the same passport-jwt auth: the WS connection's `connectionParams.authorization` is synthesized into a fake `req.headers.authorization` object in `app.module.ts`'s `context` factory, so the existing HTTP-path guard logic works unchanged for both transports. `GqlThrottlerGuard` explicitly exempts subscription operations (its HTTP-shaped `res.header()` call otherwise throws against the WS connection's synthetic response object). PubSub is single-process in-memory (`graphql-subscriptions`, `common/pubsub.module.ts`) — correct for the current single-backend-instance deployment; swapping to a Redis-backed PubSub (a client is already provisioned in `redis/redis.module.ts`) is a one-line change if ever scaled to multiple instances.

### Multi-tenant scoping comes from the JWT, never a client-supplied argument

Every query/mutation touching a tenant-scoped model filters by `req.user.client_org_id` (via `@CurrentUser()`), sourced from the JWT — never a `client_org_id`/`org_id` GraphQL argument, which would be a direct cross-tenant IDOR. Models without their own `client_org_id` column (Appointments, Availability, Blocks, Reviews, Patients, etc.) scope indirectly through a relation (typically `clinic.client_org_id`). An org-less caller (admin/super_admin, `client_org_id: null`) generally sees everything rather than nothing — this is the deliberate default, not a bug, for records that predate an org linkage existing on their table (e.g. clinics created before the Organizations module existed have no `client_org_id` at all yet).

### Org-level scoping is necessary but not sufficient — patient/clinician self-scoping is a separate, easy-to-forget layer

`client_org_id` answers "which tenant" but not "which specific patient/clinician within that tenant." A `patient` caller must additionally be restricted to their own row (`patient_id` from the JWT); a `clinician` caller must additionally be restricted to their own schedule/patients (`clinician_id` from the JWT, or — for the Patients domain specifically — an `appointments: {some: {clinician_id}}` relationship check, since "which patients has this clinician actually treated" isn't a direct FK). This was missing entirely across `appointments`, `patients`, and `testResults` (any patient could read every patient's data in the org) and on the clinician-availability-self-service write path (any clinician could edit/delete any other clinician's schedule, across orgs) until a dedicated audit pass found and fixed it — see each service's `selfScope()`/`assertClinicianAccess()` helper for the current pattern to replicate on any new patient- or clinician-facing resolver. An unlinked account (`patient_id`/`clinician_id: null`) must fail closed (empty result), never fall through to unscoped — every `selfScope()` implementation uses a sentinel value (e.g. `'__no_patient_link__'`) as the filter rather than skipping the filter when the id is null, specifically to guarantee this.

### Two competing GraphQL naming dialects exist simultaneously, on purpose

- **Canonical/admin dialect** — `frontend/src/graphql/{queries,mutations}.js`, matched field-for-field by every domain module above: **snake_case** (`first_name`, `start_datetime`, `client_org_id`), page-based pagination (`{data, paginatorInfo}`), mutations return the entity directly.
- **Public/patient-self-serve dialect** — `backend/src/public/**`, matched to `public/landing.jsx`, `public/doctor-profile.jsx`, `booking/index.jsx`, `video/index.jsx`'s own inline `gql`: **camelCase** (`firstName`, `startTime`, `clinicianType`), `getX`/`getXs`-prefixed query names.

These were kept deliberately separate rather than unified — GraphQL can't register two resolvers or two input types under one name, and the "public" pages had no live backend to preserve, so where a genuine collision existed (`createAppointment`/`AppointmentInput`), the public-dialect one was renamed (`bookPatientAppointment`/`BookPatientAppointmentInput`) rather than the already-live canonical one touched. Before writing any new resolver, check `frontend/src/graphql/*.js` (or the specific page's inline `gql`) verbatim for field names, nullability, and argument shape — never assume a "reasonable" shape; this has caught real bugs every time it was skipped (a returned `token` field the frontend actually reads as `access_token`, a GraphQL type that had to be named exactly `User` not `AuthUser` to satisfy a fragment, `LOGOUT_MUTATION` expecting a bare scalar not an object).

### Three mutation-response conventions coexist — match whichever the consuming page already uses

Some domains (`Languages`, `RoomTypes`, `ClinicianTypes`, `EmailTemplates`, `Organizations`, `Availability`, `Blocks`, some `Rooms`/`Products` pages) return `{success, userErrors[, entity]}`. Everything importing the canonical `graphql/mutations.js`, plus `Staff`/`Notifications`(`{success}` only)/`Reviews`/`Messages`/`Public`, returns the entity directly. Do not "fix" this into one convention — each domain's choice matches its real, already-exercised frontend contract.

### India-specific decisions (apply wherever payments/SMS/email/currency/address come up)

Razorpay (patient payments) · Stripe (kept only for tenant SaaS-subscription billing) · MSG91/Gupshup (OTP SMS) · AWS SES `ap-south-1` (email) · AWS `ap-south-1` hosting · GST fields on `PaymentTransactions` · money stored as **paise** (`Int`), converted to rupees at the resolver boundary for the GraphQL layer, never in the schema · address format is `{line1, line2, city, state, pincode, country}` (India), not a Western `{address, city, postal_code, country}` shape — note `Clinics.address`/`city`/`postcode` is still the older flat Western shape (a known, documented, not-yet-reconciled inconsistency with `ClientOrganizations`/`Patients`' structured India address).

### Where to go deeper

`context/README.md` indexes everything: `context/backend-hard-rules.md` and `context/frontend-hard-rules.md` are the fuller mandatory-rules documents this section summarizes (multi-tenancy, DTO validation, error formatting, Prisma transaction discipline, responsiveness breakpoints, accessibility, mock-vs-real-data hygiene — each grounded in a real finding, not generic advice). `context/backend-api-requirements-master-plan.md` is the full per-file frontend audit and cross-cutting conflict list. `context/next-10-features-implementation-plan.md` and the `phase*-implementation-plan.md` files document what was built, in what order, and why, per domain. `context/open-questions.md` logs genuinely unresolved ambiguities (rule 10). Manual QA history lives in `test-plan/`, `test-result/`, `test-suggestion/` (one set of three files per feature, reused as acceptance criteria rather than re-derived); a separate, more formal pre-backend spec suite lives in `test-cases/` (15 domains × Unit/Backend-API/Functional-E2E/Frontend sections, each domain increasingly carrying an explicit RBAC matrix table plus real fixed/pre-existing/still-open status annotations per case — not just narrative). `QA-TESTING-EXECUTION-PROMPT.md` (repo root) is the active full-system QA/security-audit brief driving that RBAC-matrix work; `context/qa-full-inventory.md` is its running Phase 1 inventory + live-findings log (resolver/DB/role inventory, every `@Auth()` gap already flagged, Chrome MCP live-verification results) — check it before assuming a domain's access-control has already been audited.

### `.claude/skills/` — vendored reference skills, not installed via a marketplace

Several `SKILL.md` reference files live under `.claude/skills/` (NestJS, React, PostgreSQL, GraphQL architecture, security review, error handling, TypeScript, etc.) — content pulled directly from specific, individually-vetted MIT-licensed GitHub sources (not installed through a skill-marketplace CLI, which turned out to have no working install artifacts for anything relevant at the time). Each file's `metadata.vetted` field records where it was reviewed from, its license, and — importantly — where its guidance **doesn't** match this project's actual conventions (e.g. the React skill's Next.js/RSC sections don't apply to this Vite SPA; the Postgres skill's bigint-PK recommendation conflicts with this schema's established UUID convention). Read that field before treating a skill's advice as this project's own convention.

## Current priorities (work through in order; each is a vertical slice with its own DoD)

### Priority 1 — Close the testing gap on what's already built

`backend/src` has 22 built domain modules; **all 22** (`auth`, `analytics`, `appointments`, `availability`, `blocks`, `clinicians`, `clinics`, `email-templates`, `languages`, `lookups`, `messages`, `notifications`, `organizations`, `patients`, `products`, `public`, `reviews`, `rooms`, `services`, `staff`, `test-results`, `users`) now have `.spec.ts` coverage, plus both global guards (`common/guards/*.spec.ts`) — the unit-test half of this priority's DoD is done. `frontend/e2e/` now has real-backend specs for **all 22 domains** — each one confirmed real (not mock-fallback) via live inspection before the spec was written (`context/qa-full-inventory.md` §7), not assumed; five of those (`analytics`, `public`, `services`, `staff`, `users` — see below) required finding the *right* page to target or fixing a real bug first, since the obvious route was either mock-only or broken. `admin-roles.spec.js` (pre-existing) doesn't count toward this — it exercises `admin/Roles.jsx`, which is still 100% `mocks/store.js`-driven. `public` needed two real fixes before a spec was possible (`@Public()` on `getClinicianAvailability`, `App.jsx`'s `OptionalAuthShell`) — `pages/public/landing.jsx` itself is still mock, so its specs go straight to `/doctor/:id`/`/appointments/book` with a real clinician id instead. `services` needed a full rewrite of `manager/services/index.jsx` against the real `services`/`productCategories` contract plus a real backend bug fix (`ServicesService.toGraphQL()` crashing on any service with a linked clinician; fixed both the bug and its unit test). `staff` — the last domain, closed out this session — needed `staff/{index,new,edit}.jsx` rewired off `mocks/store.js` entirely onto `backend/src/staff`'s pre-existing (never-wired) resolvers, which surfaced three real bugs in the process: (1) `StaffService.create()`/`update()` let a `phone` (globally `@unique`, for OTP login) or `update()`-time `email` collision hit Prisma directly, leaking a raw unique-constraint error — including an internal file path — to the client instead of a clean `ConflictException`, fixed with an explicit pre-check mirroring the existing email-on-create check, plus 5 new `staff.service.spec.ts` cases; (2) `admin-users.spec.js` (a different, previously-green spec) broke as a side effect — it assumed `admin@medibook.dev` would be on the users directory's default unfiltered first page, but that page is server-paginated at 8 rows/page newest-first, and the new `staff` spec's account creation was the row that finally pushed the real (accumulating, never-reset) dev-DB user count from 8 to 9, bumping the oldest seeded account off page 1 — fixed by searching for each account rather than assuming page-1 visibility, the same "don't assume a stable dataset against a real, growing backend" lesson as the `services` price-locator fix below; (3) `staff/index.jsx`'s table had no `TableContainer` wrapper (every other `Table`-based list page in the app has one), so real (wider, more numerous) data overflowed the viewport at both 360px and 1280px — not caught before because mock data happened to fit; fixed by adding the wrapper to match the established convention. `UpdateStaffInput` has no password-reset field and `CreateStaffInput` has no `status`/`since` fields — both logged as open questions (`context/open-questions.md` #3) rather than guessed at; the edit page's password field is disabled with an explanatory note instead of silently dropping input, and the create page's Status section now says new staff always start Active. Full e2e suite now confirmed fully green at 28/28 (run in small batches rather than one long `--workers=1` invocation, after the dev machine's host resource contention made single long runs unreliable to observe) — one other real bug found and fixed in the process: `manager-services.spec.js`'s price assertion used a page-wide `getByText('₹50.00')`, which broke once repeated real-backend test runs had accumulated more than one prior ₹50 `E2E Service *` row (the spec creates but never deletes its test service) — fixed by scoping the assertion to the specific service's `MuiCard-root`. Backend `npm test` also reconfirmed green (405/405, 37 suites) same session.

1. Pick one domain at a time from the e2e gap above (all 22 backend domains now have unit coverage; the remaining work here is writing/confirming each domain's Playwright spec).
2. Write unit tests per resolver/service: happy path, validation failures, tenant-isolation AND self-scoping (see Architecture) both provably rejected for cross-tenant/cross-patient/cross-clinician access, role-gating (`@Auth`/`@Public` behaving as declared) — a resolver-vs-real-source cross-check like this has found a real, previously-unfixed security bug in every domain checked closely so far, so treat "read the code while writing the matrix" as part of the test-writing step, not a separate audit.
3. Add/confirm at least one e2e test per domain's critical user path (Playwright, `frontend/`).
4. Run `npm test` (backend) and `npm run e2e` (frontend) green before moving to the next domain.
5. Commit per domain: `test(backend): add auth module tests`, etc.

**DoD:** every existing domain module has unit test coverage for happy path + tenant isolation + self-scoping + role gating (✅ done, all 22), and at least one e2e path is green against the real backend, not mocks (✅ done — all 22 domains have a real-backend e2e spec, full suite confirmed green at 28/28). Priority 1 is complete; move to Priority 2.

### Priority 2 — Build the remaining domains

Finances/Billing (Razorpay integration for patient payments, subscription billing via Stripe, `PaymentTransactions` with GST fields — note `PaymentTransactions` already exists but is scoped to tenant SaaS-subscription billing only, a per-appointment patient-payment model still needs to be designed), most of Settings, Communications/Policies UI tabs.

For each: audit the frontend's existing `gql` calls for that domain first (rule 7), then follow the same build → test → integrate → verify-responsive → commit loop as Priority 1, using `context/backend-api-requirements-master-plan.md` as the acceptance spec.

**DoD per domain:** resolvers match the frontend's existing contract exactly, tests green (including tenant isolation), e2e path verified, responsive at 360/768/1280px, mock dependency removed for this domain's operations, committed.

### Priority 3 — Full mock-removal sweep

1. Grep every page for `mocks/store.js` imports or inline mock usage; cross-check against which backend domains now exist.
2. For any page still on mocks despite its backend existing, wire it to the real resolver and verify.
3. For domains genuinely still without a backend (rare after Priority 2), leave the fallback but make it visible in dev (e.g. a console warn), not silent.
4. Full responsive sweep across every page, not just newly touched ones.
5. Load the seed dataset and manually verify empty states, edge cases (no doctors, no slots, cancelled appointments), and realistic volume.

**DoD:** no page silently falls back to mock data for a domain with a real backend; full test suite green end to end; final commit summarizing the sweep.

## Session resume protocol

When a session starts or resumes (including on a bare "continue"):

1. Run `git log --oneline -15` to see the last verified commits and infer which priority/domain was in progress.
2. Check `context/open-questions.md` for anything unresolved that blocks continuing (may not exist yet — that means nothing's been logged, not that the file is missing by mistake).
3. Run `docker compose up -d` and check `docker logs medibook_backend --tail 50` for a clean compile before touching code.
4. Resume at the first unmet DoD item for the in-progress priority — don't restart a domain that's already fully green.
5. State which DoD items are satisfied after each step before moving on. Only stop for genuine ambiguity (rule 10) or a failed DoD — don't ask permission between routine steps.