---
id: TP214
type: improvement
feature: platform-nfr
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ153
related: [REQ153, PLAN194, TR214]
---

# TP214 — Test plan: observability (P1-18)

Well-scoped against already-proven patterns (this codebase's own
established "unconfigured vendor = clean no-op" convention, and
`no-show-sweep.service.ts`'s own cron shape reused verbatim for the
reminder sweep in the prior slice). Suggestion stage skipped per
`CLAUDE.md`'s own conditional rule; drafted directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1 | Returns `ok`/200 when both Postgres and Redis respond | `health.controller.spec.ts` |
| 2 | Throws a 503 with a `degraded` body when Postgres is down | same |
| 3 | Throws a 503 with a `degraded` body when Redis is down | same |
| 4 | Never leaks the raw dependency error message into the response body (STATE-6) | same |
| 5 | Logs metric name/value/id/page from a valid `WebVitalDto` | `web-vitals.controller.spec.ts` |
| 6 | The `page` field carries a route pattern, never a resolved URL | same |
| 7 | Clean no-op (`init` never called) when `SENTRY_DSN` is unset | `sentry.spec.ts` |
| 8 | Initializes with `tracesSampleRate: 0` and a scrubbing `beforeSend`/`beforeBreadcrumb` when configured | same |
| 9 | Never sends the real error message — only a redacted placeholder (SEC-5) | same |
| 10 | Preserves the real error name for Sentry grouping | same |
| 11 | `beforeSend` strips message/request/user/extra/contexts/breadcrumbs and redacts every exception value | same |

## Live verification (real Docker stack, not mocked)

| # | Case |
|---|---|
| 1 | `curl /health` against the real running stack returns real Postgres/Redis latencies |
| 2 | `curl -X POST /observability/web-vitals` with a valid body returns 204 |
| 3 | `OTEL_ENABLED=true` container recreate produces real exported spans (confirmed: a real `graphql.parseSchema` span with correct `service.name: medibook-backend`, a real `traceId`, and a real duration, via the console exporter) |
| 4 | Default (`OTEL_ENABLED` unset/false) recreate produces zero span output — confirmed quiet |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | `reportError` is a clean no-op when no DSN is configured (the only state reachable under this repo's Jest/babel shim — see PLAN194's own account) | `errorReporting.test.js` |
| 2 | `scrubEvent` strips message/request/user/extra/contexts/breadcrumbs (allowlist, not blocklist) | same |
| 3 | `scrubEvent` redacts every exception value while preserving the type name | same |
| 4 | `scrubEvent` preserves the stacktrace | same |
| 5 | `scrubEvent` handles an event with no `exception` (e.g. `captureMessage`) without throwing | same |
| 6 | `reportWebVitals` registers a handler for all five Core Web Vitals | `reportWebVitals.test.js` |
| 7 | Reports a metric via `sendBeacon` with name/value/id | same |
| 8 | Sends a route *pattern*, never the resolved URL with a real record id | same |
| 9 | Falls back to `fetch` with `keepalive: true` when `sendBeacon` is unavailable | same |

## Out of scope for this test plan

- A real Grafana/Datadog dashboard consuming this signal — infra
  decision, not a code slice (see REQ153's own scope note).
- End-to-end Playwright coverage of the health endpoint or Web Vitals
  reporting — both are infrastructure-only surfaces with no user-facing
  flow to drive through a browser.
- Testing the DSN-configured path of `errorReporting.js` end-to-end
  under Jest — structurally blocked by this repo's shared
  `babel.config.cjs` `import.meta` shim (documented in PLAN194 and in
  `errorReporting.test.js`'s own header comment); the pure `scrubEvent`
  function carries the real coverage for the SEC-5-critical logic
  instead.
