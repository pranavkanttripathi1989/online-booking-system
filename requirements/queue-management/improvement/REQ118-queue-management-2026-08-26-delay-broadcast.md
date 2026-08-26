---
id: REQ118
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ019
related: [PLAN158, TP178, TR178]
---

# REQ118 — Delay broadcast to waiting patients (US-QUE-04/06)

## Why this slice

`project-plans/analysis/11-next-10-slice-batch.md` picked up `REQ019`'s own
deferred "delay broadcast" story alongside `REQ117`'s predictive ETA in
the same feature area. When a clinician is running behind, front desk
today has no way to tell already-checked-in, still-waiting patients
short of walking over to each one — a real, common front-desk need this
codebase already has all the pieces for: `QueueEntries.status = 'waiting'`
identifies exactly who to notify, and `NotificationTriggerService`
(built for `REQ008`/`REQ025`) already handles channel priority, quiet
hours, and frequency capping for every other event type in the product.

Investigated before building: `appointments.service.ts`'s
`notifyLinkedProfile()` already establishes the "look up the patient's
linked `UserProfiles` row, skip silently if none, dispatch by that
row's id" pattern — reused verbatim rather than re-derived.

## User story

As front-desk/manager/clinician staff, when my queue is running behind
schedule, I can broadcast a one-line delay notice to every patient
currently waiting (not those already called, not those done), so they
know before growing frustrated.

## Acceptance criteria

- **Given** a clinician's queue with N patients in `'waiting'` status,
  **when** staff broadcasts a delay of M minutes, **then** each waiting
  patient's linked login account (if any) receives a `queue_delay`
  notification naming the clinician and the approximate delay.
- **Given** a waiting patient with no linked login account, **then**
  they are skipped silently (not an error) — the response honestly
  reports `waiting_count` vs. `notified_count` rather than pretending
  everyone was reached.
- **Given** a non-positive delay value, **then** the mutation is
  rejected before any query runs.
- **Given** a cross-org caller or a clinician requesting a colleague's
  queue, **then** the mutation is rejected, matching `queueBoard()`'s
  own access rule (factored into a shared `assertClinicianAccess()`
  helper this slice introduced).

## In scope

- `broadcastQueueDelay(clinician_id, delay_minutes)` mutation.
- A new `queue_delay` notification event type (SMS + in-app by default,
  no email — a patient sitting in a waiting room won't check email).
- A "Report Delay" button + dialog on `pages/queue/index.jsx`.

## Deliberately out of scope

- Automatic delay detection (e.g. inferring a delay from how far behind
  the average/predicted wait `callNext` timing has drifted) — this
  slice is staff-initiated only, a smaller and safer first version.
- Broadcasting to patients with a future, not-yet-checked-in appointment
  today (`REQ017`'s own deferred delay-broadcast note references this
  broader scope) — only patients already in the physical waiting room.
