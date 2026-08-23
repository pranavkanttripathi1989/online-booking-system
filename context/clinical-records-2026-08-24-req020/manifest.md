---
id: CTX-clinical-records-2026-08-24-req020
type: requirement
feature: clinical-records
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ020
related: [REQ017, PLAN056, TP083, TR082]
---

# clinical-records — REQ020 P0 slice: consultation workspace / EMR (2026-08-24)

Slice 2 of a 6-requirement Phase 1 MVP pass (REQ017 → **REQ020** → REQ021 →
REQ019 → REQ018 → REQ032, dependency order). REQ020 blocks REQ021
(prescriptions) — a prescription is issued from within an encounter and
cannot exist independently.

REQ020 itself splits into P0 (this slice) and P1/P2 (explicitly deferred, per
the requirement's own phase assignment — not silently dropped). This bundle
covers the P0 slice only; REQ020 stays `in-progress` until the later items
are picked up in a future slice.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ020 | [consultation workspace and clinical records (EMR)](../../requirements/clinical-records/requirement/REQ020-clinical-records-2026-08-22-emr-consultation-workspace.md) |
| implementation-plans | PLAN056 | [consultation workspace and clinical records (P0 slice)](../../implementation-plans/clinical-records/requirement/PLAN056-clinical-records-2026-08-24-emr-consultation-workspace.md) |
| test-plans | TP083 | [verification plan](../../test-plans/clinical-records/requirement/TP083-clinical-records-2026-08-24-emr-consultation-workspace-verification.md) |
| test-results | TR082 | [verification results — pass](../../test-results/clinical-records/requirement/TR082-clinical-records-2026-08-24-emr-consultation-workspace-verification.md) |

## What shipped

- Schema: six new models (`Encounters`, `EncounterNotes`, `EncounterAddenda`,
  `Diagnoses`, `Attachments`, `EncounterTemplates`) and this codebase's first
  two Postgres triggers, enforcing sign-off immutability at the database
  layer (`reject_write_if_encounter_locked()` on `EncounterNotes`/`Diagnoses`).
- Backend: new `backend/src/encounters/` module — idempotent
  `getOrCreateEncounter`, structured note save/lock state machine, one-way
  sign-off, append-only addenda, templates, cross-encounter allergy banner,
  cross-domain patient timeline (Encounters + Diagnoses + Attachments +
  real TestResults), and a REST attachment-upload controller mirroring
  `org-branding.controller.ts`'s two-step pattern.
- Frontend: new `pages/clinician/EncounterWorkspace.jsx` (three-pane
  consultation workspace) at `/clinician/encounters/:appointmentId`, entered
  via a new "Start Consultation" button on the appointment detail page.
- Tests: 34 new backend unit tests (`encounters.service.spec.ts`), a new
  real-Postgres integration spec proving the trigger itself (not just the
  app-level check) rejects a locked encounter's writes, and a new Playwright
  e2e spec covering save→reload-persists, template application, and sign-off.

## Real bugs found and fixed during this slice

1. **`SaveEncounterNoteInput.content` had no validator** — every note save
   400'd, and the frontend swallowed the error silently, so a typed note
   looked saved and was lost on reload. A genuine clinical-safety data-loss
   defect, found via a live manual browser pass before the e2e spec was
   written (per `CLAUDE.md`'s "no live browser pass" lesson from `BUG010`).
2. **`getOrCreateEncounter`'s find-then-create race** — two near-simultaneous
   calls could both pass the existence check and race on `create()`, with
   the loser throwing an unhandled `P2002`. Reachable in production (a
   double-click, two tabs), not just React StrictMode's dev-only
   double-invocation that first surfaced it.
3. **Tenancy-matrix anti-rot gate was already red** before this slice —
   REQ017's own `resources` domain, plus `drugs` (REQ016/044) and
   `organization-onboarding` (REQ013), had shipped without ever being
   classified in `matrix-coverage.int-spec.ts`. All three closed alongside
   this slice's own `encounters` classification.
4. **Trigger function's first draft returned `OLD` unconditionally** — for a
   `BEFORE UPDATE` trigger this would have silently discarded every
   *unlocked*-state edit (not just blocked locked ones). Caught and fixed
   before ever being applied to a real database.
5. **`NotesPane`'s TextFields had no accessible name** — a real
   accessibility gap (visual heading only, no `label`/`aria-labelledby`)
   that also broke the first e2e attempt: MUI's multiline `TextareaAutosize`
   renders a hidden "shadow" `<textarea>` per field, so position-based
   locators silently counted the wrong element. Fixed both together.
6. **Pre-existing, unrelated lint error** in `drugs/drugs.service.spec.ts`
   (an unused var) was blocking the lint-green gate for every slice — fixed
   in passing since Hard Rule 3 requires lint green before any commit.

## What's deliberately not built yet (P1/P2, REQ020's own phase assignment)

ICD-10 real coding (free text only this slice), vitals as discrete
trendable rows for growth charts, investigation orders, referrals,
voice-to-text, clinical decision support, speciality packs. Each gets its
own future `PLAN###` under `REQ020` when picked up — not silently dropped.
