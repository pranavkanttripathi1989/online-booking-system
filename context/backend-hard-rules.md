# Backend Hard Rules

Mandatory engineering standards for every backend phase from Phase 4 onward. Same spirit as `frontend-hard-rules.md`: each rule below is grounded in something actually found in `backend/src` (the only real backend code that exists — the Auth module, Phases 1-3), not generic NestJS boilerplate advice. Read this before starting Phase 4.

**Companion documents, not duplicated here:** `requirements/security-requirements.md` (the full OWASP + DB-security checklist — RLS, least-privilege DB roles, encryption, backups), `context/backend-implementation-plan.md` (phase order, what's built), `test-cases/*/test-cases.md` (the spec each phase must satisfy — `TC-<DOMAIN>-API-*`/`TC-<DOMAIN>-UNIT-*`).

---

## 1. Multi-tenant scoping — `client_org_id` comes from the JWT, never from a GraphQL argument

`JwtStrategy.validate()` (`auth/strategies/jwt.strategy.ts`) already puts `client_org_id` on every authenticated request's `JwtPayload`. **Every Prisma query in every future resolver that touches a tenant-scoped model must filter by `req.user.client_org_id` from that payload — never by a `client_org_id`/`org_id` argument the client supplies.** A GraphQL argument is client-controlled; accepting one for tenant scoping is a direct cross-tenant IDOR (org A reads/writes org B's patients by changing an ID in the request). This is the single highest-risk gap flagged in `requirements/security-requirements.md` and it has to be built into each resolver as it's written in Phases 4-14, not retrofitted.

