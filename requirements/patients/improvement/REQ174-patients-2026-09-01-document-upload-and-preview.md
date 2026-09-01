---
id: REQ174
type: improvement
feature: patients
created: 2026-09-01
updated: 2026-09-01
status: done
parent: —
related: [PLAN243, TP263, TR263]
---

# REQ174 — Patient Documents: real upload + inline preview of manual test reports (PDF/image)

## Why this slice

The user asked for admin/manager/clinician roles to upload manual/
scanned lab reports (PDF, image) against a patient's profile, previewable
inline from that profile — not just downloadable.

Research before any code was written found something more important
than a missing feature: `patients/detail.jsx` **already has a
"Documents" tab** (index 4) with a folder picker whose options already
include `'Lab Reports'` alongside `'General'`, `'Prescriptions'`,
`'Imaging'`, `'Consent Forms'` — but it was **entirely fake**.
`handleFileSelected` pushed to local React state only and showed
`"${file.name}" uploaded to ${uploadFolder} (demo mode)"`. Nothing was
ever sent to the backend; a page reload lost everything. This is the
exact `DATA-13` fabricated-page bug class this codebase has repeatedly
found and fixed elsewhere (`BUG009`, `BUG021`, `BUG023`) — this slice
makes the existing tab real rather than building a competing one.

## Competitor analysis

Same class of Indian clinic EMR referenced in this session's earlier
prescription-letterhead work (HealthPlix, Practo Ray, DocEngage): a
categorized patient-document repository (lab reports / prescriptions /
imaging / consent forms / general) with inline preview and a download
fallback, uploadable by front-desk/clinical staff. This codebase's own
pre-existing `DOCUMENT_FOLDERS` taxonomy already encoded exactly this
shape — closed the gap, not invented a new one.

## Options resolved via `AskUserQuestion`, both to the recommended choice

1. **Scope** — make the existing Documents tab real (general repository,
   Lab Reports one category among several) — chosen over narrowly
   attaching a file only to a structured `TestResults` row.
2. **PDF preview** — native browser `<iframe>` rendering — chosen over
   adding a new `react-pdf`/pdf.js dependency. No PDF/image viewer
   existed anywhere in this codebase before this slice; every prior
   attachment (encounter, message) was a plain download link. This
   admin/manager/clinician surface is desktop-tier
   (`FRONTEND_RULES.md` §5), where native in-browser PDF rendering is
   reliable and costs zero bundle weight.

## Scope shipped

- New `PatientDocuments` model + a third instance of this codebase's
  established two-step upload pattern (REST controller writes the file
  and self-verifies the JWT since `GqlAuthGuard` doesn't cover REST;
  a separate GraphQL mutation persists metadata and does the real
  patient/org access check) — the same shape already used twice
  (`REQ020`'s encounter attachments, `REQ058`'s message attachments).
- `createPatientDocument` gated to `admin`/`manager`/`clinician`
  (the user's own explicit list — deliberately excludes `staff` for the
  write path, though `staff` can still view the tab).
- `deletePatientDocument` gated narrower still (`admin`/`manager` only)
  — a small, natural inclusion since a wrongly-uploaded medical document
  needs *some* removal path.
- `patients/detail.jsx`'s Documents tab rewired off local state onto
  real GraphQL, plus a new `DocumentPreviewDialog.jsx` component
  (iframe for PDF, `<img>` for image, a Download link alongside).
- Fixed a hardcoded `#E2E8F0` hex border on the document list to the
  `divider` theme token while rewriting the section (`UI-2`).

## Real pre-existing bugs found (flagged, not fixed in this slice — out of scope)

`test/integration/setup/fixture.ts`'s appointment fixtures are hardcoded
to `2026-09-01T10:00:00.000Z` — now in the past relative to real time,
breaking `dashboard.upcoming_appointments`'s own tenancy-matrix
expectations (3 test failures in `tenancy.int-spec.ts`, unrelated to
this slice's own `patient-documents` domain, which passes cleanly).
Confirmed via direct inspection, not fixed here — a different domain's
fixture, the exact "anchor 'today' to `Date.now()`, never a fixed clock
hour" class this codebase has hit before.

## Deliberately deferred

- Patient self-service upload/viewing of their own documents via the
  patient portal — not asked for.
- Durable cloud storage (S3) — matches this codebase's own already-
  accepted local-disk precedent for every prior upload feature.
- A dedicated JS PDF viewer with zoom/page navigation — the user's own
  explicit choice this pass.

## Acceptance criteria

- Given an admin/manager/clinician uploads a PDF or image against a
  patient, when the page is reloaded, then the document is still there
  (the exact defect being closed — previously gone on reload).
- Given a document is uploaded, when "Preview" is clicked, then a PDF
  renders inline via the browser's own viewer and an image renders
  inline via `<img>` — neither merely downloads.
- Given a `'staff'`-role caller views the tab, then the Upload control is
  absent (not just disabled) and `createPatientDocument` itself rejects
  a direct attempt.
- Given a caller has no access to the target patient (cross-org, or a
  clinician who never treated them), then upload/list/delete are all
  rejected — reusing `PatientsService.findOne()`'s own existing access
  check, not a new one.
