---
id: PLAN004
type: plan
feature: phase1-docker-auth
created: 2026-08-17
updated: 2026-08-17
status: done
parent: unknown
related: []
---

# Backend Increment 1 — Docker + Authentication Module + Frontend Integration

**STATUS: ✅ Complete and verified end-to-end**, fully containerized (`docker compose up` — postgres, redis, backend, frontend all running and communicating), 2026-08-17.

Verified working: login (all 5 seeded demo accounts + a real registration), `me`, `logout` (revokes all sessions), OTP request/verify (stubbed SMS, logged server-side), password reset request, refresh-token rotation + reuse rejection, account lockout (Redis-tracked, independent of the IP rate limiter), role guard infrastructure. Verified via direct GraphQL calls AND via a real browser (Playwright) driving the actual login form against the actual backend — not mocks.

**Real bugs found and fixed during integration** (beyond what the plan below anticipated):
1. Frontend `login.jsx` destructured `const { token, user } = data.login`, but the query (and now the real backend) returns `access_token`, not `token` — a pre-existing bug that silently no-op'd token storage while still navigating past login. Fixed.
2. GraphQL type naming: `me`'s response type must be named exactly `User` (not `AuthUser`) to satisfy the frontend's `fragment UserFields on User`.
3. `LOGOUT_MUTATION` has zero arguments (`{ logout }`, scalar return) — redesigned server-side logout to revoke all of a user's active refresh tokens (tracked in a Redis set) rather than requiring the frontend to hold and pass one.
4. `user.clinician { id, full_name, avatar_url, clinician_type { id, name } }` is a real nested object the frontend queries — `Clinicians.clinician_type` has no FK to a type table yet (plain string), so `clinician_type.id`/`.name` are both synthesized from that string as a documented simplification until the Clinicians domain gets its own increment.
5. `UserProfiles.role_id` is a single FK (one role per user), not a many-to-many — wrapped as a single-item `roles: [...]` array to satisfy the frontend's array-shaped contract.
6. `ThrottlerGuard`/`AuthGuard` both needed GraphQL-context-aware subclasses (`GqlThrottlerGuard`, `GqlAuthGuard`) — the NestJS defaults assume a plain HTTP `ExecutionContext` and silently break under GraphQL.
7. Missing `phone @unique` on `UserProfiles` (needed for unambiguous OTP lookup) and a missing Prisma-Alpine OpenSSL package in the Docker image (known runtime-risk warning, fixed proactively) — both added.

Below is the plan this was built against.

**Scope of this increment:** `context/backend-implementation-plan.md` Phases 1–3, built as one working vertical slice — Docker infra swap, NestJS scaffold, Prisma/Postgres, the Auth module against `test-cases/01-authentication/test-cases.md`, and wiring the real frontend to it. Everything else (appointments, patients, billing, etc.) stays on mocks until its own increment.

**Analysis this plan is based on:**
- `backend/` currently holds only the old Laravel/Lighthouse scaffold (`composer.json`, `docker/php`, `docker/nginx`, `database/mysql/init.sql`, `graphql/schema.graphql`) — no real app code, safe to replace per `CLAUDE.md`.
- `docker-compose.yml` currently wires `php-fpm`+`nginx`+`mysql`+`redis`+`frontend`+`phpmyadmin`+`horizon` — being replaced with a Node/Postgres equivalent.
- `schema.prisma` (repo root) already has `Users`, `UserProfiles`, `Roles` (via `roles[]`/`RolePermissions`/`UserRoles`), all validated — this becomes `backend/prisma/schema.prisma`.
- `frontend/src/context/AuthContext.jsx` and `frontend/src/pages/auth/login.jsx` **already try the real `LOGIN`/`ME` GraphQL operations first**, falling back to mocks only on failure — so once the backend returns the exact contract shape, login should work with no frontend rewrite, only verification.
- Local tooling confirmed: Node v18.13.0, Docker 20.10.6, Docker Compose v2.0.0-beta.1 (old — keep compose syntax conservative, matching what the existing file already uses successfully).

---

## 1. Docker infrastructure

