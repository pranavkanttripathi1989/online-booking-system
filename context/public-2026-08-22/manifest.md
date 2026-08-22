---
feature: public
date: 2026-08-22
ids: [REQ013, TP053, TR052]
status: done
---

# public — 2026-08-22

Closes `REQ013` Finding 1's real documentation-coverage gap: `backend/src/public/**` (the entire unauthenticated, patient-facing doctor-discovery/booking surface — `getClinicians`, `getClinician`, `getProducts`, `getAppointments`, `getAppointment`, `bookPatientAppointment`) had no test-plan at all. The only prior doc touching this surface, `test-plans/booking-wizard/requirement/booking-wizard-test-plan.md` (`TP005`), predated this backend module entirely and was never executed even against the mock version it was written for — superseded, not deleted (see [`booking-wizard — 2026-03-19` bundle](../booking-wizard-2026-03-19/manifest.md)).

No bugs found — this domain was already correctly implemented, including a real, previously-fixed IDOR on `getAppointment` (video-call join links): the resolver's own code comment documents that it used to require login but never check the caller's actual identity, letting any authenticated user view any appointment's detail via a guessed or shared link. Live-verified this session via direct GraphQL calls: a genuinely unrelated, unlinked clinician account correctly receives a real 404 for another clinician's appointment, while the real participant, same-org staff, and platform admin all correctly succeed.

`landing.jsx` remains genuinely mock (its own `MOCK_DOCTORS` array, never calling the real, working `getClinicians` query) — a real, already-logged, separate gap, not something this documentation pass silently closed or claimed fixed.

Live browser re-verification of the pre-existing `public-booking.spec.js`/`booking-payment.spec.js` specs was blocked by the same host resource issue affecting the rest of this session's Phase B work (see `TR051`/`TR052` for detail) — neither spec is known or suspected broken, just not re-driven live this pass.

## Requirement

- [REQ013 — Test documentation coverage: gap analysis & closure requirements](../../requirements/test-coverage-audit/requirement/REQ013-test-coverage-audit-2026-08-22-documentation-gap-analysis.md) — approved (Phase B)

## Test plan

- [TP053 — Public patient self-serve surface — Test Plan](../../test-plans/public/requirement/TP053-public-2026-08-22-patient-self-serve-booking.md) — approved

## Test result

- [TR052 — Public patient self-serve surface — Test Result](../../test-results/public/requirement/TR052-public-2026-08-22-patient-self-serve-booking.md) — passed

## Related

- [booking-wizard — 2026-03-19 bundle](../booking-wizard-2026-03-19/manifest.md) — the superseded mock-era predecessor to this bundle's test-plan.
