---
id: TP083
type: requirement
feature: clinical-records
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: PLAN056
related: [REQ020, TR082]
---

# TP083 — Verification for consultation workspace and clinical records (EMR)

## Suggestion stage

Skipped. `REQ020` already carries full Given/When/Then acceptance criteria
per user story, and the requirement's own two internal ambiguities (vitals
table vs. section, allergy table vs. reused `Diagnoses`) were resolved and
recorded in `PLAN056` rather than drafted as open suggestions — a routine
CRUD-shaped module (tenant-scoped resource + REST-upload sub-controller)
matching an already-proven pattern (`Resources`/`org-branding.controller.ts`
from REQ017), not a genuinely exploratory one.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `getOrCreateEncounter` — first call for an appointment | creates the encounter, stamping `client_org_id` from the appointment's clinic |
| TC-02 | `getOrCreateEncounter` — second call, same appointment | returns the existing row, does not call `create` again |
| TC-03 | `getOrCreateEncounter` — concurrent race (`P2002` on `appointment_id`) | resolves to the winning row instead of throwing a raw 500 |
| TC-04 | `getOrCreateEncounter` — cross-org appointment | `NotFoundException` |
| TC-05 | `getOrCreateEncounter` — clinician not assigned to this appointment | `ForbiddenException` |
| TC-06 | `encounter(id)` — cross-org, cross-clinician, cross-patient | all rejected with `NotFoundException`; an org-less non-operator never falls through |
| TC-07 | `saveEncounterNote` — locked encounter | rejected with `BadRequestException` (app-level fast path) |
| TC-08 | `saveEncounterNote` — open encounter | upserts on `[encounter_id, section]`, increments `version` |
| TC-09 | `signEncounter` — already signed | rejected |
| TC-10 | `signEncounter` — non-clinician caller (e.g. front-desk staff) | rejected with `ForbiddenException` |
| TC-11 | `signEncounter` — treating clinician, open encounter | locks, stamps `signed_at`/`signed_by_id` |
| TC-12 | `addAddendum` — signed encounter | allowed (append-only, no lock check) |
| TC-13 | `patientAllergyBanner`/`patientTimeline` — cross-patient access | `NotFoundException` for a patient reading someone else's, or a clinician who never treated the patient |
| TC-14 | `applyTemplate` | upserts every section from `sections_json` in one transaction; rejected on a locked encounter or unknown template id |
| TC-15 | `createEncounterTemplate` | org-less non-operator rejected (`orgIdForWrite` fails closed); invalid `sections_json` rejected; `clinician_id` correctly null (org-shared) vs. the caller's own id (personal favourite) |
| TC-16 | **Database trigger** — direct `UPDATE`/`DELETE` on a locked encounter's `EncounterNotes`/`Diagnoses` row, bypassing the service layer entirely | rejected by Postgres itself, not just the application |
| TC-17 | **Database trigger** — the same operations while unlocked | allowed |
| TC-18 | **Database trigger** — `EncounterAddenda` insert on a locked encounter | allowed (no trigger on this table) |
| TC-19 | Tenancy matrix — `encounters` query | org-A caller sees org-A's encounter, never org-B's; role gate matches `@Auth()` exactly |
| TC-20 | Tenancy matrix anti-rot gate | no unclassified resolver domain (also closes two pre-existing gaps found while adding this one: `resources` from REQ017, `drugs` from REQ016/044) |
| TC-21 | Full backend suite regression | 0 failures |
| TC-22 | Backend lint + `tsc --noEmit` | clean |
| TC-23 | Full frontend suite regression | 0 failures |
| TC-24 | Frontend lint | clean, 0 new warnings |
| TC-25 | Frontend production build | succeeds; new route code-splits into its own chunk |
| TC-26 | `scripts/check-page-data-wiring.mjs` | 0 new fabricated pages |
| TC-27 | e2e: clinician starts a consultation from an appointment, saves a note | mutation succeeds; **the note survives a hard page reload** (the direct regression guard for the content-validation bug below) |
| TC-28 | e2e: apply an org-shared template | fills the templated section(s) via the real mutation + refetch |
| TC-29 | e2e: sign off | shows a "Signed" chip, note fields become read-only, "Add Addendum" affordance appears and works |

## How this was checked

TC-01–15 via `npx jest --maxWorkers=2 encounters` inside `medibook_backend`
(34 cases in `encounters.service.spec.ts`). TC-16–18 via `npm run test:int`
(host, against `postgres_test`) — a new, dedicated
`backend/test/integration/encounter-lock-trigger.int-spec.ts`, since a
database-level guarantee cannot be proven against a mocked Prisma client.
TC-19–20 via the same `test:int` run, extending
`backend/test/integration/setup/{fixture,domain-cases}.ts` and
`matrix-coverage.int-spec.ts`. TC-21/22 via the full backend `npx jest
--maxWorkers=2` (842/842) and `npx eslint`/`npx tsc --noEmit`. TC-23/24 via
`medibook_frontend`'s `npm test -- --watchAll=false` (63/63) and `npm run
lint`. TC-25 via `npm run build`. TC-26 via `node
scripts/check-page-data-wiring.mjs` from the repo root. TC-27–29 via a live
manual browser pass first (which found and drove the fix for the
content-validation and race-condition bugs below), then the automated
`npx playwright test encounter-workspace.spec.js` against the real dev
stack, using the same fixture-linking pattern as `clinician-portal.spec.js`
and its own disposable appointment/encounter/template rows, fully torn down
in `afterAll`.
