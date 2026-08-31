---
id: TP259
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: PLAN239
related: [REQ170, TR259]
---

# TP259 — Test plan: branded clinic letterhead core

Well-scoped slice against already-proven patterns (an existing PDF
renderer, an existing multi-branch join pattern) — suggestion stage
skipped per `CLAUDE.md`'s conditional rule, drafted directly.

## Backend unit (`prescriptions.service.spec.ts`, `clinics.service.spec.ts`, `clinicians.service.spec.ts`)

- `printPrescription` resolves `doctors` from `letterhead_clinician_ids`
  in stored order when configured.
- `printPrescription` falls back to `[issuing clinician]` when
  `letterhead_clinician_ids` is unset — the no-config regression case.
- `printPrescription`'s clinic/footer fields come from the visit's real
  branch (`Appointments.clinic_id`), not the org.
- `clinics.service.ts#update()` rejects a `letterhead_clinician_ids` value
  containing an id from a clinician outside the caller's own org
  (`BadRequestException`).
- `clinicians.service.ts#create()` passes `qualifications`/
  `registration_number`/`specialty_highlights` through to
  `prisma.clinicians.create()`'s `data` object.

## Frontend

- `PrescriptionPrint.test.jsx`: no tagline/footer/doctors section renders
  when the clinic has none configured (regression); the tagline, both
  letterhead doctors with their specialty highlights, and the footer band
  all render when configured.
- `settings/index.test.jsx`: loads and saves the new letterhead fields
  (tagline, website, letterhead doctors) via `getByDisplayValue`.

## Live verification

- Introspect the running GraphQL schema for `Clinic.{website,
  alternate_phone, appointment_note, letterhead_clinician_ids}` and
  `PrescriptionPrintPayload.doctors`/`PrescriptionLetterheadDoctor`'s
  fields — confirms the schema is genuinely served, not just compiled.
- `npx tsc --noEmit`, `npx eslint`, full backend unit + integration
  suites, frontend lint/build.
