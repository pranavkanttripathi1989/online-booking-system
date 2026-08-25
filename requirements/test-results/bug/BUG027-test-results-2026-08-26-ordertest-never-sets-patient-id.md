---
id: BUG027
type: bug
feature: test-results
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: []
---

# BUG027 — `orderTest` never set `patient_id`, making patient self-scoping permanently dead code

## Source

`project-plans/02-findings-register.md` F-08, part of the same
10-finding pick-up as `BUG024`–`BUG026`. Re-verified still fully open:
`OrderTestInput` had only `patient` (free text) and `testType`; the
"Order New Test" dialog in `pages/test-results/index.jsx` was a plain
text field with no patient picker.

## The bug, precisely

`findAll()`/`findOne()` both scope a `'patient'`-role caller via
`patient_id: user.patient_id ?? '__no_patient_link__'` — real,
tested, security-relevant self-scoping. But `orderTest()` never wrote
`patient_id` at all; every ordered test's `patient_id` was `null`. A
patient could therefore never see their own lab results — the filter
never matched any real row, because no row was ever linked to any
`patient_id`. The self-scoping code was live and tested against a
column nothing ever populated.

## Fix

`OrderTestInput` gained a required `patient_id: String` field (`patient`
stays as the free-text display name, now populated from the selected
patient rather than typed by hand — same denormalization convention
this schema uses elsewhere). `orderTest()` validates the target patient
exists and belongs to the caller's own org (Hard Rule 6, using `Patients
.client_org_id` — now real, thanks to `BUG024` landing in the same
pass) before writing `patient_id` onto the new row.

`pages/test-results/index.jsx`'s Order dialog replaced the free-text
"Patient Name" field with a real Autocomplete against `PATIENTS_QUERY`,
matching the exact pattern `BookingStep4Patient.jsx` already uses for
the same kind of patient search-and-select.

## Acceptance criteria (Given/When/Then)

- **Given** a real patient in the caller's own org, **when** a test is
  ordered for them, **then** the created row's `patient_id` is set, and
  that patient can subsequently see the result via `testResults`/
  `testResult`.
- **Given** a `patient_id` belonging to a different org, **then** the
  order is rejected (Hard Rule 6).
- **Given** an unknown `patient_id`, **then** the order is rejected with
  a clean error, not a raw FK constraint failure.
- **Given** the Order Test dialog, **then** a real, searchable patient
  picker replaces the old free-text field.

## Traceability

`project-plans/02-findings-register.md` F-08.
