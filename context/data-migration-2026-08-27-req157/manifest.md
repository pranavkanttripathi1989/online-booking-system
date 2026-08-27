---
id: CTX-data-migration-2026-08-27-req157
type: requirement
feature: data-migration
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ157
related: [PLAN198, TP218, TR218]
---

# data-migration — AI-assisted patient CSV importer (2026-08-27)

Phase 2 slice **P2-05** (`project-plans/phase-plans/02-phase2-win-the-midmarket.md`)
— a brand-new feature slug, the #1 switching-blocker slice per the PRD's
own framing. Depends on `P1-11` (the ambient scribe's transcript
classifier, reused here).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ157 | [AI-assisted patient CSV importer](../../requirements/data-migration/requirement/REQ157-data-migration-2026-08-27-ai-assisted-patient-csv-importer.md) |
| implementation-plans | PLAN198 | [implementation plan](../../implementation-plans/data-migration/requirement/PLAN198-data-migration-2026-08-27-ai-assisted-patient-csv-importer.md) |
| test-plans | TP218 | [test plan](../../test-plans/data-migration/requirement/TP218-data-migration-2026-08-27-ai-assisted-patient-csv-importer.md) |
| test-results | TR218 | [results](../../test-results/data-migration/requirement/TR218-data-migration-2026-08-27-ai-assisted-patient-csv-importer.md) |

## What shipped

- A hand-rolled, dependency-free CSV parser, a deterministic column-
  mapping suggester, and row validation matching `PatientInput`'s own
  real contract verbatim — three fully unit-tested pure modules.
- The AI wedge: a mapped notes/history column is structured via P1-11's
  own `structureTranscript()` classifier (reused, not reimplemented)
  into `Patients.medical_notes`.
- `parseImportPreview`/`dryRunImport`/`commitImport` — preview and
  dry-run never write anything; commit re-validates fresh (never trusts
  an earlier dry run) and creates only valid rows, scoped to the
  caller's org via the same `orgIdForWrite()` guard `tasks.service.ts`
  already established.
- `ImportJobs` — a real audit record per commit, a result-log only
  (never an input cache — the raw CSV/mapping are never persisted).
- `manager/imports/index.jsx` — a real 4-step wizard (Upload → Map →
  Dry run → Commit), matching the onboarding wizard's own `Stepper`
  pattern, with a new nav entry and route.

## The scope correction that shaped this slice

The phase doc named "per-vendor export mappers" for Practo/MocDoc/
HealthPlix specifically. This codebase has no verified knowledge of
those vendors' real export formats — building a "Practo mapper" would
have meant fabricating a capability with no evidence behind it, the
same dishonesty class `REQ154`'s own "not a licensed CPT set" precedent
already refuses. Corrected to a generic, real header-name matcher that
works against *any* export shaped like a common EMR's, genuinely usable
against a real competitor export the moment one exists to test with.
Also scoped down to patients only — appointment/encounter import needs
a real clinic/clinician/service reconciliation step, logged as a named
follow-on rather than half-built.

## Design decisions worth knowing before touching this again

1. `ImportJobs` is a result-log, not an input cache — commit takes the
   CSV content and mapping directly, never re-reading a stored earlier
   dry run.
2. Row numbers are 1-indexed plus the header row (`index + 2`) — the
   number a human would see editing the real file in a spreadsheet.
3. CSV parsing is hand-rolled, not a new dependency, matching this
   codebase's own established preference for a bounded, fully-testable
   pure module.
4. The `imports` domain is a legitimate tenancy-matrix `EXEMPT` case —
   no query/mutation on this resolver is keyed by any id, so there is
   no cross-org "read by id" shape to build a matrix case from.

## Verification

Backend: 122/122 unit suites, 1961/1961 tests (65 new); integration
9/9 suites, 414/414 tests (the matrix gate's own real failure on the
new domain closed via a proper `EXEMPT` entry, not silenced); `tsc`/
`eslint` clean. Frontend: 5/5 in the page's first-ever test file (a
real jsdom `File.text()` gap found and worked around, extending
`TR215`'s own `Blob.text()` finding); lint ratchet raised 4851→4879;
build + `size-limit` green (initial bundle headroom now under 1.2 kB —
flagged for the next slice touching `App.jsx`). See TR218 for the full
account.

## What this closes

The fifth of six named Phase 2 tracker slices to ship this session
(`P2-02`, `P2-03`, `P2-04`, `P2-05`, alongside the earlier Phase 1
batch). `P2-01` remains blocked on ABDM `P1-10`; `P2-06` (doctor
revenue-share & payouts) is the last of the three "carries the phase"
slices still open.
