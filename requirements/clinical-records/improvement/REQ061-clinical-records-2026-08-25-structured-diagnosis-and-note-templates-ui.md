---
id: REQ061
type: improvement
feature: clinical-records
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ020
related: []
---

# REQ061 — Structured diagnosis entry and note-template creation UI

## Source

`project-plans/analysis/08-integration-gap-analysis.md` findings A-5 and A-6 — a
fresh sweep cross-checking every backend GraphQL operation against real
frontend usage. Both close out real, already-shipped backend capability
from `REQ020`'s own P0 scope that never got frontend UI.

## Current-state gap

**A-5 — no structured diagnosis entry.**
`backend/src/encounters/encounters.resolver.ts:71` — `createDiagnosis`
producing a real `Diagnosis` row (`type`, `icd10_code`, `text`,
`status`). Tested. `EncounterWorkspace.jsx` already *displayed*
`diagnoses` and had a free-text "Diagnosis" note-section key — but the
free-text note and the structured `Diagnosis` entity are two different
things, and no UI path ever called `createDiagnosis`. A clinician's
diagnosis ended up as unstructured prose inside a SOAP note, never as a
queryable, ICD-10-codeable structured record.

**A-6 — clinicians could apply templates but never create one.**
`backend/src/encounters/encounters.resolver.ts:92` —
`createEncounterTemplate`. Tested. `EncounterWorkspace.jsx` read
`encounterTemplates` and applied an existing one, showing "No templates
yet." when empty — but nothing ever called `createEncounterTemplate`, so
that empty state could never resolve itself through the app. The
one-click-template feature `REQ020` shipped was genuinely unusable for
any org until someone seeded templates directly in the database.

## What shipped

Both in `pages/clinician/EncounterWorkspace.jsx`:

- **Diagnoses**: a "Diagnoses" section in the notes pane, between the
  structured note sections and any addenda — lists real `encounter.
  diagnoses` (type/status chips, ICD-10 code, text), or "No diagnoses
  recorded yet." when empty. An "Add Diagnosis" button (hidden once the
  encounter is signed/locked, matching every other note-editing action's
  own lock behavior) opens a dialog: type (diagnosis/allergy), free-text
  description, optional ICD-10 code. Calls the real `createDiagnosis`
  mutation and refetches.
- **Save as template**: a "Save as template" button next to the existing
  Templates list header opens a dialog collecting a name and optional
  specialty, then calls `createEncounterTemplate` with the *current*
  encounter's own section content (`sections_json`, built the same way
  `sectionContent()` already reads each section for display) and
  `org_shared: true` — visible to any clinician in the org afterward,
  matching every existing template's own visibility.

## User stories

- As a clinician, I can record a structured diagnosis (with an optional
  ICD-10 code) during a consultation, not just free text in a note.
- As a clinician, once I've written a good note, I can save its content
  as a reusable template for future consultations, so the very first
  template an org ever has doesn't require direct database access.

## Acceptance criteria (Given/When/Then)

- **Given** an unlocked encounter, **when** a clinician adds a diagnosis,
  **then** it appears immediately in the Diagnoses list, tagged with its
  type and (if given) ICD-10 code.
- **Given** a locked (signed) encounter, **then** "Add Diagnosis" is not
  rendered — matching the same lock convention as note editing.
- **Given** a clinician saves the current note as a template, **when**
  the template is created, **then** it appears in the Templates list
  (after a refetch) and can be applied to a future encounter via the
  existing `applyEncounterTemplate` flow, unchanged by this slice.

## Traceability

`REQ020` (EMR/consultation workspace, P0 scope: structured diagnosis
data and one-click templates) — this closes the frontend half of both;
the backend mutations and schema already shipped. No new `FR-*` scope —
UI completion for already-specified backend capability.
