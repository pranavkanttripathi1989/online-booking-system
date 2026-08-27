---
id: PLAN198
type: requirement
feature: data-migration
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ157
related: [REQ157, TP218, TR218]
---

# PLAN198 — AI-assisted patient CSV importer (P2-05)

## Schema

- `backend/prisma/schema.prisma` — new `ImportJobs` model: a
  **result-log only**, never an input cache — `client_org_id`,
  `created_by_user_id`, `total_rows`/`imported_rows`/`error_rows`,
  `row_errors_json` (the full list, not the API's display cap),
  `created_at`. Back-relations added to `ClientOrganizations`
  (`importJobs`) and `UserProfiles` (`importJobsCreated`), both
  required by Prisma for a declared `@relation`.
- `backend/prisma/migrations/20260827180000_import_jobs/migration.sql`
  — hand-written: `CREATE TABLE "ImportJobs"` + its index + two FKs.
  Read end-to-end against the schema diff before applying.

## Backend — pure, dependency-free modules (all fully unit-tested standalone)

- `backend/src/imports/csv-parser.ts` — a hand-rolled RFC-4180-shaped
  parser (quoted fields, embedded commas/newlines, escaped `""`, CRLF/LF).
  No new dependency: this codebase's own established preference for a
  well-contained, fully-testable pure module over a package for
  something this bounded (`coding-suggestion.ts`/`denial-classification.ts`
  are the cited precedent).
- `backend/src/imports/column-mapping.ts` — deterministic header-name
  matching against a fixed keyword table (first_name/last_name checked
  before the broader full_name/bare-"name" rule, so "First Name" maps
  correctly rather than being swallowed by the looser pattern). An
  unrecognized header is left unmapped, never guessed.
- `backend/src/imports/row-validation.ts` — `mapRow()` reshapes one CSV
  row into a candidate record (splitting a mapped `full_name` into
  first/last, an explicit first_name/last_name mapping winning over the
  split); `validateCandidate()` checks it against `PatientInput`'s own
  real contract verbatim (Hard Rule 7) — first_name/last_name/email/
  phone/date_of_birth all required, matching that DTO exactly, not a
  relaxed import-specific rule.
- `backend/src/imports/structure-notes.ts` — the AI wedge: reuses P1-11's
  `structureTranscript()` (not reimplemented) to turn a real multi-
  sentence "notes"/"history" cell into labeled `[Section] ...` text. A
  short cell (under a length threshold) passes through unchanged rather
  than relabeling a fragment with no real sentence structure. A genuine
  simplification found while testing: the original "fall back to raw
  text when nothing classifies" branch was provably unreachable once the
  length gate exists (a non-empty trimmed string always yields at least
  one sentence for the classifier's own default bucket) — removed rather
  than left as untested defensive code.

## Backend — service/resolver

- `backend/src/imports/imports.service.ts`:
  - `parseImportPreview(csvContent)` — headers, a capped sample of rows,
    the suggested mapping, and the real total row count.
  - `dryRunImport(input)` / `commitImport(input, user)` share one
    private `mapAndValidateRows()` — **commit never trusts a client-
    supplied "already validated" claim**; both re-parse and re-validate
    the same submitted CSV content and mapping fresh, matching Hard
    Rule 7's "match the existing contract, don't invent a relaxed one."
  - `commitImport` guards the org-less-platform-operator case
    explicitly (`orgIdForWrite` returning `undefined`) with a clean
    `BadRequestException`, the exact bug class `tasks.service.ts`'s own
    `create()` already documents and guards against — mirrored here,
    not re-derived.
  - Row numbers reported to the caller are 1-indexed plus the header
    row (`index + 2`) — the number a human editing the real source file
    in a spreadsheet would see, computed once and threaded through
    consistently (an earlier draft computed it separately for dry-run
    display vs. the persisted job, and got it wrong for the display-
    only "sample valid rows" list — fixed by numbering once, up front).
  - Row-error lists are capped at 100 in every GraphQL response (a bad
    file could have thousands); `total_rows`/`error_rows` always reflect
    the real full count regardless, and the full list is persisted to
    `ImportJobs.row_errors_json` uncapped.
- `backend/src/imports/imports.resolver.ts` — `parseImportPreview`/
  `dryRunImport` as `@Query`s (no side effects), `commitImport` as a
  `@Mutation`; all three gated `manager, admin, super_admin` — bulk
  patient creation is an administrative action, never `staff`/
  `clinician`/`patient`.
- `backend/src/imports/dto/imports.input.ts` /
  `backend/src/imports/entities/imports.entity.ts` — `ImportColumnMappingInput`
  (nested-array `@ValidateNested`/`@Type()`, mirroring
  `UpdateAiProviderConfigInput.credentials`'s own established pattern);
  a dedicated `ImportSampleRowType` wrapper for a row's cell values,
  since a raw nested GraphQL list (`[[String]]`) is not as clean a
  field type as a wrapped row object.
- `backend/src/app.module.ts` — `ImportsModule` registered.
- `backend/test/integration/matrix-coverage.int-spec.ts` — a new
  `EXEMPT` entry for `imports`: no query or mutation on this resolver
  is keyed by any id at all (nothing to read cross-tenant;
  `commitImport` is write-only, scoped via `orgIdForWrite()`), so there
  is no "org A reads org B's row by id" shape this matrix's generic
  same-org-sees-same-row case can express — same reasoning as the
  existing `ai-clinical`/`telemedicine` exemptions. Found live: the
  matrix's own gate correctly failed on the new unclassified domain
  before this entry was added, exactly as designed.

## Frontend

- `manager/imports/index.jsx` — a real 4-step `Stepper` wizard (Upload
  → Map columns → Dry run → Commit), matching the `onboarding/index.jsx`
  wizard's own established `activeStep` pattern. Desktop-dense tier.
  - Upload: a real file input reading via `file.text()`; on success,
    fetches the real preview and pre-fills the mapping table from the
    real suggested mapping.
  - Mapping: one row per real source header, a sample value for
    context, and an editable target-field `Select` — a human can accept,
    change, or clear any suggestion before running the dry run.
  - Dry run: real total/valid/error counts, a capped per-row error
    table, and a sample-valid-rows preview.
  - Commit: disabled with zero valid rows (button stays visible with
    its own count in the label, per UI-11 — never hidden without
    explanation); on success shows the real imported/error counts.
- `App.jsx` — new lazy route `/manager/imports`, inside the existing
  `admin, super_admin, manager` `RoleGuard` block `manager/reports`
  already sits in (matching the backend gate exactly, per SEC-18).
- `layouts/AppShell.jsx` — new "Patient Import" nav entry.

## Design decisions worth recording

1. **No fabricated per-vendor mappers.** See REQ157's own "scope
   correction" section — a generic, real header-matcher is honest;
   claiming Practo/MocDoc/HealthPlix fidelity without ever having seen
   a real export from any of them would not have been.
2. **Patients only this slice**, not appointments/encounters — the
   latter needs a real clinic/clinician/service reconciliation UI of
   its own, logged as a named follow-on rather than half-built.
3. **`ImportJobs` is a result-log, not an input cache.** The raw CSV
   content and chosen mapping are never persisted anywhere — `commitImport`
   takes both as direct arguments (the same content already in the
   browser) and re-validates fresh, never trusting a prior dry run.
4. **CSV parsing is hand-rolled, not a new dependency** — a bounded,
   well-understood problem, matching this codebase's own established
   preference (pure, fully unit-testable modules) for exactly this
   class of problem.

## Verification

Backend: 122/122 unit suites, 1961/1961 tests (65 new across
`csv-parser.spec.ts`, `column-mapping.spec.ts`, `row-validation.spec.ts`,
`structure-notes.spec.ts`, `imports.service.spec.ts`); `tsc --noEmit`/
`eslint` clean; integration 9/9 suites, 414/414 tests — the matrix
gate's own real failure (an unclassified `imports` domain) closed by
the new `EXEMPT` entry, then reconfirmed green. Frontend: 5/5 new tests
in `manager/imports/index.test.jsx`, including a real jsdom `File.text()`
gap (already found and documented this session, TR215) worked around
via a scoped `FileReader`-backed polyfill; lint ratchet raised
4851→4879; build + `size-limit` green (initial bundle 348.82/350 kB,
tightening — flagged again, not yet a regression).
