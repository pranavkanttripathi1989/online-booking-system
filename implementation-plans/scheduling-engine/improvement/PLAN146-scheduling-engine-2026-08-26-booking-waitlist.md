---
id: PLAN146
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ106
related: [TP170, TR170]
---

# PLAN146 — Booking waitlist for fully-booked slots

Note: there is no dedicated `backend/src/scheduling-engine/` module —
REQ017's own mode-aware logic lives inline in `appointments.service.ts`
(the `booking_mode`/`token_no` columns and the advisory-lock capacity
check), not a separate module. This plan builds waitlist as its own new
`backend/src/waitlist/` module rather than folding it into
`appointments/`, consistent with how other REQ017-adjacent features
(`queue`, `checklist`) already got their own dedicated module.

## Schema

New model in `backend/prisma/schema.prisma`, placed near `Appointments`:

```prisma
enum WaitlistStatus {
  waiting
  notified
  claimed
  expired
  cancelled
}

model WaitlistEntries {
  id             String         @id @default(uuid())
  client_org_id  String         // derived from the clinic at create time (Hard Rule 6 — never from the caller; see the departments.service.ts bug this exact mistake caused)
  clinic_id      String
  clinician_id   String
  patient_id     String
  waitlist_date  DateTime       // date only, no time-of-day
  status         WaitlistStatus @default(waiting)
  position       Int            // 1-based queue position at creation time, stable thereafter
  notified_at    DateTime?
  claim_expires_at DateTime?
  created_at     DateTime       @default(now())
  updated_at     DateTime       @default(now())

  clinic    Clinics    @relation(fields: [clinic_id], references: [id])
  clinician Clinicians @relation(fields: [clinician_id], references: [id])
  patient   Patients   @relation(fields: [patient_id], references: [id])

  @@index([clinician_id, waitlist_date, status])
  @@index([client_org_id])
  @@index([patient_id])
}
```

Index leads with `clinician_id` (the selective column, matching F-13's
own rule — never lead a composite with `client_org_id`), since the hot
query is always "next waiting entry for this clinician+date".

Migration: hand-written SQL under
`backend/prisma/migrations/<timestamp>_waitlist_entries/migration.sql`
— `CREATE TYPE "WaitlistStatus" AS ENUM (...)`, `CREATE TABLE
"WaitlistEntries" (...)`, three `CREATE INDEX` statements, two
`ALTER TABLE ... ADD CONSTRAINT` foreign keys. Also needs a migration
adding `waitlist_slot_available` to the existing `NotificationEventType`
enum (`ALTER TYPE "NotificationEventType" ADD VALUE
'waitlist_slot_available'`) — **must be its own separate migration
file, applied before any code references the new value**, matching the
exact `break_glass_requested` precedent this schema already documents
(a missing enum value crashed the entire calling mutation live in a
prior slice).

## Backend

New `backend/src/waitlist/` module (module/resolver/service/dto/
entities, matching `project-plans/technical-plans/05-cross-cutting-
conventions.md`'s scaffold):

- `joinWaitlist(clinicianId, date)` mutation, `@Auth('patient')` only
  (self-scoped — always writes the caller's own `patient_id` from the
  JWT, never a client-supplied one, per Hard Rule 6). Derives
  `client_org_id` from the **clinician's clinic**, not the caller
  (avoiding the exact `departments.service.ts` bug class already found
  and documented). Rejects a duplicate active entry for the same
  patient/clinician/date. Computes `position` as `count(status:
  waiting) + 1` for that clinician/date.
- `myWaitlistEntries()` query, `@Auth('patient')`, self-scoped via
  `patient_id` from the JWT (never trust a client-supplied id).
- `clinicWaitlist(clinicId)` query, `@Auth('manager', 'admin',
  'super_admin')`, org-scoped via `orgScopeVia(user, 'clinic')` — never
  the banned `client_org_id ? {...} : {}` ternary.
- `cancelWaitlistEntry(id)` mutation, self-scoped (a patient can only
  cancel their own entry — verify `patient_id` matches before allowing).

Modify `backend/src/appointments/appointments.service.ts`'s
`transitionStatus()`: immediately after the existing "REQ017: a
cancelled/no_show appointment frees its resources" block, call a new
`WaitlistService#promoteNext(clinicianId, date)`:
- Finds the earliest `status: waiting` entry for that
  `(clinician_id, waitlist_date)`.
- Sets it to `notified`, stamps `notified_at`/`claim_expires_at` (+30
  min).
- Calls `notifyLinkedProfile('patient_id', patientId,
  'waitlist_slot_available', payload)` — reusing the exact existing
  helper, no new notification-dispatch code needed.

New `WaitlistExpirySweepService` (`@Cron('*/5 * * * *')`, matching the
existing `@Cron` pattern from `ScheduledReportsService`/
`LowStockSweepService`): finds `status: notified` entries where
`claim_expires_at < now()`, sets them `expired`, and promotes the next
entry in that clinician/date's queue (same `promoteNext` logic,
reused).

