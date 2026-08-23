---
id: PLAN056
type: requirement
feature: clinical-records
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ020
related: [TP083, TR082]
---

# PLAN056 — Consultation workspace and clinical records (EMR), P0 slice

Slice 2 of 6 in the current Phase 1 MVP pass (REQ017 → **REQ020** → REQ021 →
REQ019 → REQ018 → REQ032, dependency order). REQ020 blocks REQ021
(prescriptions) — a prescription is issued from within an encounter and
cannot exist independently. This module did not exist at all before this
slice: no `Encounter`/`Diagnosis`/`Vital` model anywhere in `schema.prisma`.

## Scope

**Built (P0):** structured note capture across 8 sections, one-click
templates, persistent cross-encounter allergy/diagnosis banner, file
attachments, sign-off immutability enforced by a database trigger (not just
an application check), append-only addenda, and a cross-domain patient
timeline.

**Explicitly deferred (P1/P2, per REQ020's own phase assignment):** ICD-10
coding (free text only this slice), vitals as discrete trendable rows for
growth charts, investigation orders, referrals, voice-to-text, clinical
decision support, speciality packs.

## Two scoping decisions (genuine ambiguity in the requirement doc itself)

**"Vitals" is a note section, not a separate structured table this slice.**
`REQ020`'s own phase-assignment prose explicitly marks "vitals/growth charts"
as P1, but its Data Model Impact section lists a `Vitals` table without a
phase tag — a real internal inconsistency. Resolved as: "vitals" is one of
the structured `EncounterNotes.section` values (satisfying US-EMR-02's
section list), but there is no separate `Vitals(code, value, unit)`
row-per-reading table this slice — that granular, trendable model is what
"growth charts" actually needs.

**Allergy banner reuses `Diagnoses`, not a new table.** US-EMR-04 requires a
persistent allergy banner, but the Data Model Impact section lists no
`Allergies` table — only `Diagnoses`. Rather than invent a table the
requirement doesn't specify (Hard Rule 7), allergies are `Diagnoses` rows
with `type: 'allergy'`, queried across every encounter for the patient.

## Data model

`backend/prisma/migrations/20260824010000_clinical_records_encounters/migration.sql`:

- `Encounters`: one per Appointment (`appointment_id` unique). `client_org_id`
  is its own column, denormalized from the appointment's clinic at creation —
  `Patients` has no `client_org_id` of its own, same reasoning as `Resources`
  (REQ017). `status` (`in_progress|signed`), `locked` (bool), `signed_at`,
  `signed_by_id`.
- `EncounterNotes`: one row per section per encounter (`@@unique([encounter_id,
  section])`, upserted), `version` incremented on every save.
- `EncounterAddenda`: append-only, the only path to add information to a
  signed encounter.
- `Diagnoses`: `type` (`diagnosis|allergy`), `icd10_code` nullable (free text
  only this slice).
- `Attachments`: `file_ref`/`mime_type`/`original_filename`/`uploaded_by_id`.
- `EncounterTemplates`: `clinician_id` set = personal favourite, null =
  org-shared.
- **Two `BEFORE UPDATE OR DELETE` triggers** (first ones in this codebase —
  confirmed zero pre-existing via grep) on `EncounterNotes` and `Diagnoses`,
  each checking the parent `Encounters.locked` and raising an exception if
  true. This is the actual medico-legal enforcement US-EMR-06/PRD §14.2 names
  as non-negotiable ("write-protected by trigger") — the app-level check in
  `encounters.service.ts` is the fast, friendly-error path in front of it,
  not a substitute.
  - **Real bug caught and fixed while writing the trigger**: the first draft
    unconditionally `RETURN OLD` for both UPDATE and DELETE. For a `BEFORE
    UPDATE` trigger, whatever row is returned becomes the row that gets
    written — returning `OLD` would have silently turned every *unlocked*-state
    UPDATE into a no-op (the new values discarded), not just blocked writes on
    a locked encounter. Fixed to branch on `TG_OP`: `RETURN NEW` for UPDATE,
    `RETURN OLD` for DELETE.

## Backend

New `backend/src/encounters/` module (module/resolver/service/dto/entities),
scoped via `orgScope(user)` directly against `Encounters.client_org_id` (own
column, matching the `Resources` precedent) plus clinician/patient
self-scoping mirroring `appointments.service.ts`'s `selfScope()`:

- `getOrCreateEncounter(appointmentId, user)`: idempotent entry point —
  finds or lazily creates the encounter for an appointment.
- `saveEncounterNote`, `signEncounter` (one-way, clinician-only),
  `addAddendum` (allowed regardless of lock state), `createDiagnosis`,
  `patientAllergyBanner`, `encounterTemplates`/`createEncounterTemplate`/
  `applyTemplate` (fills every section in one call), `patientTimeline`
  (aggregates Encounters/Diagnoses/Attachments/the already-real TestResults).
- `backend/src/encounters/attachments.controller.ts`, mirroring
  `org-settings/org-branding.controller.ts`'s two-step REST-upload +
  GraphQL-persist pattern exactly, extended with a `%PDF` magic-byte
  signature (clinical attachments are lab reports/scans, not just photos).

**Two real bugs found and fixed during live-browser verification (not
caught by unit tests, which mock Prisma and cannot see either class of
defect):**

1. **`saveEncounterNote` rejected every single call** — `SaveEncounterNoteInput
   .content` had no `class-validator` decorator, and the global
   `ValidationPipe`'s `{whitelist: true, forbidNonWhitelisted: true}` treats
   an undecorated property as unrecognized and rejects the whole request
   ("property content should not exist"). The frontend's `onBlur` handler had
   no `.catch`, so a clinician's typed note looked saved and was silently
   lost on reload — a real clinical-safety data-loss defect in a just-shipped
   EMR feature. Fixed with `@IsString()` on `content` (not `@IsNotEmpty()` —
   clearing a section back to empty is a legitimate save), plus every
   frontend mutation handler now reports its own failure via a snackbar
   instead of assuming the caller will.
2. **`getOrCreateEncounter`'s find-then-create is not atomic** — two calls
   within the same instant (confirmed live via React 18 StrictMode's
   double-effect invocation, but the same race is reachable from a genuine
   double-click or two browser tabs in production) can both pass the
   "does it exist" check and race on `create()`, and the loser's unique-
   constraint violation (`P2002` on `appointment_id`) propagated as an
   unhandled 500. Fixed to catch `P2002` and fetch-and-return the winner's
   row, matching the established `e.code === 'P2002'` idiom already used in
   `products.service.ts`.

**Tenancy-matrix gap found and closed while classifying this new domain**
(`backend/test/integration/setup/domain-cases.ts`,
`matrix-coverage.int-spec.ts`): REQ017's own `resources` domain had shipped
without ever being added to the tenancy matrix — the anti-rot gate
(`00-foundation-hardening.md` §4) would have failed on the next `test:int`
run regardless of this slice. Closed alongside `encounters` in the same
pass. Also found and closed two more pre-existing gaps surfaced by the same
gate: `drugs` (real CASES entry, since org-owned drug rows have genuine
isolation to test) and `organization-onboarding` (EXEMPT — entirely
`@Public()`, no tenant-scoped read exists on it at all).

## Frontend

New route `/clinician/encounters/:appointmentId`
(`frontend/src/pages/clinician/EncounterWorkspace.jsx`), entered via a new
"Start Consultation" button on `pages/appointments/detail.jsx` (clinician-only,
non-terminal appointments only). Three-pane layout: patient timeline (left),
structured note sections + addenda (center), templates/attachments/sign-off
(right). Persistent allergy banner atop the workspace regardless of which
encounter is open.

**Accessibility/testability bug found and fixed**: the note section
`TextField`s had a visual `Typography` heading but no `label` or
`aria-labelledby` — no accessible name at all. This surfaced as a real e2e
test failure, not just an audit finding: MUI's multiline `TextareaAutosize`
renders a second, hidden "shadow" `<textarea>` per field for auto-sizing, so
a positional `locator('textarea').nth(N)` silently counted the wrong
element once N > 0 — the assertion target was invisible to the accessibility
tree entirely, which is exactly why the visual value was correct while a
DOM-order-based test kept reading empty. Fixed by giving each section's
heading an `id` and wiring `aria-labelledby` on the field, then rewriting the
e2e spec to use `getByLabel`/`getByRole('textbox', {name})` instead of
position.

## Tests

Backend: `encounters.service.spec.ts` (34 cases) covering tenant isolation
(org-less/cross-org/self-scoping for clinician and patient callers), the
lock/addendum state machine, template application, the `P2002` race fix, and
the timeline aggregation shape. `backend/test/integration/encounter-lock-
trigger.int-spec.ts` (new, real Postgres via `test:int`) proves the trigger
itself rejects a direct UPDATE/DELETE on a locked encounter's notes/diagnoses
even bypassing the service layer entirely — the whole point of a DB-level
guarantee is that it holds even if application code has a bug, so a
mocked-Prisma unit test alone cannot prove it.

Frontend: no new Jest coverage (matching this codebase's established
practice of relying on e2e for new multi-pane page-level flows). New
Playwright spec `frontend/e2e/encounter-workspace.spec.js`: a clinician opens
a disposable test appointment, starts a consultation, saves a note (asserted
to survive a hard reload — the direct regression guard for bug #1 above),
applies a template, signs off, confirms the note becomes read-only and an
addendum can still be added. Uses the same fixture-linking pattern as
`clinician-portal.spec.js` (temporarily links the demo clinician account to
the real seeded clinician, reverted in `afterAll`) and creates/fully tears
down its own disposable `Appointment`/`Encounters`/`EncounterTemplates` rows
rather than depending on or mutating real dev-DB data.

## Verification

1. `npx prisma validate`, `migrate deploy`, `generate`, `docker restart
   medibook_backend` — clean compile confirmed.
2. Backend: 842/842 unit tests green (`npx jest --maxWorkers=2`), 216/216
   integration tests green (`npm run test:int`), `eslint`/`tsc --noEmit`
   clean.
3. Frontend: lint clean on touched/new files (0 new warnings), 63/63 Jest
   tests green, production build succeeds, `scripts/check-page-data-
   wiring.mjs` reports 0 new fabricated pages.
4. New e2e spec green against the real dev stack; confirmed its own fixture
   data (appointment, encounter, template, the temporary clinician_id link)
   is fully torn down after the run.
5. Commit as one vertical slice: `feat(backend,frontend): consultation
   workspace and clinical records (REQ020)`.
