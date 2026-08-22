---
id: CTX-platform-nfr-2026-08-22-f18
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-23
status: done
parent: BUG009
related: [F-18, BUG008, REQ035]
---

# platform-nfr — F-18, the seven fabricated pages (2026-08-22)

Direct follow-on from `BUG008`: the structural gate added there found these on
its first run.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG009 | [seven fabricated pages](../../requirements/platform-nfr/bug/BUG009-platform-nfr-2026-08-22-seven-fabricated-pages-with-real-backends.md) |
| implementation-plans | PLAN030 | [wire seven fabricated pages](../../implementation-plans/platform-nfr/bug/PLAN030-platform-nfr-2026-08-22-wire-seven-fabricated-pages.md) |
| test-plans | TP057 | [wiring verification](../../test-plans/platform-nfr/bug/TP057-platform-nfr-2026-08-22-fabricated-page-wiring-verification.md) |
| test-results | TR056 | [wiring results](../../test-results/platform-nfr/bug/TR056-platform-nfr-2026-08-22-fabricated-page-wiring-verification.md) |
| test-suggestions | — | skipped — each page wires to an already-proven contract |

## What changed in the code

| File | Change |
|---|---|
| `pages/analytics/index.jsx` | rewritten on `getAppointmentStats` + `getClinics` |
| `pages/clinician/Patients.jsx` | real `patients` query, server-side search/pagination, real visit history |
| `pages/patient/Appointments.jsx` | real `appointments` + cancel/reschedule mutations |
| `pages/staff/Appointments.jsx` | rewritten: server-side filters, real cancel, real pagination |
| `pages/staff/Dashboard.jsx` | rewritten on `dashboard` |
| `pages/public/landing.jsx` | real `@Public()` `getClinicians` |
| `pages/manager/Billing.jsx` | **deleted**; `/manager/billing` redirects to `/finances` |
| `App.jsx` | `RoleGuard` on `/staff/*`; billing redirect |
| `components/shared/StatusChip.jsx` | `no_show` (the backend's spelling) |
| `utils/dateTime.js` | `formatCurrency` GBP → INR |
| `appointments/entities/appointment.entity.ts` + service + fragment | expose `type` (in_person/video) |
| `scripts/check-page-data-wiring.mjs` | allowlist 10 → 3 |
| `frontend/package.json`, `.github/workflows/ci.yml` | lint ratchet 197 → 177 |

## Outcome

Six pages read real data; the seventh is gone. Four further defects surfaced and
were fixed: an unguarded staff route, a GBP currency default in an India-market
product, a status-chip spelling mismatch, and an appointment column that had
never been exposed to GraphQL.

Backend 650/650 and 120/120. Frontend lint 0 errors / 177 warnings, build green.

## What this does not do

- **No live browser verification** — the real gap. Playwright/Chrome MCP were
  unavailable; the six routes should be driven manually before being treated as
  proven end to end.
- No new e2e specs, and e2e is still not in CI.
- Three pages remain fabricated (`onboarding`, `tasks`, `waiting-room`) because
  no backend exists for them — Priority 2.
- Two open questions raised: check-in has no status to write to, and patient
  `status`/`condition` need a real definition before those columns return.
