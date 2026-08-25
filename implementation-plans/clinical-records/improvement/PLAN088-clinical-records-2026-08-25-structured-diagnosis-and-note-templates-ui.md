---
id: PLAN088
type: improvement
feature: clinical-records
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ061
related: []
---

# PLAN088 — Implementation plan for structured diagnosis + note-template creation UI

Technical implementation plan for `REQ061`. No backend change —
`createDiagnosis` and `createEncounterTemplate` already exist and are
already tested.

## Backend facts confirmed before designing the UI

- `CreateDiagnosisInput` — `encounter_id`, `type`, `text`, optional
  `icd10_code`. `EncounterWorkspace.jsx` already has `encounterId` in
  scope from its own `getOrCreateEncounter` flow — no new lookup needed.
- `CreateEncounterTemplateInput` — `name`, optional `specialty`,
  `sections_json` (a JSON string), `org_shared`. The existing `applyTemplate`
  path already round-trips `sections_json` correctly (confirmed via
  `encounter-workspace.spec.js`'s own pre-existing "apply template" test)
  — this slice's "save" side reuses the identical shape rather than
  inventing a new one, built from `SECTIONS.forEach(s => sections[s.key]
  = sectionContent(encounter?.notes, s.key))`, the same helper the notes
  pane already uses to read each section's current content.
- `encounterTemplates` has no `client_org_id` filter visible from the
  frontend contract (org-shared templates are visible org-wide,
  confirmed by the existing `applyTemplate` UI already showing every
  template regardless of which clinician created it) — `org_shared:
  true` is always sent, matching every existing template's own
  visibility; no toggle offered since a private, non-shared template has
  no existing UI path to browse anyway.

## Frontend — `frontend/src/pages/clinician/EncounterWorkspace.jsx`

Two new inline mutations (`CREATE_DIAGNOSIS`, `CREATE_ENCOUNTER_TEMPLATE`),
matching this file's own existing convention of page-scoped `gql`
documents for a just-shipped backend domain.

**`NotesPane`**: new `onAddDiagnosis` prop, `diagnosisOpen`/
`diagnosisForm` state, a "Diagnoses" section (list + "Add Diagnosis"
button, hidden when `locked`) inserted between the structured note
sections and the Addenda block, and a matching "Add Diagnosis" dialog
(type select, description textarea, optional ICD-10 field) mirrored
after the existing Addendum dialog's own structure.

**`ActionsPane`**: new `onSaveAsTemplate` prop, `refetch: refetchTemplates`
pulled from the existing `useQuery(ENCOUNTER_TEMPLATES)` (previously
unused — the query already refetched on every `applyTemplate`, but
nothing ever needed to refetch it for a *new* template until now), a
"Save as template" button next to the Templates header, and a dialog
collecting name + optional specialty.

**`EncounterWorkspace`** (top-level): `handleAddDiagnosis` and
`handleSaveAsTemplate` callbacks, both following the file's own
established `reportError`-on-catch convention (the BUG020 lesson — no
mutation here fails silently). `handleSaveAsTemplate` builds
`sections_json` from the *current* encounter's notes at save time (not a
stale snapshot), so what gets saved matches exactly what's on screen.

## Testing (see `TP115`)

- New `frontend/src/pages/clinician/EncounterWorkspace.test.jsx`: real
  diagnoses render; adding a diagnosis calls the real mutation and
  refetches; saving the current note as a template calls the real
  mutation with the correct `sections_json` shape.
- e2e coverage added to `frontend/e2e/gap-analysis-a4-a8.spec.js`: a
  clinician on a real disposable appointment/encounter fixture adds a
  diagnosis (appears in the list) and saves the note as a template
  (appears in the previously-empty Templates list).

## What this does not close

No diagnosis edit/delete (the backend has no such mutation yet — a real,
standing gap, not hidden). No ICD-10 code lookup/autocomplete (P1 per
`REQ020`'s own phase assignment) — the field is a plain text input.
