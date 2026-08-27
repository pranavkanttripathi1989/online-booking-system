---
id: REQ153
type: improvement
feature: platform-nfr
created: 2026-08-27
updated: 2026-08-27
status: done
parent: null
related: [PLAN194, TP214, TR214]
---

# REQ153 — Observability: health checks, error tracking, tracing, Web Vitals

## Why this slice

`project-plans/phase-plans/01-phase1-close-the-gates.md`'s P1-18 slice.
Research confirmed this was entirely greenfield before this slice: no
`/health` endpoint, no error-tracking SDK on either side, no distributed
tracing, and no real-user performance measurement anywhere in the
codebase — a production incident today has no signal beyond `docker
logs` and whatever a user happens to report.

## User story

As the team operating MediBook in production, I want a real health
endpoint a load balancer/uptime monitor can poll, unexpected backend and
frontend errors reported (with PHI/PII stripped, per SEC-5), real
distributed traces across a request, and real Core Web Vitals from
actual users — so an incident is visible before a patient calls to
report it, not after.

## Acceptance criteria

- **Given** `GET /health`, **then** it returns `200 {status: 'ok', checks:
  {postgres, redis}}` when both dependencies respond, and a real `503`
  with `status: 'degraded'` when either does not — never a raw thrown
  error.
- **Given** an unexpected (`INTERNAL_SERVER_ERROR`-classified) GraphQL
  error in production, **then** it is reported to Sentry with the error
  type name and stack trace only — message, request, user, extra,
  contexts and breadcrumbs are never attached, by construction (an
  allowlist, not a blocklist).
- **Given** a routine business rejection (`BadRequestException`,
  `NotFoundException`, `ForbiddenException`, ...), **then** it is
  **not** reported to Sentry — those are normal request handling, not
  incidents.
- **Given** a React error boundary catches a rendering error, **then**
  it is reported the same way, client-side, with the same allowlist.
- **Given** `OTEL_ENABLED=true` (or a real collector endpoint
  configured), **then** real spans are created for HTTP/GraphQL
  requests and exported — live-verified via the console exporter.
  Unset (the default), tracing is a clean no-op.
- **Given** a real page load, **then** LCP/INP/CLS/FCP/TTVB are measured
  client-side and posted to `POST /observability/web-vitals` with a
  route *pattern* only — never a resolved URL containing a record id.
- **Given** `SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT`/`VITE_SENTRY_DSN`
  are all unset (the default in every environment today), **then**
  every one of the above is a clean, silent no-op — matching this
  codebase's own established "unconfigured vendor" convention.

## In scope

- Backend: hand-rolled `HealthController` (`GET /health`, `@Public()`,
  parallel Postgres `SELECT 1` + Redis `PING`) — not `@nestjs/terminus`,
  whose peer-dependency surface (`@grpc/grpc-js`, `mongoose`, `typeorm`,
  `sequelize`, `@mikro-orm/*`) is entirely unused here for two checks.
- Backend: `@sentry/node`, allowlist-based scrubbing
  (`observability/sentry.ts`), wired into `main.ts` (crash-during-boot
  capture) and `app.module.ts`'s `formatError` hook (gated to
  `INTERNAL_SERVER_ERROR` only).
- Backend: `@opentelemetry/sdk-node` bootstrap (`tracing.ts`), imported
  as the literal first line of `main.ts` for correct require-order
  auto-instrumentation; gated on `OTEL_ENABLED`/`OTEL_EXPORTER_OTLP_ENDPOINT`.
- Backend: `POST /observability/web-vitals` (`@Public()`, validated DTO,
  logged structurally — no storage table, this is a log-shipped metric
  by design at this scale).
- Frontend: `@sentry/react`, loaded via a **dynamic import** inside
  `utils/errorReporting.js` (never static — the initial bundle is
  measured at 344.7/350 KB, almost no headroom against the `size-limit`
  CI gate), wired into `ErrorBoundary.jsx`. Identical allowlist scrubbing
  to the backend.
- Frontend: `web-vitals` (~2 KB, stays in the initial bundle — it must
  observe from first paint), `utils/reportWebVitals.js`, wired into
  `main.jsx`.
- `docker-compose.yml`: `SENTRY_DSN`/`OTEL_ENABLED`/
  `OTEL_EXPORTER_OTLP_ENDPOINT` added with the same
  quiet-unless-configured default as every other vendor var in that file.

## Deliberately out of scope

- A real Grafana/Datadog dashboard. This slice produces the real signal
  (`/health`, Sentry-shaped errors, OTel spans, Web Vitals events) a
  dashboard would consume — building the dashboard itself requires
  deploying and pointing a real instance at that signal, a separate
  infra decision (which vendor, who hosts it, who's on call) outside a
  code slice's scope. Documented here rather than silently skipped.
- Alerting/paging rules on any of the above — same reasoning.
- `@nestjs/terminus`-style pluggable health indicators — two checks
  don't justify the abstraction; add it if a third, meaningfully
  different check class is ever needed.
- Session replay, performance-trace sampling above `tracesSampleRate: 0`
  (error capture only) — both would materially increase what Sentry
  sees, in tension with SEC-5.
- A persisted `WebVitalEvents` table — structured log lines are
  sufficient at current scale; revisit if a real dashboard needs to
  query history rather than tail logs.