- **How to apply:** every `findMany`/`findFirst`/`update`/`delete` on a tenant-scoped model gets a `client_org_id: user.client_org_id` (or the equivalent join-path scoping, e.g. patients scoped through their clinic's org) in the `where` clause, sourced from `@CurrentUser()`, not `@Args()`.
- **Exception:** `super_admin` cross-tenant operations are a deliberate, separate, explicitly-guarded code path — not the default behavior of a normal resolver.
- Postgres RLS (`requirements/security-requirements.md` §9) is defense-in-depth on top of this, not a replacement for it — the application-level filter is still mandatory even once RLS exists.

## 2. Auth must be a global guard with a `@Public()` opt-out — per-handler `@UseGuards(GqlAuthGuard)` cannot fix the ordering problem

**Corrected during Phase 4** (this rule's original version was wrong — kept below as a worked example of why, since the same mistake is easy to repeat). `RolesGuard` (`common/guards/roles.guard.ts`) is registered globally (`APP_GUARD` in `app.module.ts`) and reads `ctx.getContext().req.user`. The first version of this rule said "pair every `@Roles()` with `@UseGuards(GqlAuthGuard)`," including a combined `@Auth()` decorator that applied both. **That fix does not work**: NestJS always runs `APP_GUARD`-registered global guards before any handler-level `@UseGuards()`, regardless of decorator order at the call site. So `RolesGuard` (global) still ran before `GqlAuthGuard` (handler-level, even via the combined decorator) had a chance to populate `req.user` — confirmed by actually calling `createClinic` with a valid token and getting `"Not authenticated"` instead of success, the first time Phase 4 exercised a `@Roles()`-guarded resolver for real.

**The real fix:** make `GqlAuthGuard` itself global too, ordered before `RolesGuard` in the `APP_GUARD` provider array (`GqlThrottlerGuard` → `GqlAuthGuard` → `RolesGuard`), so `req.user` is populated (or the request is rejected as `UNAUTHENTICATED`) for *every* resolver by default. Add a `@Public()` decorator (`common/decorators/public.decorator.ts`, metadata-based, checked inside `GqlAuthGuard.canActivate()` via `Reflector`) for the handful of resolvers that must work without a token — `login`, `register`, `refresh`, `requestOtp`, `verifyOtp`, `forgotPassword`, `resetPassword`. This is strictly safer than the old per-resolver-opt-in model too: a forgotten annotation on a new resolver now means "requires auth by default," not "wide open to the internet by default."

- **How to apply:** every new resolver is protected by default — do nothing, and it requires a valid JWT. Only add `@Public()` if the resolver must genuinely work for a logged-out caller (verify this is actually true before adding it — it's the one annotation that removes a security guarantee, not adds one). `@Roles(...)` (or the `@Auth(...)` convenience wrapper, now just an alias for `Roles()`) still gates by role on top of the mandatory auth check. Never reintroduce a per-handler `@UseGuards(GqlAuthGuard)` — it's redundant now that the guard is global, and its presence in old code is a signal the global-guard change hasn't been picked up yet.

## 3. Every mutation input is a `class-validator` DTO — no raw `Args()` objects

`main.ts` already sets `whitelist: true, forbidNonWhitelisted: true, transform: true` globally, and `register.input.ts` shows the established pattern: `@InputType()` class, one `@Field()` + validator decorator per property (`@IsEmail()`, `@MinLength(8)`, `@Matches(...)` with a regex tuned to an actual product rule, `@IsOptional()` for nullable fields). This is already correct and must stay the pattern for every new mutation — a resolver argument that isn't a validated `@InputType()` DTO bypasses the global `ValidationPipe` protection entirely.

- **How to apply:** no `@Args('foo') foo: string` for anything structured — wrap it in a DTO. Match the frontend's actual required/optional field split (check `frontend/src/graphql/mutations.js`'s input shape, not what "seems reasonable") before finalizing a DTO, the same way the Auth module's DTOs were built against the frontend's real mutation documents rather than a guessed contract.

## 4. GraphQL error responses never leak internals — no default Apollo error formatting in production

`app.module.ts`'s `GraphQLModule.forRoot()` has no `formatError`, no explicit `introspection`/playground disabling, and no `NODE_ENV`-gated `debug` flag. Apollo Server v4's default behavior includes stack traces and, worse, raw Prisma error messages (which can contain table/column names, constraint names, or query fragments) in the GraphQL response `extensions` unless explicitly stripped. This hasn't bitten anything yet because the Auth module's error paths are all deliberately generic (`UnauthorizedException('Invalid email or password')`), but nothing currently stops a future resolver's unhandled Prisma exception from reaching the client verbatim.

- **How to apply:** before Phase 4 ships its first non-Auth resolver, add a `formatError` to the `GraphQLModule.forRoot()` config that strips `extensions.exception` (stack trace, Prisma internals) when `NODE_ENV === 'production'`, and disable introspection/the Apollo sandbox in production. Every thrown error in resolver/service code should be a proper Nest `HttpException` subclass with an intentional, reviewed message (as Auth already does) — never let a raw `PrismaClientKnownRequestError` propagate to the client.

## 5. Prisma discipline — transactions for multi-row writes, hand-review every migration

`auth.service.ts`'s `register()` already establishes the pattern correctly: creating a `Users` row and its `UserProfiles` row is wrapped in `this.prisma.$transaction(async (tx) => {...})` so a partial failure can't leave an orphaned `Users` row. Any future write that touches more than one table (e.g. `createAppointment` + `AppointmentStatusLogs`, `createInvoice` + `PaymentTransactions`) must use the same pattern. Separately: `prisma migrate dev` cannot run non-interactively in this environment (confirmed during Phase 1-3 — it refuses even with `--create-only`), so every schema change ships as a **hand-written migration SQL file**, matching Prisma's own naming/constraint conventions, applied via `prisma migrate deploy`. That means migrations don't get Prisma's own review/diff safety net — they need a human diff-review against `schema.prisma` before merging, every time.

- **How to apply:** multi-table writes → `$transaction`. Every new migration file gets read end-to-end against the corresponding `schema.prisma` diff before it's applied, not just trusted because it "ran."

## 6. No secrets ship with their `.env.example` defaults

`backend/.env.example` defines `JWT_REFRESH_SECRET`/`JWT_REFRESH_TTL` — but `auth.service.ts` never reads either one; refresh tokens are opaque `crypto.randomBytes(48)` hex strings tracked in Redis, not signed JWTs, so this env var is currently dead configuration. Left as-is it's a minor footgun: someone extending Auth later might assume `JWT_REFRESH_SECRET` is load-bearing when it isn't, or a security reviewer might waste time chasing a red herring. More importantly, `docker-compose.yml` and `.env.example` both default `JWT_ACCESS_SECRET`/DB credentials to obviously-fake values (`change-me-in-production`) — fine for local dev, a real incident if a production deploy ever inherits the default.

- **How to apply:** either wire up `JWT_REFRESH_SECRET` to something real or remove it from `.env.example` — don't leave unused config that looks load-bearing. Phase 17 (deployment) must fail closed if any `change-me`-pattern secret is present in a non-development `NODE_ENV` — a boot-time assertion, not just a deployment checklist item (`requirements/security-requirements.md` §7 covers the fuller secrets-management story).

## 7. Every phase ships real tests, not just a configured test runner

`backend/package.json` already has `test`/`test:watch`/`test:cov` scripts wired to Jest — but **zero `.spec.ts` files exist anywhere in `backend/`**, including for the Auth module, which is otherwise the most mature, most-tested-by-hand part of the backend. This is the exact same gap the frontend had before this session's test-infra work: tooling configured, nothing written. Don't let it compound — a scheduling-engine bug (Phase 5's `AVAILABLE_SLOTS` resolver) or a double-booking race condition (Phase 7) is far more expensive to catch after the fact than a service-level unit test would have been.

- **How to apply:** each phase's resolvers/services ship with unit tests for the service layer (mocked Prisma) and at least one integration test hitting the real GraphQL endpoint against a test Postgres database, matching the `TC-<DOMAIN>-UNIT-*`/`TC-<DOMAIN>-API-*` cases already written in `test-cases/<domain>/test-cases.md` — those test cases are the acceptance bar per `test-cases/README.md`'s own stated methodology ("each backend phase should be considered done only when its domain's Backend/API and Unit test cases pass"), not just a wishlist nobody wired up.

## 8. Timing-safety and generic errors are the default for anything auth-adjacent, not just login

`auth.service.ts` establishes three patterns worth carrying forward into any future auth-adjacent code (password changes, email verification, admin impersonation, anything that reveals account existence): a `DUMMY_HASH` constant so a nonexistent-email login takes the same `bcrypt.compare` time as a real one (closes user-enumeration via response timing); identical generic response bodies whether an email/phone exists or not (`login`, `requestOtp`, `forgotPassword` all follow this); and per-mutation `@Throttle()` independent of the Redis-backed account lockout counter (two independent layers, not one doing both jobs).

- **How to apply:** any new resolver that reveals or acts on account/record existence by email/phone/ID (e.g. a future "invite user" or "check if this email is already registered" flow) reuses this same shape — generic response, constant-time comparison where a secret is involved, explicit `@Throttle()`. Don't rebuild a laxer version because the login-specific code isn't visible from wherever the new feature lives.

## 9. GraphQL contract fidelity — verify against `frontend/src/graphql/*.js` verbatim, never assume a "reasonable" shape

Three real bugs were only caught this way during Auth integration: the frontend destructured `access_token` but an earlier draft returned `token`; the GraphQL type had to be named exactly `User` (not `AuthUser`) to satisfy `fragment UserFields on User`; `LOGOUT_MUTATION` has zero arguments and expects a scalar `Boolean` return, not an object. None of these would have been caught by writing a resolver that "looked right" — only by opening the actual frontend query/mutation document and matching it field-for-field, type-name-for-type-name.

- **How to apply:** before writing any new resolver, read the corresponding operation in `frontend/src/graphql/queries.js`/`mutations.js` (or `context/frontend-contract-analysis.md`'s summary of it) verbatim — field names, nullability, argument shape, return type name — and match it exactly. Treat a mismatch discovered only at integration time as a process failure, not bad luck.

---

## Definition of Done (applies to every backend phase, not a subset)

- [ ] Every tenant-scoped query/mutation filters by `req.user.client_org_id`, never a client-supplied org argument (Rule 1).
- [ ] No new resolver has a stray `@UseGuards(GqlAuthGuard)` — auth is global; only genuinely public resolvers get `@Public()` (Rule 2).
- [ ] Every mutation argument is a validated `@InputType()` DTO (Rule 3).
- [ ] `formatError` strips internals in production before this phase's resolvers ship (Rule 4 — one-time, but verify it still applies as new error paths are added).
- [ ] Multi-table writes are wrapped in `$transaction`; new migrations are hand-diffed against `schema.prisma` (Rule 5).
- [ ] No new `.env.example` entries are dead/unused; no secret ships with its example default (Rule 6).
- [ ] Unit tests (mocked Prisma) + at least one real-DB integration test exist for this phase's domain, matching its `test-cases/<domain>/test-cases.md` `UNIT`/`API` cases (Rule 7).
- [ ] Any new account/record-existence-revealing endpoint follows the generic-response/constant-time/rate-limited pattern (Rule 8).
- [ ] Every field name, type name, and argument shape was checked against `frontend/src/graphql/*.js` directly, not assumed (Rule 9).
