---
id: TR218
type: requirement
feature: data-migration
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP218
related: [REQ157, PLAN198]
---

# TR218 — Results: AI-assisted patient CSV importer (P2-05)

## Backend

- `npx jest --maxWorkers=2`: **122 suites / 1961 tests, green.** New: 65
  tests across `csv-parser.spec.ts` (10), `column-mapping.spec.ts` (22),
  `row-validation.spec.ts` (15), `structure-notes.spec.ts` (5),
  `imports.service.spec.ts` (13).
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npm run test:int`: **9 suites / 414 tests, green.** The tenancy
  matrix's own gate first correctly failed on the new, unclassified
  `imports` domain (exactly as designed — "FAILS if you add a resolver
  domain without classifying it"), closed by a new `EXEMPT` entry in
  `matrix-coverage.int-spec.ts`, then reconfirmed green.

## Frontend

- `manager/imports/index.test.jsx`: **5/5 green** — a new page's first
  test file. Confirmed jsdom's own `File`/`Blob.text()` gap (already
  found and documented this session, `TR215`) also applies to `File`
  (which extends `Blob`); worked around with a scoped `FileReader`-backed
  polyfill in this test file only, not a global stub.
- `npm run lint`: **4879 warnings, 0 errors** — ratchet ceiling raised
  from 4851 to 4879; every new warning is the pre-existing I18N-1 class
  already present throughout this codebase's un-migrated pages. The new
  test file itself added zero warnings.
- `npm run build` + `npm run size`: green. Initial bundle 348.82/350 kB
  (up slightly from 348.57 — the new lazy route registration + nav icon
  import in the always-loaded entry chunk; the wizard page itself is its
  own separate lazy chunk, not part of this number). Largest lazy chunk
  109.92/115 kB (`charts`, untouched); initial CSS 13.5/18 kB.
  **Headroom on the initial bundle is now under 1.2 kB** — flagged again
  (first raised in `TR216`), not yet a regression, but the next slice
  touching `App.jsx`'s always-loaded imports should check this budget
  first.
- Full suite (`npx jest --maxWorkers=2`): 40/42 suites, 275/280 tests
  green. 3 unique failing suites across two full runs, none of them
  `manager/imports/index.test.jsx`: `clinician/EncounterWorkspace.test.jsx`
  (its own already-documented pre-existing flaky referral-status test),
  `manager/claims/index.test.jsx` (already bisected as pre-existing in
  the prior `P2-03` slice, confirmed by directly swapping in the exact
  HEAD-committed original file), and `booking/index.test.jsx` (untouched
  by any P2-02 through P2-05 work this session). This slice's own new
  test file passed cleanly in isolation twice and was not among the
  failures in either full-suite run.

## Real findings from this slice

1. **A genuine scope correction, made before any code was written**:
   the phase doc's own "per-vendor export mappers" language for Practo/
   MocDoc/HealthPlix would have meant fabricating vendor-specific column
   layouts this codebase has no evidence for. Corrected to a generic,
   real header-matcher — see `REQ157`'s own account.
2. `Patients.medical_notes` already existing closed what would otherwise
   have been a hard scope blocker for the AI-structuring wedge (no
   Encounter/Appointment chain needed to give competitor free-text
   history somewhere real to land).
3. A genuinely unreachable defensive branch was found and removed in
   `structure-notes.ts` (not shipped, caught at the test-writing stage):
   once the length gate exists, `structureTranscript()` can never
   return zero sections for the input this function ever calls it with,
   so the "fall back to raw text" path was dead code with a test that
   could never really exercise it. Simplified rather than left in with
   a misleading comment.
4. A pre-existing, previously-undocumented jsdom gap (`File.prototype.text`
   missing, an extension of the already-known `Blob.text()` gap from
   `TR215`) was hit and worked around the same way — a scoped
   `FileReader`-based polyfill, not a global stub.

## Open items

- Appointment/encounter import remains a real, named follow-on — needs
  its own clinic/clinician/service reconciliation UI, a separate,
  larger feature (see REQ157's own scope note).
- No job-history/list page exists yet to revisit a past `ImportJobs`
  row — the audit record is real and queryable directly against the
  database, but nothing in the product surfaces it yet.
- The initial bundle's shrinking headroom (see above) is worth a
  dedicated look before the next slice that touches `App.jsx`.
