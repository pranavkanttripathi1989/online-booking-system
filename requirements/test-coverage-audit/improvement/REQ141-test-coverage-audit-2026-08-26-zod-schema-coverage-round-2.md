---
id: REQ141
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ132
related: [PLAN181, TP201, TR201]
---

# REQ141 — Zod-schema test coverage, round 2 (2 of the 7 files REQ132 named)

## Why this slice

`REQ132`'s own "Deliberately out of scope" section named 7 zod-schema-
using files with zero test coverage (`ClinicProfileForm.jsx`,
`ClinicianFormDrawer.jsx`, `patients/index.jsx`, `tasks/index.jsx`,
`admin/Roles.jsx`, `CreateClinicianPage.jsx`, `EditClinicianPage.jsx`),
auditing all of them at once as its own, larger slice. This picks the
2-3 highest-risk (patient-data-mutating) of those, matching that
deferral note.

## Investigation before picking

Confirmed all 7 still have zero dedicated test files. Ranked by risk
before choosing:

- `patients/index.jsx` — real patient PHI, the obvious top candidate by
  name alone.
- `admin/Roles.jsx` — RBAC role creation; not "patient data" literally,
  but arguably higher-consequence than most of the list — a malformed
  role definition can mis-gate real PHI access.
- `CreateClinicianPage.jsx`/`EditClinicianPage.jsx` — clinician-record
  mutation; picked `CreateClinicianPage.jsx` as the write-side (all
  fields blank, more failure-prone than an edit starting from real
  data).
- `ClinicProfileForm.jsx`/`ClinicianFormDrawer.jsx`/`tasks/index.jsx` —
  lower risk (org-level config; `tasks/index.jsx` is also still the
  codebase's one remaining fully-mock page, so its zod schema currently
  guards fabricated data, not a real mutation) — left for a future
  round.

## A real finding before writing a single test — `patients/index.jsx`'s named schema was dead code

Reading `patients/index.jsx` to write its tests found `AddPatientDialog`
(and its `newPatientSchema`) was never rendered anywhere in the file,
never exported, and not the target of the page's own real "Add Patient"
button — that button `navigate()`s to `/patients/new`, a completely
separate routed page (`CreatePatientPage.jsx`). `AddPatientDialog`'s own
`open` prop was driven by an `addOpen` state variable whose setter
(`setAddOpen`) was never called anywhere either, confirming it could
never have opened even if it had been rendered — this was unreachable
from two independent directions, not just unrendered-but-wireable.

Its `onSubmit` also had a real defect that's moot now the block is
gone: any `createPatient` mutation failure was caught and silently
treated as success (`reset(); onSuccess?.(); onClose()`), the exact
"fake success on a real save failure" class of bug this codebase has
found and fixed repeatedly elsewhere (`BUG023`).

Per `REQ132`'s own precedent for `utils/dateUtils.js` (a similarly
confirmed-dead file): deleted, not tested. Writing tests for
`newPatientSchema` would have meant testing a code path a real user can
never reach.

## What shipped

- `patients/index.jsx`: `AddPatientDialog`, `newPatientSchema`, and
  their now-unused imports/state (`addOpen`/`setAddOpen`, `MenuItem`)
  removed. `MergePatientsDialog` (confirmed live-rendered) and every
  other export/behaviour of the file are unchanged.
- `frontend/src/pages/admin/Roles.test.jsx` (new) — real roles render;
  an honest empty state; `roleSchema`'s min-length validation blocks
  submission client-side; the no-permissions-selected warning; a full
  create-role round trip via the real `createRole` mutation with the
  selected permission ids, refetching afterward.
- `frontend/src/pages/clinicians/CreateClinicianPage.test.jsx` (new) —
  real clinics render in the assignment dropdown; `clinicianSchema`'s
  required-field and email-format validation; the `.refine()` rule
  requiring a "covering for" clinician once the locum toggle is on; a
  full create round trip via the real `createClinician` mutation; a
  real mutation failure surfaces as an error toast, not a fake success
  (confirms no silent-failure regression on this file, since it was
  already correctly wired).

## Deliberately out of scope

- The remaining 4 files (`ClinicProfileForm.jsx`, `ClinicianFormDrawer.jsx`,
  `tasks/index.jsx`, `EditClinicianPage.jsx`) — still zero test coverage,
  logged here rather than silently left unmentioned; a future round.
- Auditing `CreatePatientPage.jsx` (the real add-patient page this
  slice's own investigation surfaced as the actual live entry point) —
  it doesn't use zod at all (plain manual validation), so it wasn't a
  named target of this "zod-schema coverage" batch item; a worthwhile
  future target on its own merits, not bundled here.
- `is_locum`/`locum_for`/`locum_start_date`/`locum_end_date` never
  reaching `CreateClinicianInput` on the backend — a real, separate,
  already-logged gap (`context/open-questions.md`, noted in
  `CreateClinicianPage.jsx`'s own comment), not this slice's to fix.
