---
id: TP262
type: improvement
feature: prescriptions
created: 2026-09-01
updated: 2026-09-01
status: done
parent: PLAN242
related: [REQ173, TR262]
---

# TP262 — Test plan: clinician drug self-add + personal favourites

Well-scoped slice against already-proven patterns (self-scope sentinel
idiom, hybrid-scoped Drugs visibility check) — suggestion stage skipped
per `CLAUDE.md`'s conditional rule, drafted directly.

## Backend unit (`drugs.service.spec.ts`)

- A `'clinician'`-role caller's `create()` scopes the new drug to their
  own org, exactly like a manager's.
- `findFavourites` self-scopes to the caller's own `clinician_id`.
- `findFavourites` returns empty for an unlinked clinician account,
  never every clinician's favourites.
- `addFavourite` re-validates the target drug's visibility (Hard Rule 6)
  before creating the join row — rejects another org's private drug.
- `addFavourite` is idempotent — a repeat call upserts, does not error
  or duplicate.
- `removeFavourite` is idempotent when nothing exists.

## Frontend (`PrescriptionBuilder.test.jsx`)

- The clinician's own favourite drugs render, unfiltered, before any
  search is typed.
- Starring a drug calls the real `addFavouriteDrug` mutation without
  also selecting it into the current line.
- Unstarring an already-favourited drug calls the real
  `removeFavouriteDrug` mutation.
- The quick-add dialog pre-fills from the typed search text, creates a
  real drug via the real `createDrug` mutation, and selects it directly
  into the line that triggered it.
- Existing Voice-to-Rx/allergy-hard-stop/print-language tests in this
  file continue to pass unmodified (regression — the new unconditional
  `MY_FAVOURITE_DRUGS_QUERY` fetch must not break any pre-existing
  scenario).

## Live verification

- Introspect the running container's live schema for `Query
  .myFavouriteDrugs`, `Mutation.{addFavouriteDrug,removeFavouriteDrug,
  createDrug}` — confirms the schema is genuinely served, not just
  compiled.
- Backend full unit suite + integration suite (including
  `matrix-coverage.int-spec.ts`, confirming the existing `drugs` domain
  classification still holds with the new resolver methods added to it).
- `tsc --noEmit`, `eslint` (backend and frontend), `npm run build`.
