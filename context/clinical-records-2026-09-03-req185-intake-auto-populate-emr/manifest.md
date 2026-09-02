---
id: CTX-clinical-records-2026-09-03-req185-intake-auto-populate-emr
type: improvement
feature: clinical-records
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ185
related: [PLAN254, TP274, TR274]
---

# clinical-records — digital intake auto-populates the EMR (P2-14)

`P2-14` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`, the
next unstarted slice per `phase-plans/README.md`'s own `▶ CURRENT POSITION`,
picked up via a bare `continue` right after `P2-13`/`REQ184` shipped. Tracker
note: "`intake-fields` built; the EMR write-through isn't."

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ185 | [doc](../../requirements/clinical-records/improvement/REQ185-clinical-records-2026-09-03-intake-auto-populate-emr.md) |
| implementation-plans | PLAN254 | [doc](../../implementation-plans/clinical-records/improvement/PLAN254-clinical-records-2026-09-03-intake-auto-populate-emr.md) |
| test-plans | TP274 | [doc](../../test-plans/clinical-records/improvement/TP274-clinical-records-2026-09-03-intake-auto-populate-emr.md) |
| test-results | TR274 | [doc](../../test-results/clinical-records/improvement/TR274-clinical-records-2026-09-03-intake-auto-populate-emr.md) |

## Confirmed real, scoped as stated

Unlike `P2-13`, verifying this slice's tracker note against the real code
found the gap exactly as described, not deeper. `ClinicIntakeFieldConfig`
and `Appointments.intake_responses`/`reason` already existed and were
already populated at booking time; `getOrCreateEncounter()` simply never
read them.

## What shipped

- `EncountersService#buildIntakeSeedContent()` — assembles an HTML block
  from `reason` and `intake_responses`, resolving each intake key to its
  real label via the pre-existing `IntakeFieldsService#forBooking()` (the
  same method `appointments.service.ts` already uses for required-field
  validation at booking time).
- `getOrCreateEncounter()` seeds that content into a new encounter's
  `'complaints'` note, inside a new interactive `$transaction` (the first
  callback-style transaction in this file — needed because the note's
  `encounter_id` depends on the just-created encounter's own generated id,
  which the file's existing array-style `$transaction([...])` can't
  express). Fires once, on first creation only — never touches an existing
  encounter's notes.
- `escapeHtml()` (`backend/src/common/utils/escape-html.ts`) — new utility,
  the first in this codebase. Needed because this is the first place raw
  patient-supplied text is written into an HTML-typed column
  (`EncounterNotes.content`) without passing through a rich-text editor's
  own sanitization — closes a stored-XSS gap that would otherwise land
  directly in a clinician's own note.

## Deliberately NOT built (recorded, not silently dropped)

- Allergy-banner auto-population (`US-EMR-04`) — the banner is backed by
  structured, coded `Diagnoses` rows; auto-coding a diagnosis from
  unstructured patient-typed text is a genuine patient-safety risk needing
  its own design review.
- A new `EncounterNotes` provenance schema flag — a plain-language header
  inside the seeded content itself is simpler and needs no schema change;
  the clinician can edit/delete it like any other note.
- Any frontend change — confirmed, not assumed, via a live GraphQL round
  trip: `EncounterWorkspace.jsx`'s existing generic per-section
  `RichTextEditor` already renders the seeded note with zero modification.

## Live verification (real dev stack, real data)

Authenticated as `receptionist@medibook.dev`. Created a real appointment via
`createAppointment` with an XSS-shaped `notes` value, called
`getOrCreateEncounter` on it, and confirmed the returned encounter's
`complaints` note contained the exact expected HTML-escaped seed content —
end-to-end proof against real data, not just the mocked-Prisma unit suite.
Full detail and the exact returned payload in `TR274`.

## Verification

Backend: 7 new unit tests in `encounters.service.spec.ts` + 5 new
`escape-html.spec.ts` tests. Full backend unit suite green (167
suites/2658 tests), `tsc`/`eslint` clean. Full integration suite green
(13/516) including the domain's existing `encounters` tenancy-matrix
coverage. No schema change; no frontend change.

## Next in the phase-plans spine

`P2-14` marked done in `02-phase2-win-the-midmarket.md`;
`phase-plans/README.md`'s `▶ CURRENT POSITION` advanced to `P2-15`
(kiosk check-in mode).

## Commits

`bd803d3` (backend).
