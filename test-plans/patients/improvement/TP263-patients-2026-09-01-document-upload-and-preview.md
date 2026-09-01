---
id: TP263
type: improvement
feature: patients
created: 2026-09-01
updated: 2026-09-01
status: done
parent: PLAN243
related: [REQ174, TR263]
---

# TP263 — Test plan: Patient Documents upload + inline preview

Well-scoped slice against an already-proven pattern (this is the third
instance of the same REST-upload-plus-GraphQL-persist shape) —
suggestion stage skipped per `CLAUDE.md`'s conditional rule, drafted
directly.

## Backend unit (`patient-documents.service.spec.ts`)

- `findAll`/`create`/`remove` each call `PatientsService.findOne()` and
  propagate its `NotFoundException` for a caller with no legitimate
  access — confirms delegation happens, not a re-derived check.
- `create` stamps the caller's own org via `orgIdForWrite`.
- `remove` soft-deletes, never hard-deletes, and rejects an
  already-deleted/nonexistent document.

## Frontend (`patients/detail.test.jsx`)

- All 24 pre-existing tests in this file still pass unmodified (aside
  from the new global `useAuth` mock every test now needs).
- Documents render from real data; a real empty state renders when none
  exist.
- A real upload round-trips through the REST call + `createPatientDocument`
  mutation and appears in the list after a refetch.
- The preview dialog renders an `<iframe>` for a PDF result and an
  `<img>` for an image result.
- The Upload control is absent for a role outside `admin`/`manager`/
  `clinician`.
- Delete calls the real `deletePatientDocument` mutation and the row
  disappears after a refetch.

## Live verification

- Introspect the running container's live schema for `Query
  .patientDocuments`, `Mutation.{createPatientDocument,
  deletePatientDocument}`, and `PatientDocument`'s own fields.
- Full backend unit + integration suites (`matrix-coverage.int-spec.ts`
  confirming the new `EXEMPT` entry is accepted); `tsc --noEmit`,
  `eslint` (backend and frontend), `npm run build`.
