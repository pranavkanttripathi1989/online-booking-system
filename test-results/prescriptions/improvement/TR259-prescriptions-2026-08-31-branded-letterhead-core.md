---
id: TR259
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: pass
parent: TP259
related: [REQ170, PLAN239]
---

# TR259 — Results: branded clinic letterhead core

## Backend

- `npx jest --maxWorkers=2` (full suite, run once for all 3 slices of
  this batch together): **135/135 suites, 2148/2148 tests, green.**
- `npm run test:int` (from host, `postgres_test` already up): **9/9
  suites, 441/441 tests, green.** Unrelated pre-existing
  `WebhookDispatchService` decrypt-error log noise in the output, same
  deliberately-invalid-fixture pattern documented in `TR233`.
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npx prisma validate`: schema valid.
- New tests: `clinics.service.spec.ts` gained a 3-test
  `letterhead_clinician_ids validation (REQ170)` block (21/21 total in
  that file); `clinicians.service.spec.ts` gained a 1-test assertion that
  `qualifications`/`registration_number`/`specialty_highlights` reach
  `prisma.clinicians.create()` (23/23 total).

## Live verification (real running container, not just compiled)

`docker exec medibook_backend npx prisma generate` (required — the
service's anonymous `/app/node_modules` volume means a host-side generate
never reaches the container, see `PLAN239`) then `docker restart
medibook_backend`. Confirmed via `docker logs`: "Nest application
successfully started", "GraphQL endpoint ready". Introspected the live
schema directly:

```
Clinic.fields         → includes website, alternate_phone,
                         appointment_note, letterhead_clinician_ids
PrescriptionLetterheadDoctor.fields
                       → full_name, qualifications, registration_number,
                         specialty_highlights
PrescriptionPrintClinic.fields
                       → includes address, alternate_phone,
                         appointment_note, email, tagline, website
```

All fields genuinely served, not just present in the compiled schema file
on disk.

## Frontend

- `npx jest --runInBand src/pages/prescriptions/PrescriptionPrint.test.jsx`:
  **11/11 green** (7 pre-existing + 4 new: no-config regression,
  full letterhead+doctors+footer, clinical-content+composition,
  LMP/EDD/GA).
- `npx jest --runInBand src/pages/settings/index.test.jsx`: **13/13
  green** (12 pre-existing + 1 new: saves tagline/website/letterhead
  doctors).
- `npx jest --runInBand --testTimeout=20000
  src/pages/clinicians/CreateClinicianPage.test.jsx`: **6/6 green**. (A
  bare default-timeout full-file run showed 5 failures under this
  session's abnormal host load — `uptime` measured a 38.43 load average
  vs. this codebase's documented single-digit norm; every failure was
  `Exceeded timeout of 5000ms`, none an assertion mismatch, and the
  `createClinician` end-to-end test alone passed at 4983ms — a hair under
  the default. Confirmed host-load flakiness, not a regression from the
  new `specialty_highlights`/`qualifications`/`registration_number` input
  wiring.)
- `npm run lint`: **0 errors**, 3417 warnings (ratchet ceiling 4908, not
  raised). Some new admin-facing fields (Website/Alternate Phone/
  Appointment Note/Specialty Highlights labels) are literal strings, not
  yet routed through `t()` — consistent with this codebase's existing,
  documented I18N-1 debt on staff-facing settings screens; not a
  regression on patient-facing content.
- `npm run build`: succeeds.

## Real pre-existing bugs found and fixed (not originally scoped)

See `REQ170`'s own account — `ClinicianInput` DTO missing
`qualifications`/`registration_number`; the real create/update mutation
calls never sending them; `CLINICIAN_FIELDS` fragment never selecting
`qualifications`. All three closed in this slice's own commit.
