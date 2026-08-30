---
id: CTX-prescriptions-2026-08-30-bug056
type: bug
feature: prescriptions
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [BUG056, PLAN227, TP247, TR247]
---

# No way to view consultation/prescriptions from a completed appointment (2026-08-30)

User-reported live against a real completed appointment: no way to see
what happened in the consultation or what medicine was prescribed — "I
can't see the prescription." Two compounding, purely-frontend gaps
(backend relationships already existed end-to-end, confirmed by code
read before touching anything):

1. `appointments/detail.jsx`'s Actions card — including the only
   consultation entry point — disappears entirely once an appointment
   is `completed`, with nothing in its place.
2. `EncounterWorkspace.jsx` never displayed prescriptions already issued
   during an encounter, only a button to create a new one.

Fixed by adding a "View Consultation" button for completed appointments
(same route/gate as "Start Consultation"; `EncounterWorkspace.jsx`
already handles a signed/read-only encounter correctly) and a new
"Prescriptions" section reusing the existing, already-tested
`patientPrescriptions(patient_id)` query (filtered client-side to the
current encounter) — no backend change on either half.

## Verification

Unit: 3/3 new tests (`appointments/detail.test.jsx`, new file) + 2/2 new
tests (`EncounterWorkspace.test.jsx`); full EncounterWorkspace suite
24/25 (1 pre-existing, confirmed-unrelated contention-flaky test).
`eslint` 0 errors across all 4 touched files. Live-verified end-to-end
against the real dev stack on the exact appointment the user reported —
completed appointment → View Consultation → real signed encounter →
Prescriptions section → View → real rendered prescription.

## Documents

- `requirements/prescriptions/bug/BUG056-*.md`
- `implementation-plans/prescriptions/bug/PLAN227-*.md`
- `test-plans/prescriptions/bug/TP247-*.md`
- `test-results/prescriptions/bug/TR247-*.md`
