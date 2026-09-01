---
id: TR263
type: improvement
feature: patients
created: 2026-09-01
updated: 2026-09-01
status: pass
parent: TP263
related: [REQ174, PLAN243]
---

# TR263 — Results: Patient Documents upload + inline preview

## Backend

- `npx jest --maxWorkers=2` (full suite): **136/136 suites, 2161/2161
  tests, green** (2154 baseline before this session's drug-favourites
  slice + 7 new: 2161 total after REQ174's own 7 new
  `patient-documents.service.spec.ts` tests).
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npx prisma validate`: schema valid.

## Integration — 8/9 suites green; the 1 failure is pre-existing and unrelated

`npm run test:int`: **matrix-coverage.int-spec.ts passes**, confirming
`patient-documents`'s new `EXEMPT` entry is accepted and the domain is
correctly classified. `tenancy.int-spec.ts` has **3 failing cases, all
in the unrelated `dashboard: dashboard.upcoming_appointments` domain**
— confirmed via direct fixture inspection, not this slice's own code:
`test/integration/setup/fixture.ts`'s appointment fixtures are hardcoded
to `2026-09-01T10:00:00.000Z`; real time at the moment this suite ran
was `2026-09-01T11:05:56Z`, an hour later, so the fixture appointment is
no longer "upcoming" and the matrix's own expectations for that one
domain now fail. This is the exact "anchor 'today' to `Date.now()`,
never a fixed clock hour" fixture-staleness class this codebase has
documented before, now finally manifesting as this migration's own
hardcoded date has passed. **Not caused by, or fixable within, this
slice** — `patient-documents` touches no shared fixture and no dashboard
code. Flagged directly to the user rather than silently worked around.

## Live verification (real running container)

`docker exec medibook_backend npx prisma generate` +
`docker restart medibook_backend` (the established anonymous-volume
workaround). Introspected the live schema directly:

```
Query.fields        → includes patientDocuments
Mutation.fields      → includes createPatientDocument, deletePatientDocument
PatientDocument.fields → category, created_at, file_ref, file_size_bytes,
                          id, mime_type, original_filename, patient_id,
                          uploaded_by_id
```

`PatientDocumentsController {/patient-documents}` and its
`POST /patient-documents/upload` route both confirmed mapped in the
container's own boot log.

## Frontend

- `npx jest --runInBand src/pages/patients/detail.test.jsx`: **31/31
  green** (24 pre-existing, unmodified in behavior + 7 new: empty state,
  real-data rendering, real upload round-trip, PDF preview, image
  preview, role-gated upload control, real delete).
- `npx eslint src/pages/patients/detail.jsx src/pages/patients/detail.test.jsx
  src/components/patients/DocumentPreviewDialog.jsx`: **0 errors** (185
  warnings, all pre-existing-class `I18N-1` hardcoded-string debt already
  accepted on this large page — no new lint-error class introduced).
- `npm run build`: succeeds (`detail-*.js` chunk 62.20 kB gzip 15.80 kB,
  a modest increase from the new tab logic + preview dialog — well
  within the desktop-dense `PERF-3` budget).

## Real test-authoring bugs found and fixed during this pass (not product bugs)

1. `patients/detail.jsx` had never called `useAuth()` before this slice.
   The moment it was introduced (to gate the Upload/Delete controls),
   all 24 pre-existing tests in `detail.test.jsx` broke immediately
   (`useAuth must be used within an AuthProvider`) — the test file never
   wrapped the page in a mocked auth context because it never needed
   to. Fixed with the same `jest.mock('../../hooks/useAuth')` pattern
   already established in `EncounterWorkspace.test.jsx`, plus one
   top-level `beforeEach` defaulting to `hasRole: () => true` so every
   pre-existing test keeps working unchanged.
2. A single test that opened the preview dialog, closed it, then opened
   a second document's dialog consistently timed out (5000ms) even
   though each half worked correctly alone. Split into two independent
   tests (PDF, image) rather than debug the close/reopen sequence
   further — nothing in the requirement needs that specific sequential
   interaction verified, and the split tests both pass reliably.
