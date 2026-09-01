---
id: CTX-prescriptions-2026-09-01-req173
type: improvement
feature: prescriptions
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ173
related: [PLAN242, TP262, TR262]
---

# prescriptions — clinician drug self-add + personal favourites (2026-09-01)

Follow-on user request from the same Rx builder surface as
`REQ170`–`REQ172`: "clinicians can prescribe other pharmacy drugs also"
and "clinicians can save the drugs for his reference purpose... so he
don't need to remember everytime." Entered plan mode, researched the
existing `Drugs`/`PrescriptionItems`/`PrescriptionSets` architecture,
resolved two genuine ambiguities via `AskUserQuestion` (drug-sourcing
approach; favourites scope — both resolved to the recommended option),
got the plan approved, then implemented across backend and frontend in
one pass.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ173 | [doc](../../requirements/prescriptions/improvement/REQ173-prescriptions-2026-09-01-clinician-drug-self-add-and-favourites.md) |
| implementation-plans | PLAN242 | [doc](../../implementation-plans/prescriptions/improvement/PLAN242-prescriptions-2026-09-01-clinician-drug-self-add-and-favourites.md) |
| test-plans | TP262 | [doc](../../test-plans/prescriptions/improvement/TP262-prescriptions-2026-09-01-clinician-drug-self-add-and-favourites.md) |
| test-results | TR262 | [doc](../../test-results/prescriptions/improvement/TR262-prescriptions-2026-09-01-clinician-drug-self-add-and-favourites.md) |

## What shipped

- **Schema** (`20260901010000_clinician_favourite_drugs`, additive):
  new `ClinicianFavouriteDrugs` model, unique on `[clinician_id,
  drug_id]`.
- **Drug self-add**: `createDrug`'s `@Auth()` widened to include
  `'clinician'` — zero service-layer change, since `orgIdForWrite()`
  already derived org from any caller role. `updateDrug`/`deleteDrug`
  deliberately stay manager/admin/super_admin-only.
- **Personal favourites**: `myFavouriteDrugs`/`addFavouriteDrug`/
  `removeFavouriteDrug` on the existing `DrugsResolver`/`DrugsService`,
  self-scoped via the JWT `clinician_id` sentinel pattern, idempotent,
  re-validates drug visibility before favouriting (Hard Rule 6).
- **Frontend** (`PrescriptionBuilder.jsx`): a quick-add dialog, a star
  toggle on every drug-search result, and an empty search now surfaces
  the clinician's own favourites first instead of nothing.

## Genuine ambiguity resolved via `AskUserQuestion`, not guessed at

1. Drug sourcing — clinician self-add (chosen) vs. licensing a real
   external Indian drug database vs. a free-text-only fallback.
2. Favourites scope — a new single-drug personal list (chosen),
   distinct from the existing multi-drug `PrescriptionSets`.

## A real documentation gap closed, not just a code gap

`REQ016`/`REQ044` (2026-08-23/24) both said the drug-database
build-vs-license tradeoff would be logged in
`context/open-questions.md` and never was — confirmed by grep, zero
prior "drug" mentions. This slice adds entry #20 there, framing it as a
real, larger, separately-scoped future decision rather than reopening it
here.

## Test-authoring findings worth keeping

- `PrescriptionBuilder.test.jsx`'s `renderAt()` helper prepended its own
  default mocks ahead of caller-supplied ones — Apollo's `MockedProvider`
  silently consumed the wrong (default, empty) mock for a query a test
  explicitly overrode. Fixed by reordering so caller mocks take
  priority. A real, generalizable lesson for any shared test-render
  helper in this codebase that injects default mocks.
- Opening a MUI `Autocomplete` with no typed value in this jsdom test
  environment doesn't respond reliably to click/mousedown/keydown on the
  input — the reliable method is clicking the Autocomplete's own
  `.MuiAutocomplete-popupIndicator` button directly.

## Verification

Backend unit **135/135 suites, 2154/2154 tests**; integration **9/9
suites, 441/441 tests** (including `matrix-coverage.int-spec.ts`
confirming the existing `drugs` domain classification still holds);
`tsc --noEmit`/`eslint`/`prisma validate` all clean. Frontend:
`PrescriptionBuilder.test.jsx` **12/12** (4 new); `eslint` 0 errors;
`npm run build` succeeds. Live-verified against the real running
`medibook_backend` container via direct GraphQL introspection —
`myFavouriteDrugs`, `addFavouriteDrug`, `removeFavouriteDrug`, and the
widened `createDrug` all confirmed genuinely served by the live schema.

## Deliberately deferred

- Licensing a real external Indian drug database — the user's own
  explicit choice this pass, now properly logged as open question #20.
- A drug-catalog "merge duplicates" admin tool for near-duplicate
  clinician-added entries — natural future follow-on if this becomes a
  real problem at scale.
- Drug-drug interaction checking / dosage-limit warnings — not asked
  for.
