---
id: TR172
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP172
related: [PLAN148]
---

# TR172 — Test results: validated ICD-10 coding for diagnoses

## TP172 case outcomes

All 11 cases pass.

```
PASS src/lookups/lookups.service.spec.ts
PASS src/lookups/lookups.resolver.spec.ts

Test Suites: 2 passed, 2 total
Tests:       28 passed, 28 total (5 new — cases 1-5)
```

Full backend suite:

```
Test Suites: 90 passed, 90 total
Tests:       1424 passed, 1424 total
```

`npx tsc --noEmit` — clean. `npx eslint "{src,apps,libs,test}/**/*.ts"` —
exits 0, 0 warnings.

Integration (case 11, real Postgres via `npm run test:int` from the
host):

```
Test Suites: 4 passed, 4 total
Tests:       387 passed, 387 total
```

387 — unchanged from `REQ107`'s own run. Confirms `lookups` (already
listed in `matrix-coverage.int-spec.ts`'s `EXEMPT` map: "Global
reference data (room types, clinician types)") needed no update —
`icd10Codes` is the same ungated-global-reference shape as its two
siblings there.

Seed (case 10):

```
Seeding ICD-10 codes (diagnosis coding reference data)...
  created 102 new ICD-10 code(s) (0 already existed)
```

Re-run immediately after, confirming idempotency:

```
Seeding ICD-10 codes (diagnosis coding reference data)...
  created 0 new ICD-10 code(s) (102 already existed)
```

Frontend (cases 6-9): `npx eslint src/pages/clinician/EncounterWorkspace.jsx
src/pages/clinician/EncounterWorkspace.test.jsx` — 0 errors (3
pre-existing hex-color warnings, none new). `EncounterWorkspace.test.jsx`:

```
PASS src/pages/clinician/EncounterWorkspace.test.jsx

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total (2 new — cases 6-9 combined)
```

Full frontend suite: `npm run lint` exits 0 (1955 warnings, unchanged
ceiling); `npm run build` succeeds; `npm test` — 142/143 passing, the
1 failure (`booking/index.test.jsx`) reproduces only under full-parallel
resource contention and passes 7/7 in isolation, confirmed pre-existing
and unrelated to this slice (matches the pattern already documented
for `REQ107`).

## A real bug found and fixed via the new frontend test, not by inspection

`EncounterWorkspace.jsx`'s new ICD-10 `Autocomplete`'s `onInputChange`
handler unconditionally wrote its `value` into
`diagnosisForm.icd10_code`. MUI's `Autocomplete` also fires
`onInputChange` (with `reason: 'reset'`) immediately after `onChange`
selects an option — syncing the visible input text to the option's own
rendered label (`"J06.9 — Acute upper respiratory infection,
unspecified"`) — so selecting a real code stored that entire label as
the diagnosis's `icd10_code`, not the bare code. First caught by the
new "searches real codes... select one" test's own `CREATE_DIAGNOSIS`
mock mismatch — MockedProvider's own diagnostic output showed the
expected variables carrying the full label against a mock expecting
the bare code. Fixed by checking the `reason` argument: only write free
text on `reason === 'input'` (real typing), leaving `onChange`'s
code-only write standing after a real selection. Re-verified: the fix
test now passes and renders `J06.9` (not the full label) after saving.

## A real correction to the plan's own seeding approach

`PLAN148`'s Schema section suggested writing ~100 raw `INSERT`
statements directly into the migration file. Checked first against
this codebase's real, established convention (no other migration does
this — `Drugs`/`SubscriptionPlans`/`EmailTemplates` are all seeded
idempotently in `prisma/seed.ts`) and matched that instead — the
migration creates only the table + indexes; `seed.ts` gained a new
`ICD10_CODES` array seeded via the same find-then-create loop `DRUGS`
already uses.

## Live verification

Not performed against the real dev stack this slice (no browser
automation tool available this session). The real Postgres seed run
(case 10) is the closest available substitute — confirms all 102 rows
exist, are queryable, and the seed step is safely re-runnable.
