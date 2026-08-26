---
id: CTX-queue-management-2026-08-26-req118
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ118
related: [PLAN158, TP178, TR178]
---

# queue-management — REQ118: delay broadcast to waiting patients (2026-08-26)

Fifth slice of the next 10-slice batch (`project-plans/analysis/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ118 | [Delay broadcast](../../requirements/queue-management/improvement/REQ118-queue-management-2026-08-26-delay-broadcast.md) |
| implementation-plans | PLAN158 | [implementation plan](../../implementation-plans/queue-management/improvement/PLAN158-queue-management-2026-08-26-delay-broadcast.md) |
| test-plans | TP178 | [verification plan](../../test-plans/queue-management/improvement/TP178-queue-management-2026-08-26-delay-broadcast.md) |
| test-results | TR178 | [verification results — pass](../../test-results/queue-management/improvement/TR178-queue-management-2026-08-26-delay-broadcast.md) |

## What shipped

`REQ019`/`REQ017`'s own deferred "delay broadcast" story: a new
`broadcastQueueDelay` mutation notifies every currently-waiting
patient's linked login account (SMS + in-app), reusing
`NotificationTriggerService` and the `notifyLinkedProfile()` pattern
from `appointments.service.ts`. A "Report Delay" dialog on
`pages/queue/index.jsx` is the frontend trigger. Also factored
`queueBoard()`'s clinician-access check into a shared
`assertClinicianAccess()` helper, now reused by the new mutation.

## Verification

Backend: 91/91 unit suites, 1453/1453 tests (4 new); integration 4/4
suites, 387/387 unchanged. `tsc --noEmit`/`eslint` clean. Frontend:
`eslint` clean on the touched file. Live verification not performed —
shared dev backend mid-flight on unrelated concurrent work.
