---
id: PLAN148
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ108
related: [TP172, TR172]
---

# PLAN148 — Validated ICD-10 coding for diagnoses

Implementation plan for `REQ108`.

## Schema

New platform-global reference table (no `client_org_id` — matches
`Languages`/`Payers`' own "global like Languages" convention already
established in this codebase):

```prisma
model Icd10Codes {
  id          String  @id @default(uuid())
  code        String  @unique
  description String
  category    String  // e.g. "Respiratory", "Endocrine", "Cardiovascular"
  is_active   Boolean @default(true)

  @@index([category])
}
```

No change to `Diagnoses.icd10_code` itself — it stays `String?`,
storage-compatible with either a selected real code or free text, per
`REQ108`'s own deliberate soft-validation scope.

Hand-written migration
(`backend/prisma/migrations/<timestamp>_icd10_codes/migration.sql`):
`CREATE TABLE "Icd10Codes"` + unique index on `code` + index on
`category`, followed by ~100 `INSERT` statements seeding the starter
set. A representative sample (all real, WHO ICD-10 codes — the full
migration lists all ~100):

| Code | Description | Category |
|---|---|---|
| J06.9 | Acute upper respiratory infection, unspecified | Respiratory |
| J00 | Acute nasopharyngitis [common cold] | Respiratory |
| J20.9 | Acute bronchitis, unspecified | Respiratory |
| J45.909 | Unspecified asthma, uncomplicated | Respiratory |
| E11.9 | Type 2 diabetes mellitus without complications | Endocrine |
| E10.9 | Type 1 diabetes mellitus without complications | Endocrine |
| E03.9 | Hypothyroidism, unspecified | Endocrine |
| E78.5 | Hyperlipidaemia, unspecified | Endocrine |
| I10 | Essential (primary) hypertension | Cardiovascular |
| I25.10 | Atherosclerotic heart disease of native coronary artery without angina pectoris | Cardiovascular |
| K21.9 | Gastro-oesophageal reflux disease without oesophagitis | Gastrointestinal |
| K29.70 | Gastritis, unspecified, without bleeding | Gastrointestinal |
| K59.00 | Constipation, unspecified | Gastrointestinal |
| A09 | Infectious gastroenteritis and colitis, unspecified | Infectious |
| M54.5 | Low back pain | Musculoskeletal |
| M25.50 | Pain in unspecified joint | Musculoskeletal |
| L30.9 | Dermatitis, unspecified | Dermatological |
| L20.9 | Atopic dermatitis, unspecified | Dermatological |
| H66.90 | Otitis media, unspecified, unspecified ear | ENT |
| H10.9 | Unspecified conjunctivitis | ENT |
| N39.0 | Urinary tract infection, site not specified | Genitourinary |
| F41.9 | Anxiety disorder, unspecified | Mental health |
| F32.9 | Major depressive disorder, single episode, unspecified | Mental health |
| R50.9 | Fever, unspecified | General/symptoms |
| R51 | Headache | General/symptoms |
| R05 | Cough | General/symptoms |
| R10.9 | Unspecified abdominal pain | General/symptoms |
| Z34.90 | Encounter for supervision of normal pregnancy, unspecified trimester | Obstetric |
| N76.0 | Acute vaginitis | Obstetric/Gynaecological |
| P59.9 | Neonatal jaundice, unspecified | Paediatric |
| D50.9 | Iron deficiency anaemia, unspecified | Nutritional/blood |
| E56.9 | Vitamin deficiency, unspecified | Nutritional |
| T78.40 | Allergy, unspecified | Allergy |

(...remaining ~70 rows spanning the same categories with the same
depth — written into the actual migration file at implementation time,
not abbreviated there.)

## Backend

**Extend the existing `lookups` module** (matches
`05-cross-cutting-conventions.md`'s own guidance to avoid a new module
for a single small reference table — `RoomTypes`/`ClinicianTypes` already
live here) rather than creating a new `icd10` module:

- `backend/src/lookups/entities/icd10-code.entity.ts` — new
  `@ObjectType()` `Icd10CodeType` (`id`, `code`, `description`,
  `category`).
- `backend/src/lookups/lookups.service.ts` — new
  `icd10Codes(search?: string)`: `prisma.icd10Codes.findMany({where:
  {is_active: true, ...(search ? {OR: [{code: {startsWith: search,
  mode: 'insensitive'}}, {description: {contains: search, mode:
  'insensitive'}}]} : {})}, orderBy: {code: 'asc'}, take: 20})` — capped
  result set, matching this codebase's global `clampTakeMiddleware`
  convention for unbounded lists (F-14).
- `backend/src/lookups/lookups.resolver.ts` — new `@Query(() =>
  [Icd10CodeType]) icd10Codes(@Args('search', {nullable: true}) search?:
  string)`. No `@Auth()` override needed — platform reference data,
  same as `clinicianTypes`/`roomTypes` (both currently ungated per the
  existing resolver — confirm and match, don't introduce a stricter gate
  than the sibling queries already have).

