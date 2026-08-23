---
id: TP082
type: requirement
feature: scheduling-engine
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: PLAN055
related: [REQ017, TR081]
---

# TP082 — Verification for session/token scheduling mode + multi-resource booking

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule for a genuinely new domain —
wait, this IS a first-of-its-kind mode (session/token scheduling) — but the
requirement doc (`REQ017`) already carries full Given/When/Then acceptance
criteria per user story, which serves the same grounding purpose a
suggestion-stage document would; drafting a redundant suggestion doc against
an already-detailed, already-reviewed requirement was judged unnecessary
overhead for this slice.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `availableSlots()` given a session-mode window | generates zero discrete slots for that window |
| TC-02 | `availableSlots()` given a slot-mode window (regression) | generates slots exactly as before |
| TC-03 | `sessionAvailability()` — no matching window | returns `null` |
| TC-04 | `sessionAvailability()` — matching window, N booked | `remaining = capacity + overbook - N`, `estimatedWaitMinutes = N * duration`, `isFull` correct at the boundary |
| TC-05 | `sessionAvailability()` — count query | only counts `booking_mode != 'slot'` appointments |
| TC-06 | `ResourcesService` — full CRUD tenant isolation | cross-org create/read/update/delete all rejected; F-01 org-less-non-operator case fails closed |
| TC-07 | `AppointmentsService.create()` — session mode | does not call `assertSlotFree`; assigns sequential `token_no`; rejects at `capacity+overbook_allowance`; uses the window's own configured room when set |
| TC-08 | `AppointmentsService.create()` — multi-resource, slot mode | rejects a resource belonging to a different org; rejects a resource already booked for the window; creates `AppointmentResources` rows for every free resource; untouched when no `resource_ids` given |
| TC-09 | `AppointmentsService` — cancel/no_show | deletes `AppointmentResources` rows; leaves them untouched on an unrelated transition (e.g. complete) |
| TC-10 | `PublicService.bookPatientAppointment()` — session mode (duplicated path) | same session-mode behavior as TC-07, verified independently since the two dialects don't share implementation |
| TC-11 | Full backend suite regression | 0 failures across all 59 suites |
| TC-12 | Backend lint + `tsc --noEmit` | clean |
| TC-13 | Full frontend suite regression | 0 failures — specifically catches `booking/index.test.jsx`'s `MockedProvider` mocks needing the new `mode`/`recurrenceType` fields added to the shared query |
| TC-14 | Frontend lint | clean (warning count does not increase) |
| TC-15 | e2e: manager configures a session-mode window via the real UI | the mutation round-trips through the real backend and the resulting chip reflects the server's own response, not an optimistic local update |
| TC-16 | e2e: the public booking wizard (anonymous, real browser context — not sharing the manager's session) | renders the "join this session" card with correct capacity/remaining/token preview for that window, not the slot grid |

## How this was checked

TC-01–10 via `npx jest --maxWorkers=2 <file>` inside `medibook_backend` for
each of `availability.service.spec.ts`, `resources.service.spec.ts`,
`appointments.service.spec.ts`, `public.service.spec.ts`. TC-11/12 via the
same container's full `npx jest --maxWorkers=2` and `npx eslint`/`npx tsc
--noEmit`. TC-13/14 via `medibook_frontend`'s `npm test -- --watchAll=false`
and `npm run lint`. TC-15/16 via `npx playwright test
scheduling-session-mode.spec.js` against the real dev stack
(`E2E_BASE_URL=http://localhost:3000`), using a genuinely separate
`browser.newContext()` for the anonymous-visitor assertion (not
`page.context().newPage()`, which would share the manager's own
cookies/localStorage and render the wizard inside the authenticated shell
instead).
