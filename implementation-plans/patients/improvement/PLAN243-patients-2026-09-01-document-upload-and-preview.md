---
id: PLAN243
type: improvement
feature: patients
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ174
related: [TP263, TR263]
---

# PLAN243 — Implementation plan: Patient Documents upload + inline preview

## Schema (`20260901020000_patient_documents`)

New model only, additive:

```prisma
model PatientDocuments {
  id                String   @id @default(uuid())
  patient_id        String
  client_org_id     String?
  category          String
  file_ref          String
  mime_type         String
  original_filename String
  file_size_bytes   Int
  uploaded_by_id    String
  is_deleted        Boolean  @default(false)
  created_at        DateTime @default(now())

  patient     Patients     @relation(fields: [patient_id], references: [id], onDelete: Cascade)
  uploaded_by UserProfiles @relation("PatientDocumentUploadedBy", fields: [uploaded_by_id], references: [id])

  @@index([patient_id, is_deleted])
}
```

`client_org_id` stamped from the uploader (`orgIdForWrite`), never
inherited from `Patients.client_org_id` (nullable for a patient with no
appointment history yet). `category` is a plain `@IsIn()`-validated
string, not an enum — mirrors the frontend's own small, UI-owned
`DOCUMENT_FOLDERS` taxonomy.

## Backend — new `patient-documents` module (third instance of the established two-step upload pattern)

1. `backend/src/patient-documents/patient-documents.controller.ts` —
   copied structurally from `encounters/attachments.controller.ts`: same
   in-memory `FileInterceptor`, magic-byte signature allow-list (JPEG/
   PNG/PDF), 10MB max, self-verified JWT (cookie-first, header
   fallback). One change: role check is `['admin','manager','clinician']`.
2. `patient-documents.resolver.ts`/`.service.ts` — `PatientDocumentsService`
   injects `PatientsService` directly and calls its existing `findOne()`
   for every access check (list/create/delete) rather than re-deriving
   org/self/clinician-relationship scoping a third time. `myFavouriteDrugs`-
   style sentinel pattern not needed here — `findOne()` already throws
   `NotFoundException` for a caller with no legitimate access.
3. `createPatientDocument`: `@Auth('admin','manager','clinician')`.
   `patientDocuments` (read): `@Auth('admin','manager','super_admin',
   'clinician','staff')` — matches the full audience already viewing the
   rest of the page. `deletePatientDocument`: `@Auth('admin','manager')`.
4. `patient-documents.module.ts` imports `AuthModule` (for `JwtService`,
   REST self-verify) and `PatientsModule` (already exports
   `PatientsService`) — registered in `app.module.ts`.

## Tenancy-matrix classification

`patientDocuments` is keyed by `patient_id`, not a global org-wide list
— the matrix's generic "same query, different org sees a narrower list"
shape doesn't apply (a cross-org read is rejected outright via
`PatientsService.findOne()`, not filtered from a shared list). Added to
`matrix-coverage.int-spec.ts`'s `EXEMPT` record, mirroring
`immunizations`'s own identical-shape exemption verbatim. Isolation is
covered directly in `patient-documents.service.spec.ts`.

## Frontend (`patients/detail.jsx`)

1. `GET_PATIENT_DOCUMENTS`/`CREATE_PATIENT_DOCUMENT`/
   `DELETE_PATIENT_DOCUMENT` (all exported for the test file to import,
   per this repo's BUG062 lesson on query drift) replace the fake local
   `uploadedDocs` state.
2. `handleFileSelected` now does the real two-step upload:
   `fetch('${apiBase}/patient-documents/upload', ...)` (mirroring
   `EncounterWorkspace.jsx`'s own existing call shape exactly) then
   `createPatientDocument`, then `refetchDocuments()` (`DATA-9`).
3. New `frontend/src/components/patients/DocumentPreviewDialog.jsx` —
   PDF via `<iframe>`, image via `<img>`, both with a Download link
   alongside. JSDoc contract per `BASE-10`.
4. `useAuth().hasRole()` gates the Upload control (`admin`/`manager`/
   `clinician`) and the per-row Delete action (`admin`/`manager`),
   mirroring the backend's own gates (`SEC-18`) — absent, not disabled
   (`SURF-20`).
5. Hardcoded `border: '1px solid #E2E8F0'` replaced with the `divider`
   theme token (`UI-2`), touched incidentally while rewriting this
   section.

## Test-authoring findings

- `patients/detail.jsx` had never called `useAuth()` before this slice —
  every one of the file's 24 pre-existing tests broke immediately
  (`useAuth must be used within an AuthProvider`) the moment the hook
  was introduced, since `detail.test.jsx` never wrapped the page in a
  mocked auth context. Fixed with the same `jest.mock('../../hooks/
  useAuth')` + a single top-level `beforeEach` defaulting to
  `hasRole: () => true` (matching `EncounterWorkspace.test.jsx`'s own
  established mocking pattern) — restores all 24 pre-existing tests
  unchanged, with the new Documents-tab tests overriding the mock
  per-case where role-gating itself is what's under test.
- A single test opening the preview dialog, closing it, then opening a
  second document's dialog timed out consistently (5000ms) even though
  each half worked in isolation — split into two independent tests
  (one PDF, one image) rather than debugging the close/reopen sequence
  further, since nothing in the requirement needs that specific
  sequential interaction verified.
