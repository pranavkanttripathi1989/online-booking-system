---
id: PLAN242
type: improvement
feature: prescriptions
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ173
related: [TP262, TR262]
---

# PLAN242 — Implementation plan: clinician drug self-add + personal favourites

## Schema (`20260901010000_clinician_favourite_drugs`)

New model only, additive:

```prisma
model ClinicianFavouriteDrugs {
  id           String   @id @default(uuid())
  clinician_id String
  drug_id      String
  created_at   DateTime @default(now())

  clinician Clinicians @relation(fields: [clinician_id], references: [id])
  drug      Drugs      @relation(fields: [drug_id], references: [id])

  @@unique([clinician_id, drug_id])
  @@index([clinician_id])
}
```

Back-relations added to `Clinicians.favouriteDrugs` and `Drugs.favouritedBy`.

## Backend

1. `drugs.resolver.ts#createDrug`: `@Auth('manager','admin','super_admin')`
   widened to also include `'clinician'`. No service-layer change needed
   — `drugs.service.ts#create()` already derives `client_org_id` via
   `orgIdForWrite(user, 'drug')` regardless of caller role.
   `updateDrug`/`deleteDrug` unchanged.
2. `drugs.service.ts` gained three methods:
   - `findFavourites(user)` — self-scoped via `user.clinician_id ??
     '__no_clinician_link__'`, joins `drug: true`, filters
     `is_deleted: false`, ordered newest-first.
   - `addFavourite(drugId, user)` — calls `findOne(drugId, user)` first
     (Hard Rule 6, reuses the existing own-org-or-platform-seeded
     visibility check) then `upsert`s on the `[clinician_id, drug_id]`
     unique key.
   - `removeFavourite(drugId, user)` — `deleteMany` on the same key,
     idempotent when nothing exists.
3. `drugs.resolver.ts` gained `myFavouriteDrugs`/`addFavouriteDrug`/
   `removeFavouriteDrug`, all `@Auth('clinician')`.

No new `@InputType` DTOs — both mutations take a plain `ID!` arg.

## Frontend (`PrescriptionBuilder.jsx`)

1. `DRUGS_QUERY` exported (previously private) so the test file can
   import rather than hand-copy it (this file's own prior BUG062-class
   risk).
2. New `MY_FAVOURITE_DRUGS_QUERY`/`ADD_FAVOURITE_DRUG`/
   `REMOVE_FAVOURITE_DRUG`/`CREATE_DRUG` GraphQL documents, all exported.
3. `searchedDrugOptions = drugSearch.length >= 2 ? drugOptions :
   favouriteDrugs` drives the Autocomplete's `options` — an empty/short
   search shows favourites, 2+ characters searches the catalog as
   before.
4. `renderOption` adds a star `IconButton` (`aria-label` per A11Y-5, not
   just a `Tooltip`) per row, `stopPropagation`'d so it never also
   selects the drug into the line. Both favourite mutations
   `refetchQueries: [MY_FAVOURITE_DRUGS_QUERY]`.
5. `noOptionsText` + a standalone "Can't find it? Add new drug" button
   open a quick-add `Dialog` (name/composition/strength/form/
   schedule_class — FORM-1's "ask for the minimum"), calling the
   existing `createDrug` mutation (now clinician-authorized) and
   selecting the result straight into the line that triggered it.

## Test-authoring findings

- `PrescriptionBuilder.test.jsx`'s `renderAt()` helper injects a set of
  default mocks (previously just `PRESCRIPTION_SETS_QUERY`) ahead of
  caller-supplied ones. Adding a default `MY_FAVOURITE_DRUGS_QUERY` mock
  (needed since the query is now unconditional, no search-string gating)
  in front of the caller's own array meant Apollo's `MockedProvider`
  consumed the default (empty-list) mock before a test's own custom one
  for the identical query — a real, silent test-authoring bug, not a
  component bug. Fixed by putting caller-supplied `...mocks` FIRST in
  the array, so a test's own explicit mock for a query takes priority
  over the helper's generic default.
- Opening a MUI `Autocomplete` with **no typed value** (to see the
  empty-search favourites state) does not respond reliably to
  `userEvent.click`/`fireEvent.mouseDown`/`fireEvent.keyDown` on the
  input alone in this test environment — the reliable method is
  clicking the Autocomplete's own `.MuiAutocomplete-popupIndicator`
  button directly, which unconditionally forces `open`. Once a value
  *is* typed, this codebase's already-established `fireEvent.change`
  pattern (`EncounterWorkspace.test.jsx`'s ICD-10 Autocomplete tests)
  works as documented.
- A `required` MUI `TextField`'s accessible label includes the literal
  asterisk (`"Drug name *"`, not `"Drug name"`) — matches this
  codebase's own already-established convention elsewhere
  (`"Last Name *"` in `EditClinicianPage.test.jsx`), re-confirmed here.
