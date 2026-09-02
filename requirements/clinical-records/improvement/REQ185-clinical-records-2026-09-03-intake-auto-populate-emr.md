---
id: REQ185
type: improvement
feature: clinical-records
created: 2026-09-03
updated: 2026-09-03
status: done
parent: —
related: [PLAN254, TP274, TR274]
---

# REQ185 — Digital intake auto-populates the EMR on first encounter open

## Source

`P2-14` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md` (the
next unstarted slice after `P2-13`/`REQ184`, per `phase-plans/README.md`'s
`▶ CURRENT POSITION`, picked up via a bare `continue`). Its tracker note read:
"`intake-fields` built; the EMR write-through isn't." Verifying against the
real code (the `continue` protocol's own step 4) confirmed this gap was real
and scoped exactly as stated — unlike `P2-13`, no deeper gap was hiding
underneath it:

- `ClinicIntakeFieldConfig` (per-clinic, optionally per-product, configurable
  booking-time questions) and `Appointments.intake_responses`/`reason` (the
  raw patient-supplied answers) both already existed and were already
  populated at booking time.
- `EncountersService#getOrCreateEncounter()` created a bare encounter with no
  seed content — a clinician opening a brand-new encounter saw a blank
  "Chief Complaints" section even though the patient had already answered
  structured intake questions at booking.
- `IntakeFieldsService#forBooking(clinicId, productId)` — the exact method
  `appointments.service.ts#create()` already uses to validate required-field
  completeness — was the correct, already-existing way to resolve a raw
  `{key: value}` pair back to its human-readable label; it had no caller
  outside that one validation path.

## What this ships

- **`EncountersService#buildIntakeSeedContent()`** — assembles an HTML block
  from `Appointments.reason` (labelled "Reason for visit") and
  `Appointments.intake_responses` (each key resolved to its real label via
  `IntakeFieldsService#forBooking()`, falling back to the raw key if no
  matching config exists), prefixed with a plain-language provenance line
  ("Patient-reported at booking:").
- **`getOrCreateEncounter()`** now seeds that content into a new encounter's
  `'complaints'` `EncounterNotes` row — **only** on first creation, inside the
  same interactive `$transaction` that creates the encounter (the note's
  `encounter_id` is a real runtime dependency on the just-created encounter's
  own generated id, which the array-style `$transaction([...])` this file
  already uses for `applyTemplate()` cannot express). Re-opening an existing
  encounter never touches or overwrites the note — the clinician's own edits
  are never clobbered.
- **`escapeHtml()`** (`backend/src/common/utils/escape-html.ts`, new) — this
  is the first place in this codebase's history that raw patient-supplied
  free text is interpolated directly into an HTML-typed column
  (`EncounterNotes.content`, TipTap-authored HTML per `FORM-20`) without
  first passing through a rich-text editor's own sanitization. No
  `escapeHtml`/`encodeHtml` utility existed anywhere before this slice.
  Applied to every interpolated value (`reason`, every intake response value
  and label) to close a stored-XSS gap that would otherwise have landed
  directly in a clinician's own encounter note.

## Deliberately NOT built (recorded, not silently dropped)

- **Allergy-banner auto-population** (`US-EMR-04`). The allergy banner is
  backed by *structured, coded* `Diagnoses` rows (`type: 'allergy'`).
  Auto-generating a structured clinical diagnosis from unstructured
  patient-typed intake text would require guessing/matching a clinical code
  from free text — a genuine patient-safety risk needing its own design
  review, not a silent side effect of this slice.
- **A new `EncounterNotes` provenance flag** (e.g. an `is_patient_reported`
  boolean alongside the existing `ai_generated`). Reusing `ai_generated`
  would be semantically wrong ("AI produced this" vs. "patient self-reported
  this"), and a schema change for a one-time seed value with no read-side
  consumer built yet wasn't justified — a clearly-worded plain-text header
  inside the seeded content itself is a simpler, zero-schema-change way to
  keep provenance visible, and the clinician remains free to edit or delete
  it via the pre-existing `saveEncounterNote()` path exactly like any other
  note content.
- **Frontend changes** — `EncounterWorkspace.jsx`'s "Chief Complaints"
  section already renders whatever `EncounterNotes.content` HTML exists via
  the generic `RichTextEditor` component shared by every section. Confirmed
  by a live GraphQL round trip (below), not just by reading the code.

## Acceptance criteria

**US-EMR-05**: As a clinician, when I open a brand-new encounter for an
appointment where the patient answered intake questions at booking, I see
those answers already in the Chief Complaints section.
- Given an appointment with a non-empty `reason` and/or `intake_responses`,
  when `getOrCreateEncounter` creates the encounter for the first time, then
  a `'complaints'` note is seeded with the reason and every non-blank intake
  response, each resolved to its real label where a matching
  `ClinicIntakeFieldConfig` exists.
- Given an appointment with no `reason` and no `intake_responses`, then no
  note is seeded and `IntakeFieldsService#forBooking` is never called.
- Given an encounter that already exists for the appointment, when
  `getOrCreateEncounter` is called again, then no note is created or
  modified — the clinician's own edits are never touched.

**US-EMR-06**: Patient-supplied text can never inject markup into a
clinician's note.
- Given a `reason` or intake response value containing `<script>...`, when
  the note is seeded, then the stored content contains the HTML-escaped form
  (`&lt;script&gt;...`), never the literal tag.

## Data model impact

None — `Appointments.reason`/`intake_responses` and `EncounterNotes` already
existed; this is a new write path composing existing columns, zero schema
changes.

## Verification

Backend: 7 new unit tests in `encounters.service.spec.ts` (empty-input no-op,
no re-seed on existing encounter, reason-only seeding, label resolution,
fallback-to-raw-key, blank-value skipping, XSS-payload escaping), plus 5 new
tests for `escapeHtml()` itself. Full backend unit suite green (167
suites/2658 tests), `tsc --noEmit` and `eslint` clean. Full integration suite
green (13 suites/516 tests) including `matrix-coverage.int-spec.ts`'s
existing `encounters` coverage, unaffected by this same-domain addition. A
live GraphQL round trip against the real dev stack (real patient, clinician,
clinic, service ids; `receptionist@medibook.dev`) created a real appointment
with an XSS-shaped `notes` value, called `getOrCreateEncounter`, and
confirmed the returned encounter's `'complaints'` note contained the exact
expected HTML-escaped seed content — end-to-end proof against real data, not
just the mocked-Prisma suite. No frontend code changed; `EncounterWorkspace.jsx`
renders the seeded note via its existing generic per-section `RichTextEditor`
with zero modification needed. See `TR274` for full detail.
