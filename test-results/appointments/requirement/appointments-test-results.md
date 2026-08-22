---
id: TR003
type: test-result
feature: appointments
created: 2026-03-19
updated: 2026-08-22
status: passed
parent: REQ013
related: [TP003, PLAN023]
---

# Appointments — Test Result (re-executed against the real backend, `REQ013`/`PLAN023` Phase A)

**Outcome: PASS**, with 1 real bug found and fixed as part of this execution, and 1 previously-documented feature confirmed removed from the app entirely. Supersedes the prior mock-era result (last carried a "38/38 passed" count against `MockStore`, with an `updated:` bump to 2026-08-18 that was a timestamp change only, not a real re-run against the current code — flagged as a risk in `REQ013` Finding 2, closed by this document).

## Bugs found and fixed during this execution

1. `appointments/detail.jsx`'s Reschedule handler called `MockStore.updateAppointment()` unconditionally, even for a real appointment loaded from the real backend — the success toast fired and the user was returned to the list, but the real appointment's `start_datetime` was never actually updated anywhere. Fixed by wiring to the real, already-defined-but-unused `UPDATE_APPOINTMENT_MUTATION` (`end_datetime` is recomputed server-side from the service's `duration_minutes`, and the resolver runs a real slot-conflict check the mock path never did). Committed this session (see `manager-appointments.spec.js`'s new reschedule test, which specifically asserts the real `UpdateAppointment` GraphQL response, not just UI state).

## Feature removal confirmed (not a bug — documentation correction)

TC-APPT-028 (sidebar pending-appointment-count badge) previously specced `MockStore.getAppointments({status:'pending'}).length` as correct. `components/Layout/Sidebar.jsx`, the file this lived in, was deleted this session after being confirmed as orphaned dead code (zero live importers anywhere, superseded entirely by `layouts/AppShell.jsx`, which has no equivalent badge). This is not a regression to fix — the real, current app simply doesn't have this feature; the test plan now records that explicitly instead of silently dropping the test case number.

## Per-case verification

**Live e2e (Playwright, real backend, no mocks in the assertion path):**

- TC-APPT-001 — `manager-appointments.spec.js` › `manager sees real seeded appointments` — passing.
- TC-APPT-006, 033 — `manager-appointments.spec.js` › `rescheduling a real appointment calls the real updateAppointment mutation` — passing; asserts a real `UpdateAppointment` GraphQL response with no errors, not just UI state.
- TC-APPT-022 — `manager-appointments.spec.js` › `a real filter with zero matches shows a real empty state, not fabricated mock rows` — passing; the real regression test for the bug this pass fixed (filtering `status=no_show`, which has zero real matches for this org, previously rendered 3 fabricated patients — Kavya Nair, Ingrid Larsson, Hassan Malik — now correctly renders empty).

**Live manual verification (real backend, Playwright screenshots during the fix, not retained as committed artifacts):**

- TC-APPT-033's underlying bug — before the fix, confirmed via direct GraphQL calls that `updateAppointment` was never invoked by the Reschedule dialog for a real appointment (the mutation existed and worked correctly when called directly via curl, proving the backend was never the problem). After the fix, confirmed the same real appointment's `start_datetime` round-trips correctly through the UI flow.
- TC-APPT-015 — the 5-step booking wizard was walked live this session while confirming `create.jsx`/`BookingWizard` has zero mock dependency; not re-driven as a committed automated spec this pass.

**Code-reviewed only this pass (logic read against the real GraphQL contract and confirmed correct; not re-driven through a live browser click-through this session):**

- TC-APPT-002, 003, 004, 005, 007, 008, 009, 010, 011, 012, 016, 017, 020, 021, 023, 024, 025, 026, 027, 029, 030, 031, 032, 034 — all real-query/mutation-backed, `useMemo`/optimistic-UI patterns confirmed correct by reading against the real contract; not touched by this session's fixes and not re-run live this pass.
- TC-APPT-013, 018, 019 — `edit.jsx`'s real-primary/mock-secondary pattern and the Send Reminder simulated-delay behavior were both re-confirmed correct by source read (not live click-through) — neither is new or changed this pass.

**Not run this pass:** none of the above "code-reviewed only" cases are known or suspected to be broken. As with `TR010`, closing this gap with committed e2e coverage (rather than repeated manual review each time this plan is re-executed) is real follow-up work, not claimed as done here.

## Backend/frontend health

`docker exec medibook_backend npm test` — unaffected (this pass was frontend-only; `appointments.service.ts`'s `update()` — the real mutation the fix now calls — was already fully unit-tested and unchanged by this pass).

`npx eslint` on `appointments/detail.jsx` and `appointments/index.jsx` — 0 errors (same pre-existing bare-`eslint`-invocation false-positive pattern documented elsewhere this session).