## Frontend

`frontend/src/pages/booking/index.jsx`'s existing "No availability"
`Alert` gains a "Join Waitlist" button, shown only when authenticated
(an anonymous visitor instead sees a "Log in to join the waitlist"
prompt, matching this page's own existing `OptionalAuthShell` pattern
for gating account-only actions). On click, calls `joinWaitlist`, shows
the returned queue position.

New `frontend/src/pages/patient/Waitlist.jsx` (or a section on the
existing patient dashboard) listing `myWaitlistEntries` with status and
a cancel action.

## Testing

- `waitlist.service.spec.ts`: `joinWaitlist` — happy path computes
  correct `position`; rejects a duplicate active entry; derives
  `client_org_id` from the clinic, not the caller (a dedicated test
  asserting this, mirroring the departments bug regression test).
  `myWaitlistEntries` — self-scoped, a patient never sees another
  patient's rows. `clinicWaitlist` — tenant-scoped, cross-org rejected.
  `promoteNext` — picks the earliest `waiting` entry, sets `notified`
  + `claim_expires_at`, calls `notifyLinkedProfile` with the right
  event type.
- `waitlist-expiry-sweep.service.spec.ts`: expires a stale `notified`
  entry and promotes the next one; leaves a non-expired entry alone.
- `appointments.service.spec.ts`: a new case confirming `transitionStatus`
  to `cancelled`/`no_show` calls `promoteNext` with the right
  clinician/date; confirming it does NOT call it for other status
  transitions.
- Live verification: cancel a real appointment with a real waiting
  entry queued for that clinician/date, confirm the entry flips to
  `notified` and a real notification is dispatched; let a claim window
  expire (or force it via direct SQL) and confirm the sweep promotes
  the next entry.
- e2e: patient joins a waitlist on a fully-booked day, sees their
  position; after a manager cancels the blocking appointment, the
  patient's entry shows `notified` on reload.

## Outcome (2026-08-26)

Implemented as planned, with two deliberate deviations:

1. **The patient-facing waitlist list lives as a new "Waitlist" tab on
   the existing `frontend/src/pages/patient/Appointments.jsx`** (index
   2, alongside Upcoming/Past), not a new dedicated
   `pages/patient/Waitlist.jsx` file — the plan itself offered this as
   an equally-valid alternative ("or a section on the existing patient
   dashboard"), and it avoids a new route/nav-registration step for one
   small list.
2. **No new e2e Playwright spec** — no browser-automation tool was
   available this session, the same honestly-logged gap as
   `REQ072`/`TR125` and `REQ110`/`PLAN150` earlier in this batch, not a
   silently skipped step.

`promoteNext()` runs AFTER `transitionStatus()`'s own `$transaction`
completes (same position as `notifyCancellation`), not inside it — a
missed promotion is recoverable (the 5-minute expiry sweep re-checks
any stale `notified` entry), but the appointment status write itself
must never roll back over a waitlist notification failure. See `TR170`
for full verification detail, including the cross-session concurrent-
edit reconciliation this slice's `schema.prisma`/`app.module.ts`/
`fixture.ts`/`domain-cases.ts` changes required (another Claude Code
session had uncommitted, unrelated `Tasks` (`REQ080`) changes to the
same four files throughout).
