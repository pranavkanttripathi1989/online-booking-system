---
id: CTX-appointments-2026-08-26-req120
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ120
related: [PLAN160, TP180, TR180]
---

# appointments — REQ120: bulk-reschedule a clinician's day (2026-08-26)

Seventh slice of the next 10-slice batch (`project-plans/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ120 | [Bulk reschedule](../../requirements/appointments/improvement/REQ120-appointments-2026-08-26-bulk-reschedule.md) |
| implementation-plans | PLAN160 | [implementation plan](../../implementation-plans/appointments/improvement/PLAN160-appointments-2026-08-26-bulk-reschedule.md) |
| test-plans | TP180 | [verification plan](../../test-plans/appointments/improvement/TP180-appointments-2026-08-26-bulk-reschedule.md) |
| test-results | TR180 | [verification results — pass](../../test-results/appointments/improvement/TR180-appointments-2026-08-26-bulk-reschedule.md) |

## What shipped

`REQ017`'s own deferred "bulk-reschedule" story: `bulkRescheduleAppointments`
shifts every scheduled/confirmed appointment for a clinician on a given
day by the same delta, reporting an honest
`{attempted_count, rescheduled_count, failed_count}` rather than a
single boolean — a per-row real DB conflict fails just that row, not
the whole batch. A "Bulk Reschedule" action on `appointments/index.jsx`'s
existing filter toolbar is the frontend trigger.

## Verification

Backend: 92/92 unit suites, 1470/1470 tests (6 new); integration 4/4
suites, 387/387 unchanged. `tsc --noEmit`/`eslint` clean. Frontend:
`eslint` clean on the touched file. Live verification not performed —
shared dev backend mid-flight on unrelated concurrent work.
