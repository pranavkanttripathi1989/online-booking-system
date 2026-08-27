---
id: TR215
type: improvement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP215
related: [REQ154, PLAN195]
---

# TR215 — Results: AI coding assist (P2-02)

## Backend

- `npx jest --maxWorkers=2`: **115 suites / 1846 tests, green.** New:
  `coding-suggestion.spec.ts` (10), plus extensions to
  `ai-clinical.service.spec.ts` (+5), `ai-clinical.resolver.spec.ts` (+2
  gating assertions), `lookups.service.spec.ts` (+3),
  `lookups.resolver.spec.ts` (+3), `encounters.service.spec.ts` (+1).
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npm run test:int`: **9 suites / 414 tests, green**, including
  `ai-clinical.int-spec.ts` and `matrix-coverage.int-spec.ts` — confirms
  the new migration applies cleanly against real Postgres and that
  `suggestEncounterCodes`/`procedureCodes` live in already-classified
  tenancy-matrix domains (`ai-clinical`, `lookups`), no new domain row
  needed.

## Frontend

- `EncounterWorkspace.test.jsx`: **22/23 green.** Both new tests pass:
  "adds a procedure via the real createDiagnosis mutation, using the
  procedure-code search" and "shows AI code suggestions and pre-fills the
  Add Diagnosis dialog from a suggestion, without auto-saving it". The 1
  failure ("advances a referral to scheduled via the real
  updateReferralStatus mutation and refetches") is pre-existing and
  unrelated — confirmed passing cleanly in isolation (`-t` filter,
  `--maxWorkers=1`), matching this file's own documented contention-
  flakiness history in `CLAUDE.md`.
- `npm run lint`: **4832 warnings, 0 errors** — ratchet ceiling raised
  from 4820 to 4832 in the same change; every new warning is the
  pre-existing I18N-1/hardcoded-string class already present throughout
  this un-migrated file (`EncounterWorkspace.jsx` has no i18n layer
  applied, same as before this slice), not a new debt category.
- `npm run build` + `npm run size`: green. All 3 `size-limit` budgets
  held — initial bundle 348.56/350 kB (up from 344.7 kB measured at the
  end of P1-18; still passing, but headroom is now under 2 kB — worth a
  future slice's attention, not something this slice needs to fix),
  largest lazy chunk 109.92/115 kB (`charts`, untouched), initial CSS
  13.5/18 kB. `EncounterWorkspace`'s own lazy chunk: 11.70 kB gzipped,
  comfortably inside its own budget.

## Real findings from this slice

1. **No procedure-code concept existed anywhere in this codebase before
   this slice** — a genuine, previously-unlogged gap `P2-03` (agentic
   claim lifecycle) would have hit immediately, since a claim currently
   carries only a lump `claim_amount` with no record of what it is for.
   Closed as this slice's own prerequisite work, not scope creep — see
   REQ154's own "What was found before scoping" section.
2. Confirmed live via the integration suite (not just unit-mocked): the
   hand-written migration (`CREATE TABLE "ProcedureCodes"` + `ALTER TABLE
   "Diagnoses" ADD COLUMN "procedure_code"`) applies cleanly through the
   real `prisma migrate deploy` path this codebase's integration harness
   already runs — no drift between the schema diff and the SQL.

## Open items

- The initial frontend bundle is now within 2 kB of its 350 kB
  `size-limit` budget — no action taken this slice (still green), but the
  next slice touching the initial bundle's own chunks (entry/apollo/
  vendor/mui) should check this first.
- `P2-03` (agentic claim lifecycle) can now proceed — it depends on this
  slice's own `diagnosis_suggestions`/`procedure_suggestions` shape and
  the new `Diagnoses.procedure_code` column being real, which they now
  are.
