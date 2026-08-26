---
id: PLAN158
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ118
related: [TP178, TR178]
---

# PLAN158 — Implementation plan: delay broadcast to waiting patients

## Change

**`backend/src/queue/queue.service.ts`**:

- Factored `queueBoard()`'s existing clinician-access check (exists?
  same org? clinician viewing their own queue?) into a shared private
  `assertClinicianAccess()`, now used by both `queueBoard()` and the
  new `broadcastDelay()`.
- New `notifyPatientAccount(patientId, eventType, payload)`: mirrors
  `appointments.service.ts`'s `notifyLinkedProfile()` — looks up the
  patient's linked `UserProfiles` row, skips silently if none, else
  dispatches via `NotificationTriggerService`.
- New `broadcastDelay(clinicianId, delayMinutes, user)`: validates
  `delayMinutes` is a positive integer, resolves clinician access,
  loads every `'waiting'` entry (not `called`/`in_progress`/`done`),
  notifies each linked account, returns
  `{waiting_count, notified_count}`.

**`backend/src/queue/entities/queue.entity.ts`**: new
`QueueDelayBroadcastResultType {waiting_count, notified_count}`.

**`backend/src/queue/queue.resolver.ts`**: new `broadcastQueueDelay`
mutation, same `QUEUE_STAFF_ROLES` gate as every other queue mutation.

**`backend/src/notifications/notification-trigger.service.ts`**: new
`queue_delay` entry in `DEFAULTS` — SMS + in-app, no email/WhatsApp (a
patient physically waiting needs the channel most likely to reach them
immediately).

**`frontend/src/pages/queue/index.jsx`**: new "Report Delay" button
next to "TV Display", opening a dialog for a delay-minutes value; on
submit, calls `broadcastQueueDelay` and shows "Notified N of M waiting
patients" via the existing snackbar convention.

No `schema.prisma` change — reuses existing `QueueEntries`/
`UserProfiles` columns.

## Testing

`backend/src/queue/queue.service.spec.ts`: 4 new cases —
non-positive-delay rejection, cross-org rejection, honest
notified-vs-waiting count with one unlinked account, and confirming the
query only ever targets `status: 'waiting'`. Added
`NotificationTriggerService`/`userProfiles.findFirst` mocks to the
shared test setup.

`backend/src/notifications/notification-trigger.service.spec.ts`:
re-run to confirm the new `DEFAULTS` entry doesn't disturb the existing
24 cases.

Full backend unit suite: 91/91 suites, 1453/1453 tests (4 new).
Integration suite: 4/4 suites, 387/387 unchanged. `tsc --noEmit`/
`eslint` clean on backend; `eslint` clean on the touched frontend file.

## Documentation

`REQ118` (this requirement), `PLAN158` (this plan), `TP178`/`TR178`
(verification), a context bundle, and index updates across all five doc
roots plus the `queue-management` feature README.
