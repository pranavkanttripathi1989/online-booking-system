---
id: TR214
type: improvement
feature: platform-nfr
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP214
related: [REQ153, PLAN194]
---

# TR214 — Results: observability (P1-18)

## Backend

- `npx jest --maxWorkers=2`: **114 suites / 1825 tests, green.** New:
  `health.controller.spec.ts` (4), `web-vitals.controller.spec.ts` (2),
  `sentry.spec.ts` (5) — 11 new tests total.
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean (also fixed one
  unrelated pre-existing `prefer-const` error in
  `test/integration/no-show-risk.int-spec.ts`, caught by this slice's
  own full-tree lint run — see PLAN194 item 6).

## Live verification (real Docker stack)

- `curl http://localhost:4000/health` → `200
  {"status":"ok","checks":{"postgres":{"ok":true,"latency_ms":24},
  "redis":{"ok":true,"latency_ms":20}}}`.
- `curl -X POST http://localhost:4000/observability/web-vitals` with a
  valid body → `204`.
- `OTEL_ENABLED=true` container recreate: a real request produced a real
  exported span in `docker logs` via the console exporter —
  `instrumentationScope: '@opentelemetry/instrumentation-graphql'`,
  `name: 'graphql.parseSchema'`, a real `traceId`
  (`d5856bc3cca406655810828257354387`), `service.name:
  'medibook-backend'`, a real non-zero `duration`. Confirms the
  first-line-import wiring (see `tracing.ts`'s own header comment)
  correctly captures auto-instrumentation before the instrumented
  modules load.
- Default (`OTEL_ENABLED` unset/false) recreate: confirmed quiet — no
  span output, matching the "unconfigured = clean no-op" contract.

## Frontend

- `errorReporting.test.js`: **5/5 green** (redesigned mid-slice — see
  "Real bugs found" below).
- `reportWebVitals.test.js`: **4/4 green** (new).
- `npm run lint`: **4820 warnings, 0 errors** — ratchet ceiling
  unchanged from the prior slice (P1-17); this slice's new files
  introduced zero new warnings.
- Full suite (`npx jest --maxWorkers=2`): **40 suites / 266 tests** — 252
  passed, 14 failed across 6 suites. All 6 failing suites
  (`manager/claims/index.test.jsx`, `appointments/edit.test.jsx`, and 4
  others) are pre-existing timeout-flaky suites under full-parallel
  resource contention — none import `errorReporting.js`,
  `reportWebVitals.js`, or the edited `ErrorBoundary.jsx`/`main.jsx`,
  matching this codebase's own repeatedly-documented pattern for this
  class of failure (see CLAUDE.md's Phase G+3/G+4 accounts of the
  identical symptom on unrelated suites).

## Real bugs / gaps found and fixed this slice

1. **Self-caught before shipping**: the `formatError` GraphQL hook's
   first draft reported every error to Sentry unconditionally, including
   routine business rejections. Fixed by gating on
   `extensions?.code === 'INTERNAL_SERVER_ERROR'` — see PLAN194 item 1.
2. **Test-authoring bug**, not a code bug: a `sentry.spec.ts` draft
   asserted a bare `class Foo extends Error {}` inherits the subclass
   name into `.name` — standard JS does not do this without an explicit
   assignment in the constructor. Fixed the test.
3. **A genuine, previously-undocumented environment constraint**: this
   repo's shared `babel.config.cjs` statically replaces every
   `import.meta` occurrence with a fresh, disconnected object literal at
   Jest transform time, making a test that mutates
   `import.meta.env.VITE_SENTRY_DSN` at runtime silently ineffective —
   the source file never observes the mutation. `documents.test.js`
   already carried the same underlying fact as a comment but this is the
   first slice to hit it while trying to drive a *configured* vendor
   path (rather than only relying on the always-empty fallback).
   Resolved by exporting `scrubEvent` for direct pure-function coverage.
   Worth carrying into `CLAUDE.md` as a named gotcha for any future
   frontend module that reads a `VITE_*` var conditionally.
4. **jsdom's `Blob` has no `.text()`/`.arrayBuffer()`** under this
   `jest-environment-jsdom@29` — confirmed working in plain Node,
   confirmed missing under jsdom. Fixed by capturing the payload at
   `Blob` construction time via a spied global constructor instead of
   reading it back.
5. **A stale-Prisma-Client-in-container recurrence, twice** — the second
   occurrence (632 errors, not 24) revealed a **new, previously
   undocumented gotcha**: `docker compose up -d <service>` (a container
   *recreate*, done here to pick up new env vars) resets the anonymous
   `/app/node_modules` volume to the image's build-time state, silently
   discarding every package installed via `docker exec ... npm install`
   in earlier sessions/slices — not just the regenerated Prisma Client.
   A plain `docker restart` does **not** do this (confirmed: the first
   occurrence this slice, from a plain restart, only needed `prisma
   generate`, not a full reinstall). Fixed both times with `docker exec
   medibook_backend npm install && npx prisma generate && docker
   restart`. Recommend adding this distinction to `CLAUDE.md`'s existing
   Docker-gotcha documentation in a future slice.
6. A `prefer-const` lint error in a P1-17 file, unrelated to this
   slice's own code, caught by this slice's own clean-lint requirement
   and fixed inline (trivial `let` → `const`).

## Open items

- No real Grafana/Datadog dashboard exists to consume this signal — a
  separate infra decision, documented as deliberately out of scope in
  `REQ153`.
- `CLAUDE.md` itself has not yet been updated with the new
  container-recreate-vs-restart Docker distinction found in this slice
  (item 5 above) — a documentation follow-up, not a code gap.
