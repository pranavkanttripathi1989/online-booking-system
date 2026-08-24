---
id: TP085
type: requirement
feature: queue-management
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: PLAN058
related: [REQ019, TR084]
---

# TP085 — Verification for live queue board, queue actions, and unbilled-visits report

## Suggestion stage

Skipped. `REQ019` already carries full Given/When/Then acceptance criteria
for its scoped P0 stories, and `PLAN058` records the genuine design
decisions (no `client_org_id` on `QueueEntries`, in-transaction sync
instead of a second frontend action, "served" vs. "called" for auto-return,
retrospective vs. predictive average wait) with their rationale — this
extends an already-proven pattern (`REQ042`'s `transitionStatus`,
`REQ043`'s subscription shape) rather than exploring a genuinely new one.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `queueBoard` — cross-org caller | rejected, `NotFoundException` |
| TC-02 | `queueBoard` — clinician requesting a colleague's board | rejected |
| TC-03 | `queueBoard` | now-serving = earliest `called`/`in_progress`; waiting = next 5 `waiting`, ordered by token then arrival; average wait computed only from today's `done` entries |
| TC-04 | `queueEntries`/`clinicQueue` — clinician caller | restricted to their own queue |
| TC-05 | `queueEntries`/`clinicQueue` — staff/manager caller | not restricted by clinician |
| TC-06 | `callNext` — no one waiting | rejected, `BadRequestException` |
| TC-07 | `callNext` | promotes the earliest waiting entry (token then arrival order), sets `called_at`, logs `called`, publishes |
| TC-08 | `recall` — cross-org entry | rejected |
| TC-09 | `recall` — entry already `waiting` | rejected |
| TC-10 | `recall` — entry `done`/`no_show` | rejected |
| TC-11 | `recall` — `called`/`skipped` entry | returns to `waiting`, clears skip state, logs `recalled` |
| TC-12 | `skip` — entry `done`/`no_show` | rejected |
| TC-13 | `skip` — no `return_after` given | defaults to 3 |
| TC-14 | `skip` — explicit `return_after`/`reason` | honoured and logged |
| TC-15 | `transfer` — target clinician at a different clinic | rejected |
| TC-16 | `transfer` | reassigns both `Appointments.clinician_id` and the queue entry in one transaction, resets token/`called_at`, returns to `waiting` |
| TC-17 | `unbilledVisits` — cross-org clinic | rejected |
| TC-18 | `unbilledVisits` | completed, non-deleted appointments with no `succeeded` payment |
| TC-19 | `syncFromAppointmentStatus` — first check-in | creates a `waiting` entry with the appointment's own token/clinic/clinician |
| TC-20 | `syncFromAppointmentStatus` — re-check-in after a reset | resets the existing entry rather than creating a duplicate |
| TC-21 | `syncFromAppointmentStatus` — status change with no existing entry | no-op (appointment never entered the queue) |
| TC-22 | `syncFromAppointmentStatus` — `in_consultation`/`completed`/`no_show` | entry mirrors to `in_progress`/`done`/`no_show` |
| TC-23 | `syncFromAppointmentStatus` — `cancelled`/`scheduled` | entry deleted outright |
| TC-24 | auto-recall — other skipped entries on completion | `served_since_skip` incremented, never for the entry just served |
| TC-25 | auto-recall — threshold reached | entry returns to `waiting`, skip state cleared, `auto_recalled` logged |
| TC-26 | Tenancy matrix — `queue` domain (`queueEntries`) | org-A caller never sees org-B's entry; role gate matches `@Auth()` exactly |
| TC-27 | Tenancy matrix anti-rot gate | no unclassified resolver domain |
| TC-28 | `AppointmentsService`'s existing spec suite | unaffected by the new `QueueService` constructor dependency (mocked no-op) |
| TC-29 | Full backend suite regression | 0 failures |
| TC-30 | Backend lint + `tsc --noEmit` | clean |
| TC-31 | Backend integration suite regression | 0 failures |
| TC-32 | Full frontend suite regression | 0 failures |
| TC-33 | Frontend lint (new/touched files) | clean |
| TC-34 | Frontend build | succeeds, both new pages code-split |
| TC-35 | e2e — live flow: 3 checked-in patients wait in order, Call Next, Skip, Transfer (removes from this board), unbilled-visits panel, TV display | full flow passes against the real dev stack |
