---
id: CTX-clinical-records-2026-08-26-req135
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ135
related: [PLAN175, TP195, TR195]
---

# clinical-records — REQ135: referral status-transition mutation (2026-08-26)

Second slice of the next 10-slice batch (`project-plans/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ135 | [Referral status transition](../../requirements/clinical-records/improvement/REQ135-clinical-records-2026-08-26-referral-status-transition.md) |
| implementation-plans | PLAN175 | [implementation plan](../../implementation-plans/clinical-records/improvement/PLAN175-clinical-records-2026-08-26-referral-status-transition.md) |
| test-plans | TP195 | [verification plan](../../test-plans/clinical-records/improvement/TP195-clinical-records-2026-08-26-referral-status-transition.md) |
| test-results | TR195 | [verification results — pass](../../test-results/clinical-records/improvement/TR195-clinical-records-2026-08-26-referral-status-transition.md) |

## What shipped

`REQ128`'s own doc named referral status transitions as explicitly not
built. New `updateReferralStatus` mutation enforces a transition state
machine (`pending → scheduled/completed/declined`; `scheduled →
completed/declined`; both terminal) — deliberately more permissive than
`REQ131`'s own `CLAIM_TRANSITIONS` since a referral is tracking
metadata, not money. Gated broader than referral creation
(`clinician`/`manager`/`admin`/`super_admin`/`staff`), since recording
an outcome is administrative follow-up. `EncounterWorkspace.jsx`'s
Referrals list now shows the legal next-status buttons per referral.

Two real scope limits logged, not silently dropped: no decline-reason
field exists (would need its own migration); `EncounterWorkspace.jsx`
is clinician-only gated at the page level, so the broader backend
`@Auth` gate has no matching frontend surface for staff/manager callers
outside the consultation workspace yet.

## Verification

Backend: 92/92 unit suites, 1539/1539 tests (9 new); integration 4/4
suites, 387/387 unchanged (no schema change this slice). `tsc
--noEmit`/`eslint` clean. Frontend: `EncounterWorkspace.test.jsx` 15/15
(3 new), `eslint` clean, full lint ratchet unchanged at 1909.
