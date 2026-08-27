---
id: CTX-platform-nfr-2026-08-27-req153
type: improvement
feature: platform-nfr
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ153
related: [PLAN194, TP214, TR214]
---

# platform-nfr — observability: health, error tracking, tracing, Web Vitals (2026-08-27)

Phase 1 slice **P1-18** (`project-plans/phase-plans/01-phase1-close-the-gates.md`),
the last of the 15-slice batch — and the last unblocked slice in Phase 1
itself (only the explicitly-blocked P1-08/09/10 ABDM gate and P1-14/15
AI voice front-desk gate remain in Phase 1, both skipped per an earlier
explicit user decision).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ153 | [Observability](../../requirements/platform-nfr/improvement/REQ153-platform-nfr-2026-08-27-observability-health-errors-traces-web-vitals.md) |
| implementation-plans | PLAN194 | [implementation plan](../../implementation-plans/platform-nfr/improvement/PLAN194-platform-nfr-2026-08-27-observability-health-errors-traces-web-vitals.md) |
| test-plans | TP214 | [test plan](../../test-plans/platform-nfr/improvement/TP214-platform-nfr-2026-08-27-observability-health-errors-traces-web-vitals.md) |
| test-results | TR214 | [results](../../test-results/platform-nfr/improvement/TR214-platform-nfr-2026-08-27-observability-health-errors-traces-web-vitals.md) |

## What shipped

- **`GET /health`** — hand-rolled (not `@nestjs/terminus`), parallel
  Postgres `SELECT 1` + Redis `PING`, `200`/`503` with latencies, never a
  raw error.
- **`@sentry/node` (backend) / `@sentry/react` (frontend)** — allowlist
  scrubbing, not a blocklist: every event is rebuilt from scratch keeping
  only the error type name and stack trace. `formatError`'s GraphQL hook
  reports only genuinely unexpected (`INTERNAL_SERVER_ERROR`) errors, not
  routine business rejections. Frontend SDK loaded via a **dynamic
  import** to protect the tight `size-limit` bundle budget.
- **Real OpenTelemetry tracing** (`NodeSDK` + auto-instrumentation),
  gated on `OTEL_ENABLED`, imported as the literal first line of
  `main.ts` for correct require-order.
- **`POST /observability/web-vitals`** + `web-vitals` (frontend) —
  LCP/INP/CLS/FCP/TTFB reported via `sendBeacon`, route pattern only.
- `docker-compose.yml` gained `SENTRY_DSN`/`OTEL_ENABLED`/
  `OTEL_EXPORTER_OTLP_ENDPOINT`, all quiet-unless-configured.

## Real bugs / gaps found

1. Self-caught before shipping: `formatError`'s first draft would have
   reported every GraphQL error to Sentry, not just genuine incidents.
2. A test-authoring bug (not a code bug): `class Foo extends Error {}`
   doesn't inherit the subclass name into `.name` without an explicit
   constructor assignment — standard JS, not this codebase's error.
3. A genuine, previously-undocumented environment constraint: this
   repo's shared `babel.config.cjs` statically replaces every
   `import.meta` occurrence with a disconnected object literal at Jest
   transform time, making a test that mutates
   `import.meta.env.VITE_SENTRY_DSN` at runtime silently ineffective.
   Resolved by exporting `scrubEvent` for direct pure-function coverage.
4. jsdom's `Blob` polyfill has no `.text()`/`.arrayBuffer()` under this
   Jest version — fixed by capturing the payload at construction time.
5. A new Docker gotcha: a container **recreate** (`docker compose up -d
   <service>`, needed to pick up new env vars) resets the anonymous
   `/app/node_modules` volume to the image's build-time state — unlike a
   plain `restart`, which does not. Hit live (632 stale-type errors), fixed
   with a full reinstall + regenerate + restart, twice.
6. An unrelated pre-existing `prefer-const` lint error (P1-17's own
   integration test file) caught and fixed by this slice's clean-lint
   requirement.

## Live verification

`curl /health` (real Postgres/Redis latencies), `curl -X POST
/observability/web-vitals` (204), and — the one genuinely uncertain
piece per this slice's own plan — `OTEL_ENABLED=true` on a real
container recreate producing a real exported span
(`graphql.parseSchema`, correct `service.name`, a real `traceId`, a real
duration) via the console exporter, confirming the first-line-import
require-order wiring actually works rather than silently producing zero
traces. Reverted to the default off state afterward and reconfirmed
quiet.

## Verification

Backend: 114/114 unit suites, 1825/1825 tests (11 new); `tsc --noEmit`/
`eslint` clean. Frontend: `errorReporting.test.js` (5/5, redesigned),
`reportWebVitals.test.js` (4/4, new); lint ratchet unchanged at 4820
warnings; full suite 252/266 passing, all 14 failures across 6
pre-existing timeout-flaky suites unrelated to this slice's files. See
TR214 for the full account.

## Deliberately out of scope

A real Grafana/Datadog dashboard consuming this signal — a separate
infra decision (which vendor, who hosts it, who's on call), not a code
slice. This slice produces the real signal a dashboard would need; the
dashboard itself is future work, documented rather than silently
skipped or faked.

## Phase 1 status after this slice

Every P1-01..P1-18 slice is now either **done** or **explicitly
blocked** (P1-08/09/10 ABDM, P1-14/15 AI voice front-desk — both need
real external vendor credentials/certification unavailable in this
environment, skipped per an explicit user decision 2026-08-27). Phase 1
is complete short of those two gates. `project-plans/phase-plans/README.md`'s
`▶ CURRENT POSITION` now points to Phase 2, `P2-02` (AI coding assist)
as the first unstarted, unblocked slice — `P2-01` depends on the
blocked `P1-10`.
