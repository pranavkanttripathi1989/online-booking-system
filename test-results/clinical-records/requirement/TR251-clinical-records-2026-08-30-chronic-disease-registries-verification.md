---
id: TR251
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP251
related: [REQ168, PLAN231]
---

# TR251 — Results for chronic-disease registries (diabetes/HTN) + recall (P2-12)

Executed 2026-08-30 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 suggestion ICD-10 prefix matching, org-scoped | **pass** | `chronic-registries.service.spec.ts` |
| TC-02 already-enrolled patient excluded | **pass** | |
| TC-03 dedup across multiple matching diagnoses | **pass** | |
| TC-04 platform operator sees all orgs | **pass** | |
| TC-05 org-scoped caller restricted | **pass** | |
| TC-06 enroll — unknown patient | **pass** | |
| TC-07 enroll — cross-org patient | **pass** | |
| TC-08 enroll — already active | **pass** | |
| TC-09 enroll — reactivate a resolved enrollment | **pass** | |
| TC-10 enroll — new patient | **pass** | |
| TC-11 markReviewed — cross-org | **pass** | |
| TC-12 markReviewed — resets last_reviewed_at | **pass** | |
| TC-13 resolve — unknown enrollment | **pass** | |
| TC-14 resolve — sets status | **pass** | |
| TC-15 recall status computation | **pass** | `computeRecallStatus` pure-function tests |
| TC-16 sweep — nothing overdue | **pass** | `chronic-registry-recall-sweep.service.spec.ts` |
| TC-17 sweep — notifies org staff | **pass** | |
| TC-18 sweep — 7-day dedup | **pass** | |
| TC-19 sweep — no org, skipped | **pass** | |
| TC-20 sweep — one org throws, rest continues | **pass** | |
| TC-21 Registries page empty states | **pass** | `manager/registries/index.test.jsx` |
| TC-22 real enrolled-patient row + status chip | **pass** | |
| TC-23 Enroll flow | **pass** | |
| TC-24 Mark Reviewed flow | **pass** | |
| TC-25 tenancy matrix — real CASES row | **pass, after a real correction** | see narrative below |

## Narrative

**TC-25** — the first draft classified `chronic-registries` as `EXEMPT`
in `matrix-coverage.int-spec.ts`, reasoning it had no existing fixture
data to hang a matrix case off. This was wrong before it was ever run:
`EXEMPT` is reserved for domains with *no* tenant-scoped list-query shape
at all (`ai-clinical`/`telemedicine`'s own precedent), and
`registryEnrollments` genuinely has one (`orgScopeVia(user, 'patient')`,
the identical helper `test-results`/`packages`/`memberships` already use
for a real `CASES` row). Caught by re-reading the `EXEMPT` map's own
header comment before committing, not by a failing test — fixed by
adding real fixture rows (`IDS.chronicRegistryEnrollmentA/B`) and a
proper `CASES` entry, mirroring `memberships`' own precedent exactly.
The integration suite's own count moving from 432 to 441 tests confirms
the new row is genuinely exercised, not just present.

## Full suite verification

- Backend: 134 suites / 2124 tests (23 new). Integration: 9/9 suites /
  441 tests. `tsc --noEmit` clean. `eslint` clean (0 errors) on every
  touched backend file.
- Frontend: `manager/registries/index.test.jsx` 4/4 (new).
  `layouts/AppShell.test.jsx` unaffected by the new nav entry. Full
  frontend suite (`--maxWorkers=2`): 357/369 passing; the 4 failures
  (`patient/Appointments`, `clinician/EncounterWorkspace`,
  `manager/claims/index`, `video/index`) are the same pre-existing
  resource-contention flakiness class already documented repeatedly this
  session — none import a file this slice touched. `eslint` clean (0
  errors). Production build clean.
- Live: both migrations applied to the dev DB via `prisma migrate
  deploy`, backend container restarted with a clean `Found 0 errors`
  compile and a confirmed `Nest application successfully started` +
  `GraphQL endpoint ready`, GraphQL introspection confirmed
  `chronicRegistrySuggestions`/`registryEnrollments` and all three
  mutations present on the live schema, and `schema.gql` on disk
  confirmed regenerated with the new types before any test was trusted.