No change needed to `encounters.service.ts#createDiagnosis` or
`CreateDiagnosisInput` — the storage/write path already accepts any
string in `icd10_code`, which is exactly what this slice's soft-validation
design wants.

## Frontend

**`frontend/src/pages/clinician/EncounterWorkspace.jsx`**:

- New inline `ICD10_SEARCH_QUERY` (`icd10Codes(search: $search) { id
  code description category }`).
- Replace the plain `TextField` at the "ICD-10 code (optional)" field
  (around line 274-277) with an MUI `Autocomplete` (`freeSolo` — critical,
  so a clinician can still type free text or leave it blank, matching
  `REQ108`'s soft-validation requirement), `renderOption` showing `code —
  description`, options loaded from a debounced `client.query()` call on
  input change (same debounce pattern already used in
  `patients/index.jsx`/`admin/Organizations.jsx`'s own search fields,
  300ms).
- On selecting an option, store just the `code` string into
  `diagnosisForm.icd10_code` (unchanged downstream — `handleAddDiagnosis`
  already sends this field as-is).
- No change to the read side (`diagnoses { id type icd10_code text
  status created_at }`) — already selects `icd10_code`, already renders
  it as a caption under each diagnosis row.

## Testing

- `lookups.service.spec.ts`: `icd10Codes()` — no search term returns
  up to 20 active rows ordered by code; a search term filters by
  code-prefix OR description-substring (case-insensitive); an inactive
  row is excluded.
- `lookups.resolver.spec.ts`: `icd10Codes` delegates to the service with
  the given search term.
- `EncounterWorkspace.test.jsx`: the ICD-10 field renders as an
  `Autocomplete`; typing triggers the search query; selecting an option
  populates `diagnosisForm.icd10_code`; leaving it blank or typing free
  text (not selecting an option) still allows the dialog's Save action
  to submit (regression guard against accidentally making the field
  `freeSolo`-only-when-a-match-exists).
- Live verification: search `icd10Codes(search: "J0")` over real
  GraphQL post-seed — expect `J06.9`/`J00`/`J02.9`/`J20.9` (all seeded
  respiratory codes starting with J0) in the result; add a diagnosis
  with a selected code through the real UI against a real encounter,
  confirm it persists and renders on reload.

## Documentation

`REQ108` (this requirement), this document (`PLAN148`), plus `TP###`/
`TR###` and a context bundle — written during the implementation pass,
following this session's established per-slice convention.

## Outcome (2026-08-26)

Implemented largely as planned, with one real correction to how the
plan itself proposed seeding the ~100 codes, plus a real bug found and
fixed via the new frontend test.

1. **Seeded via `prisma/seed.ts`, not raw `INSERT` statements in the
   migration file.** This plan's own Schema section suggested "~100
   INSERT statements... written into the actual migration file" — but
   no other migration in this codebase seeds rows this way; every
   existing reference table (`Drugs`, `SubscriptionPlans`,
   `EmailTemplates`) is seeded idempotently in `seed.ts` via a
   find-then-create loop, run separately from `migrate deploy`. Matched
   that real, established convention instead — the migration itself
   creates only the empty table + indexes; `seed.ts` gained a new
   `ICD10_CODES` array (102 codes, ~100 as scoped) seeded the same way
   `DRUGS` already is.
2. **102 codes, not exactly 100** — the curated set spans the requirement's
   own listed categories (respiratory, endocrine, cardiovascular,
   gastrointestinal, musculoskeletal, infectious, dermatological, ENT,
   genitourinary, mental health, general symptoms, obstetric/pediatric,
   nutritional/blood, allergy) at a consistent depth; landed at 102
   rather than forcing an exact 100.
3. **A real bug found only by the new frontend test, not by
   inspection**: the ICD-10 `Autocomplete`'s `onInputChange` handler
   unconditionally wrote its `value` into `diagnosisForm.icd10_code`.
   MUI's `Autocomplete` also fires `onInputChange` (with
   `reason: 'reset'`) right after `onChange` selects an option, to sync
   the visible input text to the option's own rendered label — so
   selecting "J06.9 — Acute upper respiratory infection, unspecified"
   stored that entire label string as the diagnosis's `icd10_code`,
   not the code alone. Confirmed live via the test's own
   `CREATE_DIAGNOSIS` mock mismatch (`Expected variables` showed the
   full label; the mock's `matched` variables showed the bare code).
   Fixed by checking the `reason` argument and only writing free text
   into the form on `reason === 'input'` (real typing), never on
   `'reset'`/`'clear'` — `onChange`'s own code-only write is what
   persists after a real selection.
4. **No new e2e Playwright spec / no live GraphQL verification** — no
   browser-automation tool was available this session, the same
   honestly-logged gap as `REQ072`/`REQ106`/`REQ107`/`REQ110` earlier in
   this batch. Coverage comes from `lookups.service.spec.ts`/
   `lookups.resolver.spec.ts` (backend) and
   `EncounterWorkspace.test.jsx` (frontend, `MockedProvider`, real
   query/mutation shapes) instead. A real Postgres seed run did
   confirm all 102 rows insert cleanly and idempotently (a second
   `npx prisma db seed` run correctly reported 0 newly created).
