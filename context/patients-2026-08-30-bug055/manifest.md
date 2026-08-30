---
id: CTX-patients-2026-08-30-bug055
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [BUG055, PLAN226, TP246, TR246]
---

# `patients/detail.jsx` fabricated identity + appointments (2026-08-30)

User-reported live (a real patient, "Priya Patient", real id
`7ea9442e-e2c6-42a4-85b0-268e59fcb51d`): the page rendered a fixed,
unrelated mock identity ("John Michael Doe") and four fabricated
appointments regardless of which real patient was opened. Root cause:
`MOCK_PATIENTS_DETAIL[id] ?? MOCK_PATIENT_DEFAULT` never matches a real
UUID.

Fixed by adopting an already-proven, already-used-elsewhere query
(`PATIENT_DETAIL_QUERY`, already correctly consumed by
`PatientDetailDrawer.jsx`/`EditPatientPage.jsx`) — no backend change.
Wired real identity + real Appointments tab; dropped 6 header/Overview
fields with zero real backing rather than faking them (`status`,
`blood_type`, `outstanding_balance`, `primary_clinician`); derived 2
honestly from the real data (`total_visits`, `last_visit`). Test Results
has no real per-patient backend query at all (confirmed by code read,
not assumed) and stays mock with an honest on-screen disclosure — logged
as a new backend gap, `context/open-questions.md #20`, not worked around
with a name-matching hack.

Live testing (the user's own screenshots, real-time as the fix landed)
surfaced three follow-up polish items, all fixed the same pass: the
header stat chips looked flat/unstyled (restyled with theme-token
soft-tint colors matching the existing `statusChipSx` convention); one
chip's icon didn't inherit its intended color (MUI's `.MuiChip-icon`
needs an explicit `color: inherit !important` override); and the Test
Results disclosure caption's first draft leaked an internal repo file
path into user-facing text (fixed to plain language). The raw full UUID
in the header was also shortened to a 6-character suffix, matching
`appointments/detail.jsx`'s own existing convention.

## Verification

13/13 unit tests pass (8 pre-existing + 5 new); `eslint` 0 errors on both
touched files. Live-verified end-to-end against the real dev stack and
confirmed directly by the user across multiple live screenshots.

## Documents

- `requirements/patients/bug/BUG055-*.md`
- `implementation-plans/patients/bug/PLAN226-*.md`
- `test-plans/patients/bug/TP246-*.md`
- `test-results/patients/bug/TR246-*.md`
- `context/open-questions.md #20` (new — Test Results per-patient backend gap)

## Not done this pass, stated not hidden

- Test Results tab remains mock — needs a `patient_id` FK + resolver
  filter on `TestResults`, a real backend slice, not a frontend fix.
- The 5 tabs already explicitly deferred by `open-questions.md #13`
  (Letters, membership, intake questionnaire, documents, communication
  log/allergy-diagnosis, related-account linking) remain untouched.
- Prescription history on this page (requested by the user immediately
  after this fix, "related to consultations and patient details") is a
  separate, not-yet-scoped follow-up — not folded into this bundle.
