---
id: TP081
type: bug
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: PLAN054
related: [BUG019, BUG020, TR080]
---

# TP081 — Verification for the calendar/appointments date-window fix

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule — a bug fix against an
already-defined real GraphQL contract (`AppointmentFiltersInput`), not
exploratory.

## Per-defect contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `appointments.service.spec.ts` unit: `date_from` alone | `where.appointment_time.gte` set, `.lte` undefined |
| TC-02 | `appointments.service.spec.ts` unit: `date_to` alone | `where.appointment_time.lte` set to inclusive end-of-day, `.gte` undefined |
| TC-03 | `appointments.service.spec.ts` unit: both together | both bounds set correctly |
| TC-04 | `appointments.service.spec.ts` unit: neither provided | `where.appointment_time` undefined — documents no implicit default window |
| TC-05 | `appointments.service.spec.ts` unit: default ordering | `orderBy: { appointment_time: 'desc' }` unconditionally, unchanged |
| TC-06 | Full backend suite regression | no existing test broken by the new describe block |
| TC-07 | Backend lint + `tsc --noEmit` | clean |
| TC-08 | Frontend lint on the three touched files | clean (pre-existing warnings only) |
| TC-09 | Direct GraphQL response inspection against the isolated stack's realistic (~2,000-row) dataset for both `/calendar` and `/appointments` | `appointments()` returns real rows correctly bounded by the sent `date_from`/`date_to`, not the old unbounded `first: 500` |
| TC-10 | Live browser: `/calendar` Today's Schedule sidebar | shows the real seeded today's-date fixture (when the isolated stack's "today" agrees with the browser's) |
| TC-11 | `frontend/e2e/calendar.spec.js` (2 assertions) against the isolated stack | both pass |
| TC-12 | `frontend/e2e/manager-appointments.spec.js`'s "manager sees real seeded appointments" (the 2 BUG019-relevant assertions) against the isolated stack | pass |

## How this was checked

TC-01–05 via `npx jest --maxWorkers=2 appointments.service` inside
`medibook_backend`. TC-06 via the same command with no path filter (full
suite). TC-07 via `npx eslint`/`npx tsc --noEmit` inside `medibook_backend`.
TC-08 via `npx eslint` inside `medibook_frontend` for
`calendar/index.jsx`, `appointments/index.jsx`, `CalendarView.jsx`. TC-09
via extracting and inspecting raw GraphQL request/response bodies from
Playwright trace network logs against `backend_e2e` (port 4001). TC-10/11/12
via `npx playwright test` with `E2E_BASE_URL=http://localhost:3101` against
the isolated e2e stack (`docker compose --profile e2e up -d
--force-recreate`), per `project-plans/analysis/06-execution-plan.md` P1.5's isolated
stack.
