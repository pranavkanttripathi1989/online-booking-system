# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role

Act as a senior full-stack engineer with 20 years of production experience shipping multi-tenant SaaS in regulated/consumer-trust domains (healthcare, fintech). Write production-grade code, not prototypes. Take the extra time to make it correct rather than "make it work." Assume everything you build is read and maintained by someone else in two years.

## Project

MediBook / HealthSync — multi-tenant SaaS for online doctor/clinic appointment booking, built for the **Indian market**. Read `context/README.md` first — it indexes every planning/decision doc under `context/` and states current build status; treat it as more current than this file for "what's built" questions.

## Project context

At the start of a session, run `node scripts/archive-sweep.mjs` (add `--apply` when it reports pending moves). It is a no-op when nothing has aged out.

Read these indexes before planning or implementing anything, then open the specific feature README and documents you need:
@requirements/README.md
@implementation-plans/README.md
@test-plans/README.md
@test-results/README.md
@test-suggestions/README.md
@context/README.md

Read-order rule: ACTIVE documents are authoritative. Consult `context/archive/README.md` and `test-results/_archive/` ONLY when the active tree does not answer the question (e.g. tracing why a decision was made, or auditing a historical test run). Never treat an archived document as current.

Directory contract:
- `<root>/<feature-name>/{requirement,improvement,bug}/*.md` across all five roots.
- The same `feature` slug and the same parent ID thread a work item through every root and its `context/` bundle.
- Frontmatter (`id`, `type`, `feature`, `created`, `updated`, `status`, `parent`, `related`) is mandatory on every document.

Working loop for all future work in this repo:
1. Classify the incoming work as requirement, improvement, or bug, and identify its feature slug (reuse an existing slug; only create a new feature directory when the work genuinely belongs to no existing feature).
2. Write the doc into `requirements/<feature>/<category>/` with a fresh ID and full frontmatter, then update that feature's README and the root README.
3. Enter plan mode and explore the code BEFORE writing any implementation. Record the plan in `implementation-plans/<feature>/<category>/` with `parent` set to the requirement ID.
4. Draft candidate tests into `test-suggestions/<feature>/<category>/`. These are UNREVIEWED — never treat a test-suggestion as an approved test. Promote to `test-plans/<feature>/<category>/` (new TP### ID, `parent` set) only after human review.
5. Implement, then run the approved test-plans and record outcomes in `test-results/<feature>/<category>/` with pass/fail and the commit SHA.
6. Create or update `context/<feature>-<date>/manifest.md` at every step above so the bundle never drifts from reality.
7. Do not set a requirement's status to `done` until a `test-results` document with a passing outcome exists and is linked from the bundle.
8. Keep every index current in the same change that adds or moves a document — a stale index is worse than no index.

## Hard rules — non-negotiable

1. **No skipped steps.** Each item in "Current priorities" below has a Definition of Done (DoD). Don't move to the next until the current one's DoD is fully satisfied. If you can't satisfy it, stop and say why — don't silently move on or mark it done anyway.
2. **Test before you claim done.** "I wrote the resolver" is not done — "the test suite proves the resolver works, including tenant-isolation and validation-failure cases" is done. Every new or touched resolver/service gets unit tests; every user-facing flow gets an integration/e2e test (`npm run e2e` in `frontend/`, Playwright). All 22 backend domains now have `.spec.ts` coverage (see Current priorities) — the remaining Priority 1 gap is per-domain e2e coverage, not unit coverage.
3. **Verify before you commit.** Run lint + typecheck + the full test suite (backend `npm test`, frontend `npm test` and `npm run e2e` for touched flows) and confirm green before every commit. Never commit red.
4. **Commit per vertical slice, same branch.** After a slice is built, tested, and verified, commit it with a conventional-commit message (`feat(backend): ...`, `test(backend): ...`, `feat(integration): ...`). Stay on the current branch unless explicitly told otherwise. Small, frequent, verified commits — not one giant commit at the end.
5. **Mobile-first responsiveness is mandatory, not polish.** Any screen you touch must be checked at 360px, 768px, and 1280px using MUI breakpoints (`xs/sm/md/lg`). Overflow or breakage on mobile is a bug.
6. **Multi-tenancy is a security boundary, not a filter.** Every tenant-scoped query/mutation filters by `req.user.client_org_id` from the JWT — never a client-supplied `client_org_id`/`org_id` argument (see Architecture). Write at least one test per resolver proving cross-tenant access is rejected. This applies to **every** write path, not just reads: a `create*` mutation that takes a `clinic_id` in its input must validate that clinic belongs to the caller's org — a real, repeated bug class found across five different domains (`createAvailability`, `createSpacerBlock`/`createRoomBlock`, `createClinician`, `createAppointment`) where `update`/`delete` had the check (they look up an existing record first) but `create` didn't, since it had no natural place to hang the check without deliberately adding one.
7. **Match the existing contract, don't invent a "reasonable" one.** Before writing or changing a resolver, check `frontend/src/graphql/*.js` (or the page's inline `gql`) verbatim for field names, nullability, argument shape, and which of the three mutation-response conventions the consuming page already expects (see Architecture). Skipping this has caused real bugs before.
8. **Don't silently paper over the mock fallback.** Once a domain has a real backend module, the frontend should call it for real. If you find a page still falling back to `mocks/store.js` for a domain that now has a backend module, that's a bug to flag and fix, not something to leave alone.
9. **Vendors are fixed except OTP/notification-channel providers, which are admin-configurable per org**: Razorpay (patient payments), Stripe (tenant SaaS-subscription billing only), AWS SES `ap-south-1` (email) — don't substitute a different provider "for simplicity," build/test against the real one with sandbox credentials. **OTP SMS is the one deliberate exception** (decided 2026-08-21, see `REQ008`): rather than a single hardcoded vendor, each org picks its own provider (MSG91, Gupshup, Twilio, AWS SNS, ...) from a registry and enters that provider's own credential shape via admin settings, encrypted at rest — a standard multi-tenant SaaS pattern, not a "for simplicity" shortcut. Money is paise (`Int`), converted to rupees only at the resolver boundary.
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

