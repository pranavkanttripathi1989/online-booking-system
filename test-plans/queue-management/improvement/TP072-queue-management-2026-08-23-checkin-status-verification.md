---
id: TP072
type: improvement
feature: queue-management
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ042
related: [PLAN045, TR071]
---

# TP072 — Verification for check-in status tracking and the waiting-room queue

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `checkIn()` on a scheduled appointment | Status → `checked_in`, `AppointmentStatusLogs` row written |
| TC-02 | `startConsultation()` | Status → `in_consultation` |
| TC-03 | `resetAppointmentJourney()` | Status → `scheduled` regardless of prior terminal state |
| TC-04 | `checkIn()` from a cross-org caller | Rejected `NotFoundException`, no `update` call |
| TC-05 | `checkIn()` from a clinician not on the appointment | Rejected, self-scoping holds |
| TC-06 | `checkIn()` from a patient calling on someone else's appointment | Rejected |
| TC-07 | `findAll({clinic_id})` | `where.clinic_id` set exactly when provided |
| TC-08 | `findAll()` with no `clinic_id` | Filter omitted entirely, not `undefined` written into the query in a way that breaks it |
| TC-09 | Full backend suite + `tsc --noEmit` + `eslint` | Clean |
| TC-10 | `check-page-data-wiring.mjs` | `waiting-room/index.jsx` no longer reported; script itself runs from this host without the pre-existing path bug |
| TC-11 | Live e2e: waiting room loads real (possibly empty) data, never the old mock patients | Confirmed against the real dev backend |
| TC-12 | Live e2e: a real GraphQL error surfaces on the page, not swallowed | Confirmed via a mocked-error route interception |
| TC-13 | Frontend full Jest suite | No regression |

## How this was checked

TC-01–08 via Jest unit tests in `appointments.service.spec.ts` against a
mocked `PrismaService`. TC-09 via the backend container's own `npx jest
--maxWorkers=2`, `npx tsc --noEmit`, `npx eslint`. TC-10 via `node
scripts/check-page-data-wiring.mjs` run directly from the host (after fixing
the path bug it exposed). TC-11–12 via `npx playwright test
e2e/waiting-room.spec.js` against the real running dev stack (not mocked,
not the isolated e2e stack). TC-13 via the frontend container's `npm test --
--watchAll=false`.
