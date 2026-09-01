---
id: TR262
type: improvement
feature: prescriptions
created: 2026-09-01
updated: 2026-09-01
status: pass
parent: TP262
related: [REQ173, PLAN242]
---

# TR262 — Results: clinician drug self-add + personal favourites

## Backend

- `npx jest --maxWorkers=2` (full suite): **135/135 suites, 2154/2154
  tests, green** (2148 baseline + 6 new: 1 clinician-create-scoping test
  + 5 favourites tests, all in `drugs.service.spec.ts`, now 19/19 in
  that file).
- `npm run test:int`: **9/9 suites, 441/441 tests, green** — includes
  `matrix-coverage.int-spec.ts` passing, confirming the existing `drugs`
  domain classification still holds with the new resolver fields added
  to it (no new matrix row needed — domain-level, not field-level,
  classification). Unrelated pre-existing `WebhookDispatchService`
  decrypt-error log noise, same deliberately-invalid-fixture pattern
  documented in prior TRs.
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npx prisma validate`: schema valid.

## Live verification (real running container)

`docker exec medibook_backend npx prisma generate` (required — the
service's anonymous `/app/node_modules` volume means a host-side
generate never reaches the container, per the standing gotcha from the
prior session) then `docker restart medibook_backend`. Compile took
~3 minutes under host load (matched `CLAUDE.md`'s own documented
pattern), confirmed via `docker stats` showing sustained high CPU (not
0%) rather than a wedge before the endpoint came up. Introspected the
live schema directly:

```
Query.fields       → includes myFavouriteDrugs
Mutation.fields     → includes addFavouriteDrug, removeFavouriteDrug,
                       createDrug (now clinician-authorized)
Drug.fields          → unchanged (regression check — no accidental
                        schema drift on the existing type)
```

All fields genuinely served by the live server, not just present in the
compiled schema file on disk.

## Frontend

- `npx jest --runInBand src/pages/clinician/PrescriptionBuilder.test.jsx`:
  **12/12 green** (8 pre-existing + 4 new: favourites-shown-on-empty-
  search, star-to-favourite without selecting the line, unstar, quick-add
  dialog creates and selects a real drug).
- `npx eslint src/pages/clinician/PrescriptionBuilder.jsx
  src/pages/clinician/PrescriptionBuilder.test.jsx`: **0 errors** (50
  warnings, all pre-existing-class I18N-1 hardcoded-string debt already
  accepted on this page — no new lint-error class introduced).
- `npm run build`: succeeds.

## Real test-authoring bugs found and fixed during this pass (not product bugs)

1. `PrescriptionBuilder.test.jsx`'s `renderAt()` helper prepended its own
   default mocks (including a new default empty-list
   `MY_FAVOURITE_DRUGS_QUERY` mock) ahead of any caller-supplied mocks.
   Apollo's `MockedProvider` consumes matching mocks in array order, so
   the default empty-list mock silently won over a test's own explicit
   non-empty mock for the identical query — the "shows the clinician's
   own favourite drugs" test kept seeing an empty list no matter what it
   passed in. Fixed by reordering so caller-supplied mocks come first.
2. Opening a MUI `Autocomplete` with no typed value (needed to exercise
   the empty-search-shows-favourites behaviour) does not reliably
   respond to `userEvent.click`/`fireEvent.mouseDown`/
   `fireEvent.keyDown` on the input in this jsdom test environment —
   confirmed via direct DOM inspection that the popup genuinely opened
   each time but rendered `noOptionsText` (options were empty due to
   finding #1 above, not an interaction failure). The reliable, now-
   documented method is clicking the Autocomplete's own
   `.MuiAutocomplete-popupIndicator` button directly.

## Real pre-existing bugs found and fixed (not originally scoped)

None new beyond what `REQ170` already found and fixed in this same
`createDrug`/clinician-input path (`ClinicianInput` DTO gap,
`CLINICIAN_FIELDS` fragment gap) — this slice built on top of that
already-closed fix, no further pre-existing defects surfaced.