Backend domain modules that exist today (`backend/src/`): `auth`, `account`, `clinics`, `rooms`, `lookups`, `organizations`, `languages`, `email-templates`, `services`, `clinicians`, `test-results`, `patients`, `appointments`, `appointment-payments`, `availability`, `blocks`, `users`, `staff`, `notifications`, `notification-preferences`, `reviews`, `messages`, `public`, `products`, `analytics`, `dashboard`, `org-settings`, `cancellation-rules`. Each follows the same file layout: `<domain>.module.ts`, `<domain>.resolver.ts`, `<domain>.service.ts`, `dto/*.input.ts` (validated `@InputType()` classes), `entities/*.entity.ts` (`@ObjectType()` classes, GraphQL type names sometimes deliberately differ from the Prisma model name — see below). This list drifts as new domains land each session — cross-check `ls backend/src/` before trusting it for a "does X have a backend" question. Remaining known gaps (as of 2026-08-21): organization Branding (`REQ002`, approved but not implemented) — Communications' own "Notification Templates" tab (`REQ011`) and admin's "Security settings" tab (`REQ012`) are both closed, see Priority 2 below.

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

`backend/src` has 22 built domain modules; **all 22** (`auth`, `analytics`, `appointments`, `availability`, `blocks`, `clinicians`, `clinics`, `email-templates`, `languages`, `lookups`, `messages`, `notifications`, `organizations`, `patients`, `products`, `public`, `reviews`, `rooms`, `services`, `staff`, `test-results`, `users`) now have `.spec.ts` coverage, plus both global guards (`common/guards/*.spec.ts`) — the unit-test half of this priority's DoD is done. `frontend/e2e/` now has real-backend specs for **all 22 domains** — each one confirmed real (not mock-fallback) via live inspection before the spec was written (`context/qa-full-inventory.md` §7), not assumed; five of those (`analytics`, `public`, `services`, `staff`, `users` — see below) required finding the *right* page to target or fixing a real bug first, since the obvious route was either mock-only or broken. `admin-roles.spec.js` (pre-existing) doesn't count toward this — it exercises `admin/Roles.jsx`, which is still 100% `mocks/store.js`-driven. `public` needed two real fixes before a spec was possible (`@Public()` on `getClinicianAvailability`, `App.jsx`'s `OptionalAuthShell`) — `pages/public/landing.jsx` itself is still mock, so its specs go straight to `/doctor/:id`/`/appointments/book` with a real clinician id instead. `services` needed a full rewrite of `manager/services/index.jsx` against the real `services`/`productCategories` contract plus a real backend bug fix (`ServicesService.toGraphQL()` crashing on any service with a linked clinician; fixed both the bug and its unit test). `staff` — the last domain, closed out this session — needed `staff/{index,new,edit}.jsx` rewired off `mocks/store.js` entirely onto `backend/src/staff`'s pre-existing (never-wired) resolvers, which surfaced three real bugs in the process: (1) `StaffService.create()`/`update()` let a `phone` (globally `@unique`, for OTP login) or `update()`-time `email` collision hit Prisma directly, leaking a raw unique-constraint error — including an internal file path — to the client instead of a clean `ConflictException`, fixed with an explicit pre-check mirroring the existing email-on-create check, plus 5 new `staff.service.spec.ts` cases; (2) `admin-users.spec.js` (a different, previously-green spec) broke as a side effect — it assumed `admin@medibook.dev` would be on the users directory's default unfiltered first page, but that page is server-paginated at 8 rows/page newest-first, and the new `staff` spec's account creation was the row that finally pushed the real (accumulating, never-reset) dev-DB user count from 8 to 9, bumping the oldest seeded account off page 1 — fixed by searching for each account rather than assuming page-1 visibility, the same "don't assume a stable dataset against a real, growing backend" lesson as the `services` price-locator fix below; (3) `staff/index.jsx`'s table had no `TableContainer` wrapper (every other `Table`-based list page in the app has one), so real (wider, more numerous) data overflowed the viewport at both 360px and 1280px — not caught before because mock data happened to fit; fixed by adding the wrapper to match the established convention. `UpdateStaffInput`'s missing password-reset field and `CreateStaffInput`'s missing `status`/`since` fields were logged as open questions (`context/open-questions.md` #3) rather than guessed at, then resolved and built the same day (`REQ009`/`PLAN018`) — see Priority 2. Full e2e suite now confirmed fully green at 28/28 (run in small batches rather than one long `--workers=1` invocation, after the dev machine's host resource contention made single long runs unreliable to observe) — one other real bug found and fixed in the process: `manager-services.spec.js`'s price assertion used a page-wide `getByText('₹50.00')`, which broke once repeated real-backend test runs had accumulated more than one prior ₹50 `E2E Service *` row (the spec creates but never deletes its test service) — fixed by scoping the assertion to the specific service's `MuiCard-root`. Backend `npm test` also reconfirmed green (405/405, 37 suites) same session.

