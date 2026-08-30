---
id: BUG055
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [PLAN226, TP246, TR246]
---

# BUG055 — `patients/detail.jsx` rendered a fabricated identity + appointment history for every real patient

## What was wrong

Live-reported by the user: opening `/patients/:id` for a real patient (a
real clinician's real patient, "Priya Patient") rendered a completely
unrelated, fixed mock identity ("John Michael Doe", "ID: #demo") and four
fabricated appointments with clinicians ("Dr. Jane Smith", "Dr. Carlos
Vega") that don't exist in the org at all.

## Root cause

`patients/detail.jsx:732` (pre-fix): `const p = MOCK_PATIENTS_DETAIL[id]
?? MOCK_PATIENT_DEFAULT`. The mock lookup table only had keys
`'pt-1'..'pt-5'`/`1..15` — a real UUID route param never matches any of
them, so every real patient silently fell through to the same hardcoded
default. `MOCK_APPOINTMENTS`/`MOCK_TESTS` were flat arrays with zero
relation to the route param at all.

## Fix

Wired Overview identity and the Appointments tab to the real,
already-proven `PATIENT_DETAIL_QUERY` (already used correctly elsewhere
by `components/Patients/PatientDetailDrawer.jsx` and
`pages/patients/EditPatientPage.jsx` — no backend change needed, no new
query invented). Six header/Overview fields with zero real backing
(`status`, `blood_type`, `outstanding_balance`, `primary_clinician`) were
dropped rather than faked, matching this repo's established precedent
(`context/open-questions.md` #8/#11(b)); two (`total_visits`,
`last_visit`) are now honestly derived from the real fetched appointment
data. Test Results has no real per-patient backend query at all
(confirmed by direct code read — no FK, no resolver filter) and stays
mock, now with an honest on-screen disclosure instead of silence — the
backend gap is logged as `context/open-questions.md` #20 rather than
worked around with a name-matching hack.

Also addressed during the same live-testing pass (screenshots from the
user against the real fix): the three header "stat" chips looked flat
and unstyled (plain MUI default outlined chips) — restyled with
theme-token soft-tint colors matching `statusChipSx`'s own convention,
better spacing, and an explicit icon-color override (MUI's `.MuiChip-icon`
does not automatically inherit a custom `sx.color`, which showed as a
mismatched icon on the membership chip); the raw full UUID in the header
(`ID: #7ea9442e-e2c6-...`) was shortened to a 6-character suffix, matching
`appointments/detail.jsx`'s own existing convention; and the Test Results
disclosure caption's first draft leaked an internal repo file path
(`context/open-questions.md`) into user-facing text — fixed to plain
language.

See `PLAN226` for the full technical account and `TR246` for verification.