Replace in `docker-compose.yml`:
- `mysql` → `postgres:16-alpine`, `postgres_data` volume, drop MySQL-specific `command:` flags, healthcheck via `pg_isready`.
- `php-fpm` + `nginx` → single `backend` service (`node:20-alpine`, mounts `./backend`, runs `npm run start:dev`), exposing the GraphQL port directly (no reverse proxy needed for local dev).
- `phpmyadmin` → drop (or add `pgadmin` later if needed — not blocking for this increment).
- `horizon` → drop for now; BullMQ worker gets its own service once a domain actually needs background jobs (none yet in Auth).
- Keep `redis` and `frontend` as-is.
- New `backend/Dockerfile` (multi-stage: `development` target running `npm run start:dev` with volume-mounted source for hot reload, matching the `frontend/Dockerfile` pattern already in the repo).
- Root `.env` additions: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`.

## 2. NestJS scaffold (`backend/`)

```
backend/
  package.json
  tsconfig.json
  nest-cli.json
  prisma/
    schema.prisma          (moved from repo root, datasource updated)
    seed.ts
  src/
    main.ts
    app.module.ts
    prisma/
      prisma.service.ts
      prisma.module.ts
    common/
      guards/roles.guard.ts
      guards/gql-auth.guard.ts
      decorators/roles.decorator.ts
      decorators/current-user.decorator.ts
    auth/
      auth.module.ts
      auth.service.ts
      auth.resolver.ts
      dto/ (login.input.ts, register.input.ts, request-otp.input.ts, verify-otp.input.ts, forgot-password.input.ts, reset-password.input.ts)
      strategies/jwt.strategy.ts
      entities/ (auth-payload.entity.ts, user.entity.ts)
```

Remove the old Laravel scaffold files (`composer.json`, `docker/php`, `docker/nginx`, `database/mysql`, `graphql/schema.graphql`) — already confirmed empty/unused, documented as being replaced in `CLAUDE.md`.

## 3. Prisma

- `npx prisma init` inside `backend/`, then move the (already-extended, already-validated) root `schema.prisma` into `backend/prisma/schema.prisma`, `datasource.url = env("DATABASE_URL")`.
- `prisma migrate dev --name init` generates the first migration.
- `prisma/seed.ts`: creates the 5 demo accounts the frontend already hardcodes in `login.jsx`'s `MOCK_USERS` (`admin@medibook.dev`, `manager@medibook.dev`, etc.) — same emails/passwords, now real bcrypt-hashed rows — so QA can log in exactly as before, just against a real backend.

## 4. Auth module — implements `test-cases/01-authentication/test-cases.md`

Built this increment (Critical/High priority cases): `login`, `me`, `logout`, `register`, `requestOtp`/`verifyOtp` (SMS **stubbed** — logs the OTP server-side instead of calling MSG91, since no real provider account exists yet; contract/flow is real, the SMS send is mocked and clearly marked as such), `forgotPassword`/`resetPassword`, refresh-token rotation, role guard, rate limiting, account lockout.

**Deferred to the domain that actually needs it** (not in scope here): row-level ownership scoping tests (TC-AUTH-API-008/009/010) — these require `Patients`/`Clinicians`/`ClientOrganizations` data to exist meaningfully, so they get exercised once those domains are built. The guard infrastructure (role checks, JWT validation) is built now; the *ownership* checks land with each domain's own resolvers.

- **Password hashing:** bcrypt, cost 12.
- **JWT:** access token 15 min (`sub`, `roles`, `client_org_id`, `iat`, `exp`), refresh token 7 days, rotation on every use (old refresh token invalidated immediately — tracked in Redis).
- **OTP:** 6-digit, Redis-backed, 5-min TTL, max 3 verify attempts.
- **Rate limiting:** `@nestjs/throttler` on `login`/OTP endpoints.
- **Account lockout:** Redis-backed failed-attempt counter per account, 5 attempts → locked for a cooldown window.
- **Response contract — must match exactly** what `AuthContext.jsx`/`login.jsx` already destructure: `{access_token, token_type: "Bearer", expires_in, user: {id, email, roles: [{name}], clinician}}`.

## 5. Frontend integration (verification, not a rewrite)

- `frontend/.env`: point `VITE_GRAPHQL_URL` at the new backend service.
- `frontend/src/apollo/client.js`: the current 2-second hard abort + silently-swallowed error (built for demoing against no backend at all) needs a longer timeout now that a real backend exists — adjust so real network latency isn't misread as "backend offline."
- `login.jsx`/`AuthContext.jsx`: no code change expected — verify the real `LOGIN`/`ME` calls now succeed end-to-end against the seeded demo accounts, in the browser, via Playwright (not just curl).

## 6. Verification steps

1. `docker compose up -d postgres redis` → healthy.
2. `npx prisma migrate dev` + `npx prisma db seed` inside `backend/`.
3. Start backend (`npm run start:dev` or via the `backend` compose service) — confirm GraphQL endpoint responds.
4. `curl`/GraphQL client: `login` with a seeded demo account → verify exact response shape.
5. Start frontend, log in via the browser as a seeded demo account (e.g. `manager@medibook.dev`) — confirm it reaches `/manager/dashboard` using the **real** token round-trip, not the mock fallback (check Apollo DevTools/network tab, not just that navigation happened).
6. Re-run `me`, `logout`, refresh rotation, rate-limit, and lockout test cases from `test-cases/01-authentication/test-cases.md` against the running backend.
