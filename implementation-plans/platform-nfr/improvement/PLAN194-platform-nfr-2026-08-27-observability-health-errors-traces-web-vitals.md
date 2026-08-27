---
id: PLAN194
type: improvement
feature: platform-nfr
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ153
related: [REQ153, TP214, TR214]
---

# PLAN194 — Observability (P1-18)

## Backend

- `backend/src/observability/health.controller.ts` — `GET /health`,
  `@Public()`. Runs `prisma.$queryRaw\`SELECT 1\`` and `redis.ping()` in
  parallel, each independently try/caught to `{ok: boolean, latency_ms?}`.
  `200` when both `ok`, else throws `HttpException(body,
  SERVICE_UNAVAILABLE)` with the same body as its own `.response` — no
  raw error ever reaches the client (`STATE-6`).
- `backend/src/observability/dto/web-vital.dto.ts` +
  `web-vitals.controller.ts` — `POST /observability/web-vitals`,
  `@Public()`, `@HttpCode(204)`. `WebVitalDto` validates `name` against a
  closed `LCP|INP|CLS|FCP|TTFB` set, structured-logs the metric — no
  storage table (see REQ153's own "deliberately out of scope").
- `backend/src/observability/sentry.ts` — `initSentry()` (no-op unless
  `SENTRY_DSN` set), `captureScrubbedException(error, tags?)`. Allowlist
  scrub, not a blocklist: `scrubError()` rebuilds a new `Error` keeping
  only `.name` and `.stack`; the SDK's own `beforeSend` hook
  (`scrubEvent()`) independently strips `message`/`request`/`user`/
  `extra`/`contexts`/`breadcrumbs` from the full Sentry event as a second
  layer, and `beforeBreadcrumb: () => null` drops breadcrumbs before they
  ever accumulate. `tracesSampleRate: 0` — error capture only.
- `backend/src/main.ts` — `initSentry()` called before
  `NestFactory.create()` so a crash during module construction is
  captured too, not just request-time errors.
- `backend/src/app.module.ts` — `formatError` hook: `captureScrubbedException`
  called **only** when `extensions?.code === 'INTERNAL_SERVER_ERROR'`.
  First draft called it unconditionally on every GraphQL error, including
  routine `BadRequestException`/`NotFoundException`/`ForbiddenException`
  rejections — caught before shipping (see "Bugs found" below).
- `backend/src/tracing.ts` — `NodeSDK` + `getNodeAutoInstrumentations()`
  (fs instrumentation disabled — noisy, no diagnostic value), exports to
  `OTLPTraceExporter` when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, else
  `ConsoleSpanExporter`. Gated on `OTEL_ENABLED==='true'` or a real
  endpoint — unconfigured is a clean no-op, matching Sentry's own
  convention. Imported as the **literal first line** of `main.ts` (before
  even `'reflect-metadata'`) — see the file's own header comment for why
  require-order matters for auto-instrumentation, and why this codebase's
  `nest-cli.json` (no `webpack: true`) makes a plain first-line import
  equivalent to `-r`/`NODE_OPTIONS` without the cross-script plumbing.
- `docker-compose.yml` — `SENTRY_DSN`/`OTEL_ENABLED`/
  `OTEL_EXPORTER_OTLP_ENDPOINT` added to the real `medibook_backend`
  service only (not the `_e2e` profile — out of scope), each defaulting
  to unset/`false`.

## Frontend

- `frontend/src/utils/errorReporting.js` — `reportError(error, info,
  routePattern?)`. `@sentry/react` loaded via a **dynamic `import()`**
  inside `ensureSentry()`, never a static import — the initial bundle
  was measured at 344.7/350 KB before this slice (`size-limit` CI gate),
  and `ErrorBoundary` is imported per-page, not app-wide, so the SDK is
  fetched only in the rare case an error boundary actually fires. Same
  allowlist-scrub design as the backend, mirrored independently (no
  shared package between frontend/backend in this repo).
- `frontend/src/components/ErrorBoundary.jsx` — `componentDidCatch` now
  also calls `reportError(error, info)`, fire-and-forget, after the
  existing `console.error`.
- `frontend/src/utils/reportWebVitals.js` — `onLCP/onINP/onCLS/onFCP/onTTFB`
  from `web-vitals` v6, each posting to the backend's own
  `/observability/web-vitals` via `navigator.sendBeacon` (survives
  page-unload mid-navigation, since CLS/INP only finalize as the user
  leaves) with a `fetch(..., {keepalive: true})` fallback. Route
  *pattern* only (`pathname.replace(/[0-9a-f-]{8,}/gi, ':id')`) — never a
  resolved URL with a real record id.
- `frontend/src/main.jsx` — `reportWebVitals()` called once, after the
  root render.

## Bugs found while building this slice

1. **Self-caught, before shipping**: the `formatError` hook's first draft
   reported every GraphQL error to Sentry unconditionally, including
   routine business rejections. Would have exhausted a real Sentry quota
   instantly and buried the genuine "was it down" signal in noise. Fixed
   by gating on Apollo's own `INTERNAL_SERVER_ERROR` classification —
   the code a recognized `HttpException` subtype never carries.
2. **Test-authoring bug, not a code bug**: an initial
   `sentry.spec.ts` test asserted `class PatientLookupError extends
   Error {}` would report `.name === 'PatientLookupError'` — standard JS
   subclassing does not do this unless the constructor sets `.name`
   explicitly. Fixed the test, not the (correct) implementation.
3. **A genuine, pre-existing environment constraint, not a new bug**:
   this repo's shared `babel.config.cjs` statically replaces every
   `import.meta` occurrence with a fresh, disconnected `({ env: {} })`
   object literal at Jest transform time (already documented in
   `documents.test.js`'s own comment) — a test that mutates
   `import.meta.env.VITE_SENTRY_DSN` at runtime is writing to a
   throwaway object the source file never reads, making the
   "DSN-configured" path of `errorReporting.js` structurally
   untestable under Jest without changing the shared babel config for
   every frontend test file (out of scope for this slice). Resolved by
   exporting `scrubEvent` — the pure SEC-5 redaction function — for
   direct unit coverage, and keeping only the genuinely-exercisable
   unconfigured/no-op path tested through `reportError` itself.
4. **jsdom's `Blob` polyfill has no `.text()`/`.arrayBuffer()`** in this
   Jest version (confirmed: works in plain Node, not under
   `jest-environment-jsdom@29`) — a `reportWebVitals.test.js` draft tried
   to read the posted payload back off the `Blob` passed to a mocked
   `sendBeacon`. Fixed by capturing the payload at `Blob` construction
   time (a spied global `Blob` constructor) instead of reading it back
   asynchronously.
5. **A stale-Prisma-Client-in-container recurrence, twice, not new
   territory** (already extensively documented in `CLAUDE.md`) — hit
   once from P1-16/P1-17's own earlier schema changes never having been
   regenerated inside `medibook_backend`, and hit a second, much larger
   time (632 errors, not 24) after `docker compose up -d backend`
   **recreated** the container to pick up the new
   `SENTRY_DSN`/`OTEL_ENABLED` env vars — recreating a container resets
   its anonymous `/app/node_modules` volume back to the image's
   build-time state, silently discarding every package installed later
   via `docker exec ... npm install` (including this slice's own
   `@sentry/node`/`@opentelemetry/*`) and the regenerated Prisma Client.
   Fixed both times with the standard `docker exec medibook_backend npm
   install && npx prisma generate && docker restart medibook_backend`
   sequence. **Not previously documented**: a container *recreate*
   (not just a `restart`) requires the full reinstall, not just
   `prisma generate` — worth carrying into `CLAUDE.md` as its own
   gotcha given this is the first time this session's history shows a
   `docker compose up -d <service>` (as opposed to a plain `restart`)
   for the backend.
6. A `prefer-const` lint error in `test/integration/no-show-risk.int-spec.ts`
   (a P1-17 file, `let createdIds` never reassigned) was caught while
   running a clean full-tree `eslint` for this slice and fixed inline —
   unrelated to this slice's own code but blocking a clean lint run.

## Live verification

- `curl http://localhost:4000/health` → `200 {"status":"ok",
  "checks":{"postgres":{"ok":true,...},"redis":{"ok":true,...}}}`.
- `curl -X POST .../observability/web-vitals` with a valid body → `204`.
- `OTEL_ENABLED=true` container recreate → real spans confirmed via
  `docker logs` (console exporter) on a real `/health` request.
- Backend: 114/114 suites, 1825/1825 tests, `eslint`/`tsc --noEmit`
  clean.
- Frontend: lint ratchet unchanged at 4820 (no new warnings from this
  slice's files); unit suite green; `errorReporting.test.js`/
  `reportWebVitals.test.js`/`health.controller.spec.ts`/
  `web-vitals.controller.spec.ts`/`sentry.spec.ts` all new, all passing.