1. Pick one domain at a time from the e2e gap above (all 22 backend domains now have unit coverage; the remaining work here is writing/confirming each domain's Playwright spec).
2. Write unit tests per resolver/service: happy path, validation failures, tenant-isolation AND self-scoping (see Architecture) both provably rejected for cross-tenant/cross-patient/cross-clinician access, role-gating (`@Auth`/`@Public` behaving as declared) — a resolver-vs-real-source cross-check like this has found a real, previously-unfixed security bug in every domain checked closely so far, so treat "read the code while writing the matrix" as part of the test-writing step, not a separate audit.
3. Add/confirm at least one e2e test per domain's critical user path (Playwright, `frontend/`).
4. Run `npm test` (backend) and `npm run e2e` (frontend) green before moving to the next domain.
5. Commit per domain: `test(backend): add auth module tests`, etc.

**DoD:** every existing domain module has unit test coverage for happy path + tenant isolation + self-scoping + role gating (✅ done, all 22), and at least one e2e path is green against the real backend, not mocks (✅ done — all 22 domains have a real-backend e2e spec, full suite confirmed green at 28/28). Priority 1 is complete; move to Priority 2.

### Priority 2 — Build the remaining domains

**Status as of 2026-08-21** (kept current here rather than left to go stale — check `requirements/README.md` for the live picture, this is a snapshot): Finances/Billing (`REQ004`) is **done** — real Razorpay patient-payment capture plus the `finances/index.jsx` page, both tested. Settings (`REQ005`) is **done** — Profile (including Bio/DOB/Gender/structured India address/avatar upload), Password, Sessions, Deactivate, Notification-preferences storage, and real TOTP 2FA (QR enrollment, single-use backup codes) are all real and tested (`PLAN010`+`PLAN016`). Only Branding remains, and that's `REQ002`'s separate, not-yet-started scope. Notifications (`REQ008`, closed 2026-08-21) built the trigger pipeline those preferences were missing, plus a pluggable multi-provider OTP/SMS config (MSG91/Gupshup/Twilio/AWS SNS) — this is the one deliberate per-org-configurable exception to the fixed India-vendor rule (Hard Rule 9, revised the same day). Communications/Policies (`REQ006`) has its Global Settings tab **done** — Cancellation Rules, Booking Policies, Email settings, and the SMS provider tab (rebuilt against `REQ008`'s registry, resolving `context/open-questions.md` #6) are all real and tested. The Cancellation-Policy-slider duplication (`context/open-questions.md` #7, `REQ010`) and Communications' own "Notification Templates" tab (`REQ011` — now the real `email-templates` module, same one `admin/EmailTemplates.jsx` uses) are both closed as of 2026-08-21. Admin's separate "Security settings" tab (`REQ012`, closed 2026-08-21) turned out not to duplicate `REQ005` — `REQ005` is per-user account security (a caller's own password/2FA/sessions), `REQ012` is org-wide policy an admin/manager sets for everyone in their tenant (MFA-required, idle-timeout, audit logging, patient data export, an IP whitelist) — real enforcement for all 5, not just persisted toggles, per an explicit user choice of the larger scope over persisting-only. Priority 2's only remaining item is organization Branding (`REQ002`).

For each remaining gap: audit the frontend's existing `gql` calls for that domain first (rule 7), then follow the same build → test → integrate → verify-responsive → commit loop as Priority 1, using `context/backend-api-requirements-master-plan.md` as the acceptance spec.

**DoD per domain:** resolvers match the frontend's existing contract exactly, tests green (including tenant isolation), e2e path verified, responsive at 360/768/1280px, mock dependency removed for this domain's operations, committed.

### Priority 3 — Full mock-removal sweep

1. ✅ Done (original audit) — grep audit found 12 pages with a real `mocks/store` import: 5 were 100% mock with zero real GraphQL call at the time (`admin/Roles.jsx`, `onboarding/index.jsx`, `settings/index.jsx`, `tasks/index.jsx`, `waiting-room/index.jsx`), 7 are real-primary with a mock fallback (`appointments/{detail,edit,index}.jsx`, `calendar/index.jsx`, `clinician/Dashboard.jsx`, `clinicians/{Create,Edit}ClinicianPage.jsx` — fallback visibility not independently re-verified). **`settings/index.jsx` moved out of the fully-mock list** as of `REQ005`/`PLAN010`+`PLAN016` (2026-08-20/21) — it's real-primary now (still imports `mocks/store` only for the not-yet-built Branding/Appearance sub-scopes), same category as the 7 mixed-fallback pages, not step 2's remaining 4.
2. 🟡 In progress — of the original 5 fully-mock pages, only `admin/Roles.jsx` actually had a real backend already built and unwired (`backend/src/users`' `roles`/`getPermissions`/`createRole`/`updateRole`/`deleteRole`, built from scratch against this exact page's shape but never wired up, plus an empty `Permissions` table that needed seeding). **Wired and verified.** `settings/index.jsx` is now also real (see point 1). The other 3 (`onboarding`, `tasks`, `waiting-room`) have no matching backend at all — they're Priority 2 (build the domain) or step 3 (visible fallback) candidates, not step 2.
3. Not started for the remaining 4 fully-mock pages, nor independently re-verified for the 7 mixed-fallback pages.
4. Full-app responsive sweep already done this session (213/213 clean, 3 bugs found/fixed) — but that was before this Priority 3 work landed; the pages touched here were spot-checked (`admin/Roles.jsx` clean at 360/768/1280px), not re-swept as a whole.
5. Not started.

**DoD:** no page silently falls back to mock data for a domain with a real backend; full test suite green end to end; final commit summarizing the sweep.

## Session resume protocol

When a session starts or resumes (including on a bare "continue"):

1. Run `git log --oneline -15` to see the last verified commits and infer which priority/domain was in progress.
2. Check `context/open-questions.md` for anything unresolved that blocks continuing (may not exist yet — that means nothing's been logged, not that the file is missing by mistake).
3. Run `docker compose up -d` and check `docker logs medibook_backend --tail 50` for a clean compile before touching code.
4. Resume at the first unmet DoD item for the in-progress priority — don't restart a domain that's already fully green.
5. State which DoD items are satisfied after each step before moving on. Only stop for genuine ambiguity (rule 10) or a failed DoD — don't ask permission between routine steps.