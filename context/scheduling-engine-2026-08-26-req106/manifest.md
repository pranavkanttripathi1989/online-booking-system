---
id: CTX-scheduling-engine-2026-08-26-req106
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ106
related: [PLAN146, TP170, TR170]
---

# scheduling-engine — REQ106: booking waitlist for fully-booked slots (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/analysis/10-next-14-slice-batch-reconciled.md`).
First of REQ017's four deferred P1 items (hybrid-mode interleaving,
waitlist, delay broadcast, bulk-reschedule) to be picked up.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ106 | [booking waitlist](../../requirements/scheduling-engine/improvement/REQ106-scheduling-engine-2026-08-26-booking-waitlist.md) |
| implementation-plans | PLAN146 | [implementation plan](../../implementation-plans/scheduling-engine/improvement/PLAN146-scheduling-engine-2026-08-26-booking-waitlist.md) |
| test-plans | TP170 | [verification plan](../../test-plans/scheduling-engine/improvement/TP170-scheduling-engine-2026-08-26-booking-waitlist.md) |
| test-results | TR170 | [verification results — pass](../../test-results/scheduling-engine/improvement/TR170-scheduling-engine-2026-08-26-booking-waitlist.md) |

## What shipped

New `backend/src/waitlist/` module: `joinWaitlist`/`myWaitlistEntries`/
`clinicWaitlist`/`cancelWaitlistEntry`, a new `WaitlistEntries` table
(one row per patient/clinician/date), and a `WaitlistExpirySweepService`
(`@Cron` every 5 minutes) that expires a lapsed 30-minute claim window
and promotes the next queued entry. `appointments.service.ts#transitionStatus()`
now calls `WaitlistService#promoteNext()` on cancel/no_show — the exact
hook point its own pre-existing "REQ017: a cancelled/no_show appointment
frees its resources" comment already marked. Frontend: a "Join
Waitlist" button on `booking/index.jsx`'s existing "No availability"
alert (gated on a real, linked patient account — a login prompt
otherwise, since this is deliberately not anonymous), and a new
"Waitlist" tab on `patient/Appointments.jsx` listing the patient's own
entries with a cancel action.

Notify-only with a time-boxed claim window, never auto-booking on
promotion — the safer of the two designs `REQ017`'s own deferral note
left open (auto-booking risks double-booking against a concurrent
walk-in/token slot in hybrid mode).

## A real, proactively-avoided bug class

`joinWaitlist()` derives `client_org_id` from the target clinician's
own clinic, never from the caller — the exact `departments.service.ts`
bug class this codebase already found and fixed once (Phase G+1). Case
3 in `TP170` pins this with a platform-operator caller specifically,
the scenario that bug class fails on.

## Cross-session coordination

Four shared files (`schema.prisma`, `app.module.ts`, `fixture.ts`,
`domain-cases.ts`) had a second Claude Code session's own uncommitted
`Tasks` (`REQ080`) work throughout this slice. Isolated via the
hand-crafted-patch + `git apply --cached` technique — see `TR170`'s own
account for the verification that their work stayed untouched.

## Deliberate deviations from the plan

1. The patient-facing list is a new tab on the existing
   `patient/Appointments.jsx`, not a new dedicated page — the plan
   itself offered this as an equally-valid alternative.
2. No new Playwright e2e spec — no browser-automation tool was
   available this session (same honestly-logged gap as `REQ072`/
   `TR125` and this same batch's `REQ110`).

## Verification

Backend: 90/90 unit suites, 1408/1408 tests (20 new — 17 in
`waitlist.service.spec.ts`, 3 in `waitlist-expiry-sweep.service.spec.ts`,
3 in `appointments.service.spec.ts`); `tsc --noEmit` and `eslint` both
clean. Integration: 4/4 suites, 387/387 tests (up from 369 — the new
`waitlist` tenancy-matrix domain). Frontend: 0 lint errors on both
touched files.
