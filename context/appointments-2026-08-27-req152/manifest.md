# appointments-2026-08-27-req152

| Field | Value |
|---|---|
| Feature | appointments |
| Date | 2026-08-27 |
| IDs | REQ152, PLAN193, TP213, TR213 |
| Status | done |
| Phase-plan slice | P1-17 |

## What this bundle covers

A real no-show risk score joining two of the three levers the phase-plan
claimed already existed (prepayment: real, joined; reminder intensity:
**not real, built from scratch** — `appointment_reminder` was a fully
registered event type nothing ever dispatched; overbook allowance: real
but deliberately left static, a scope cut for scheduling safety, not an
oversight). New `backend/src/appointments/no-show-risk.ts` (pure,
unit-tested scoring function) and
`appointment-reminder-sweep.service.ts` (a new cron mirroring
`no-show-sweep.service.ts`'s own shape). Frontend: a real risk indicator
on the front-desk appointment list, and a real fix for a separate,
pre-existing gap found while building this — the internal booking
wizard never handled an `awaiting_payment` result at all.

## Links

- Requirement: [REQ152](../../requirements/appointments/improvement/REQ152-appointments-2026-08-27-no-show-risk-score.md)
- Plan: [PLAN193](../../implementation-plans/appointments/improvement/PLAN193-appointments-2026-08-27-no-show-risk-score.md)
- Test plan: [TP213](../../test-plans/appointments/improvement/TP213-appointments-2026-08-27-no-show-risk-score.md)
- Test results: [TR213](../../test-results/appointments/improvement/TR213-appointments-2026-08-27-no-show-risk-score.md)

## Real bugs found and fixed this slice

1. A scoring-weight bug in the risk function's own first draft would have
   silently broken REQ052's pre-existing "org threshold reached == forced
   prepayment" guarantee for a same-day booking — caught by that exact
   pre-existing regression test before it shipped.
2. A real, separate, pre-existing gap: `BookingStep5Confirm.jsx` (the
   internal staff booking wizard) showed "Booked! 🎉" unconditionally
   regardless of the real returned status — a booking already landing
   `awaiting_payment` under the existing REQ052 mechanism was always
   shown as confirmed. Fixed with a new `AwaitingPaymentScreen`.

## Deliberately out of scope

- Automated, risk-driven overbook-allowance adjustment — a considered
  scope cut (real scheduling-safety risk if the computation is wrong),
  not an oversight. Staff can already act on the same list-view risk
  information manually via the existing availability-editing UI.
- Risk-weight validation against real outcome data — no labeled dataset
  exists in this environment; weights are a documented, defensible first
  pass, not a fitted model.

## Next in the phase-plan tracker

`P1-18` (observability — traces, error tracking, SLO dashboards) is the
next unstarted slice in
`project-plans/phase-plans/01-phase1-close-the-gates.md`.
