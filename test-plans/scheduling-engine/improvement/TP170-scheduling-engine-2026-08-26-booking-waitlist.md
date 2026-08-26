---
id: TP170
type: improvement
feature: scheduling-engine
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN146
related: [REQ106]
---

# TP170 — Test plan: booking waitlist for fully-booked slots

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
additive new domain built against already-proven patterns (checklist's
own `clinic_id`-omitted org-wide shape, `notifyLinkedProfile`'s
find-then-dispatch shape, the existing `@Cron` sweep-service
convention).

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `joinWaitlist` — unlinked patient account | `{success: false}`, no row created |
| 2 | `joinWaitlist` — nonexistent clinician | `{success: false}` |
| 3 | `joinWaitlist` — derives `client_org_id` from the clinician's own clinic | Correct even for a platform-operator caller (`client_org_id: null`) — Hard Rule 6, the exact `departments.service.ts` bug class |
| 4 | `joinWaitlist` — duplicate active entry (same patient/clinician/date) | Rejected, no second row |
| 5 | `joinWaitlist` — position computation | `count(status: waiting) + 1` for that clinician/date |
| 6 | `joinWaitlist` — date parsing | A `YYYY-MM-DD` string parses to UTC midnight, never a local-clock-hour construction |
| 7 | `myWaitlistEntries` — unlinked patient | `[]`, never every patient's entries |
| 8 | `myWaitlistEntries` — self-scoped | Only the caller's own `patient_id` rows |
| 9 | `clinicWaitlist` — `clinic_id` omitted | Org-wide (own org only) |
| 10 | `clinicWaitlist` — cross-org `clinic_id` | `[]`, not the other org's entries |
| 11 | `clinicWaitlist` — platform operator | Can list any clinic's entries |
| 12 | `cancelWaitlistEntry` — another patient's entry | Rejected |
| 13 | `cancelWaitlistEntry` — own entry | Cancelled |
| 14 | `promoteNext` — no waiting entry | No-op, no notification |
| 15 | `promoteNext` — happy path | Earliest `waiting` entry (by `position`) set to `notified` with `claim_expires_at` +30 min; linked patient notified via `waitlist_slot_available` |
| 16 | `promoteNext` — unlinked patient | Notification skipped silently, entry still promoted |
| 17 | `WaitlistExpirySweepService` — non-expired `notified` entry | Left alone |
| 18 | `WaitlistExpirySweepService` — lapsed claim | Set `expired`; `promoteNext` called for the next entry in that clinician/date's queue |
| 19 | `appointments.service.ts#transitionStatus` — cancel | Calls `waitlistService.promoteNext` with the right clinician + UTC-midnight date |
| 20 | `appointments.service.ts#transitionStatus` — no_show | Same as case 19 |
| 21 | `appointments.service.ts#transitionStatus` — an unrelated transition (e.g. completing) | Does NOT call `promoteNext` |
| 22 (integration) | Tenancy matrix — `waitlist` domain, `clinicWaitlist` query | Org-A caller sees only org-A's entry; cross-org rejected; role gate matches `allowedRoles` |
| 23 (frontend) | `booking/index.jsx` — no availability, authenticated patient | "Join Waitlist" button calls the real mutation, shows queue position |
| 24 (frontend) | `booking/index.jsx` — no availability, anonymous visitor | "Log in to join the waitlist" prompt instead of the action (deliberately not anonymous, per REQ106's own scope) |
| 25 (frontend) | `patient/Appointments.jsx` — new Waitlist tab | Lists the patient's own entries with status and a cancel action for `waiting`/`notified` entries |
