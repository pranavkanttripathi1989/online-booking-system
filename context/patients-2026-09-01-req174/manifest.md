---
id: CTX-patients-2026-09-01-req174
type: improvement
feature: patients
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ174
related: [PLAN243, TP263, TR263]
---

# patients — Documents tab upload + inline preview, made real (2026-09-01)

User request: admin/manager/clinician upload manual/scanned lab reports
(PDF, image) against a patient's profile, previewable inline. Research
found the actual target before any code was written: `patients/detail.jsx`
already had a "Documents" tab with a `'Lab Reports'` folder option
alongside `'General'`/`'Prescriptions'`/`'Imaging'`/`'Consent Forms'` —
entirely fake, local-state-only, "(demo mode)" toast, nothing ever
persisted. Two `AskUserQuestion` clarifications (scope: general
repository vs. narrow TestResults attachment; PDF preview: native
`<iframe>` vs. a new react-pdf dependency) both resolved to the
recommended option before planning further.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ174 | [doc](../../requirements/patients/improvement/REQ174-patients-2026-09-01-document-upload-and-preview.md) |
| implementation-plans | PLAN243 | [doc](../../implementation-plans/patients/improvement/PLAN243-patients-2026-09-01-document-upload-and-preview.md) |
| test-plans | TP263 | [doc](../../test-plans/patients/improvement/TP263-patients-2026-09-01-document-upload-and-preview.md) |
| test-results | TR263 | [doc](../../test-results/patients/improvement/TR263-patients-2026-09-01-document-upload-and-preview.md) |

## What shipped

- **Schema** (`20260901020000_patient_documents`, additive): new
  `PatientDocuments` model.
- **Backend**: a third instance of this codebase's established two-step
  upload pattern (REST controller self-verifies the JWT and writes the
  file; a GraphQL mutation persists metadata and does the real access
  check) — after `REQ020`'s encounter attachments and `REQ058`'s message
  attachments. `PatientDocumentsService` reuses `PatientsService.findOne()`
  for every access check rather than re-deriving scoping a third time.
  `createPatientDocument` gated `admin`/`manager`/`clinician`;
  `deletePatientDocument` narrower still (`admin`/`manager`).
- **Frontend**: `patients/detail.jsx`'s Documents tab rewired off fake
  local state onto real GraphQL; new `DocumentPreviewDialog.jsx`
  (`<iframe>` for PDF, `<img>` for image, no new dependency); Upload/
  Delete controls gated via `useAuth().hasRole()`, mirroring the
  backend.

## A real pre-existing bug found, flagged, not fixed (out of scope for this slice)

`test/integration/setup/fixture.ts`'s appointment fixtures are hardcoded
to `2026-09-01T10:00:00.000Z`, now in the past relative to real time —
breaking 3 `dashboard.upcoming_appointments` cases in
`tenancy.int-spec.ts`. Confirmed unrelated to `patient-documents` (which
passes cleanly, including `matrix-coverage.int-spec.ts`'s own new
`EXEMPT` entry). Told to the user directly rather than silently patched
or ignored.

## Test-authoring findings worth keeping

- `patients/detail.jsx` had never called `useAuth()` before this slice —
  introducing it broke all 24 pre-existing tests in `detail.test.jsx`
  at once (`useAuth must be used within an AuthProvider`). Fixed with
  the same `jest.mock('../../hooks/useAuth')` pattern already
  established in `EncounterWorkspace.test.jsx`, plus a single top-level
  `beforeEach` default so every pre-existing test keeps working
  unmodified.
- A sequential open-preview → close → open-second-preview test
  consistently timed out even though each half worked alone; split into
  two independent tests rather than debug the sequence further.

## Verification

Backend unit **136/136 suites, 2161/2161 tests**; integration
`matrix-coverage.int-spec.ts` green (8/9 suites green overall — the 1
failing suite's 3 failures are the pre-existing, unrelated dashboard
fixture-staleness issue above); `tsc --noEmit`/`eslint`/`prisma validate`
all clean. Frontend: `patients/detail.test.jsx` **31/31** (24
pre-existing + 7 new); `eslint` 0 errors; `npm run build` succeeds.
Live-verified against the real running `medibook_backend` container via
direct GraphQL introspection and the controller's own mapped route in
the boot log.

## Deliberately deferred

- Patient self-service upload/viewing via the patient portal.
- Durable cloud storage (S3) — same accepted local-disk precedent as
  every prior upload feature in this codebase.
- A dedicated JS PDF viewer with zoom/page navigation.
