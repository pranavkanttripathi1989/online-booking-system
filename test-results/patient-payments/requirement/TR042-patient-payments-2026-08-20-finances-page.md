---
id: TR042
type: requirement
feature: patient-payments
created: 2026-08-20
updated: 2026-08-20
status: passed
parent: REQ004
related: [PLAN013, TP043]
---

# Test result — `finances/index.jsx` real data (REQ004/PLAN013/TP043)

**Outcome: PASS.** Committed together with this document — see `git log` for the exact commit SHA.

## Unit tests

`docker exec medibook_backend npx jest appointment-payments` — 20/20 passed (12 from slice 1 + 8 new).

Full backend regression: `docker exec medibook_backend npm test` — **42 suites / 466 tests, all green**, both before and after an unplanned Docker Desktop restart mid-session (see below) — confirms nothing was lost or left in a bad state.

## Live verification against the real backend

Both new queries (`myFinanceTransactions`, `myFinanceSummary`) verified as `manager@medibook.dev` against the real `AppointmentPayments` rows from slice 1's live testing — every figure matched hand-calculation exactly.

## Browser e2e (Playwright)

`npx playwright test e2e/finances.spec.js` — **5/5 passed**, twice (once before, once after the Docker restart, both clean).

Ad-hoc responsive check (360/768/1280px, all three tabs): 0px horizontal overflow at every breakpoint — but only after resolving an unrelated environment issue (below).

## Environment issue hit and resolved mid-session

The responsive check hung reproducibly across 6 attempts, each isolating a different hypothesis (viewport-resize-before-login, Recharts `ResponsiveContainer`, login throttling) — none of which were the actual cause. The real cause: `docker ps` responded normally, but HTTP requests to `localhost:3000`/`:4000` (the mapped container ports) did not — Docker Desktop's networking proxy (`vpnkit`) had wedged, likely from cumulative load across a very long session (many Playwright/Chromium invocations, several backend container restarts). Resolved with a full Docker Desktop restart (`osascript -e 'quit app "Docker"'` + `open -a Docker`, ~90s to become responsive again); all 4 containers auto-restarted cleanly via their `restart: unless-stopped` policy. The responsive check then passed on the very next attempt with zero code changes, confirming the hang was environmental, not a product bug.

## Frontend build sanity

`eslint` still can't run in the `medibook_frontend` container (same pre-existing, unrelated environment issue noted in TR039/TR040/TR041). `finances/index.jsx` transformed cleanly via forced Vite dev-server requests both before and after the Docker restart.

## Scope note

This closes REQ004 in full — both the Razorpay capture slice (PLAN012) and this Finances-page slice. Expense tracking, saved payment methods, and refunds remain open/out-of-scope, logged in `context/open-questions.md` and REQ004 itself.
