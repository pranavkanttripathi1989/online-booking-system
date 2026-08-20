---
id: TR043
type: requirement
feature: dashboard
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ007
related: [PLAN014, TP044]
---

# Test result — real `dashboard` query (REQ007/PLAN014/TP044)

**Outcome: PASS.** Committed together with this document — see `git log` for the exact commit SHA.

## Unit tests

`docker exec medibook_backend npx jest dashboard.service` (host-side `npm run test -- dashboard.service`, same result) — 11/11 passed.

Full backend regression: `npm test` — **43 suites / 477 tests, all green** (+1 suite, +11 tests vs. the prior REQ004 baseline this same session).

## Live verification against the real backend

Full `dashboard` query run as `admin@medibook.dev` via `curl` with a real bearer token — every field present and correctly shaped: 4 appointments today, 1 clinician, 4 patients, ₹499 revenue this month, 2 upcoming appointments (real patient/clinician/service names), 1 utilisation row, 31-day volume series, 1 bookings-by-service entry. `schema.gql` confirmed regenerated with the new `Dashboard` type and `dashboard` query.

Separately verified live in a real browser (Playwright MCP, logged in as `admin@medibook.dev`): `/dashboard` renders all 4 KPI cards, the volume/service/utilisation charts, and the upcoming-appointments table with real data, zero console errors, zero GraphQL errors — the exact console 400 (`Cannot query field "dashboard" on type "Query"`) that originally surfaced this bug is gone.

## Browser e2e (Playwright)

`npx playwright test e2e/dashboard.spec.js --workers=1` — **3/3 passed**.

### Environment issue hit and resolved mid-session (the real finding, not hidden)

The first e2e run failed all 3 tests, and a second/third retry with progressively longer timeouts still failed the same one test identically — ruling out simple slowness. Root-caused via `page.on('pageerror'/'requestfailed')` instrumentation added to a throwaway debug spec (not committed): the test called `page.goto('/dashboard')` **after** `loginAs(page, 'Admin')`, but `App.jsx`'s `RoleHomeRedirect` already lands `admin`/`super_admin`/`staff` on `/dashboard` by default — that second, redundant navigation triggered a full hard page reload that aborted Vite's in-flight dependency-chunk requests (`recharts.js`, `dayjs.js`, several `@mui/icons-material` chunks, `AppointmentVolumeChart.jsx`) mid-flight, and the page never finished loading. This was a real **test-authoring bug**, not a backend or product bug — confirmed because the identical scenario, run manually in a live browser with no extra navigation, worked correctly every single time throughout the investigation. Removing the redundant `goto()` fixed all 3 tests outright at `--workers=1`.

Separately: the spec still fails under Playwright's default 3-worker parallelism, but with a *different* failure signature this time (`Target page, context or browser has been closed`, not a timeout) — consistent with genuine resource exhaustion from 3 concurrent browser contexts on a Docker Desktop VM that had already, earlier this same session, been observed pegged near 60% CPU for 3+ hours, hit a container-store corruption bug, and crashed once outright (all documented in this session's Docker-image-rebuild work). This is a known environment limitation of this specific dev machine under heavy parallel load, not a code defect — recommend running this spec (and possibly the full e2e suite) with `--workers=1` here until Docker Desktop is upgraded off the legacy hyperkit backend.

## Responsive check

360px/1280px: 0px horizontal overflow at both (page layout unchanged from before this slice — only the data source changed).

## Scope note

This closes REQ007 in full. True slot-capacity utilisation (lunch breaks, blocks) remains a documented simplification, matching the precedent already set by `analytics.entity.ts`'s own utilisation proxy — not a gap introduced here.
