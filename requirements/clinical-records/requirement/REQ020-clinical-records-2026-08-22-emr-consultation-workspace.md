---
id: REQ020
type: requirement
feature: clinical-records
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: null
related: [REQ019, REQ021, PLAN056, TP083, TR082]
---

## Status (2026-08-24)

**P0 shipped** (`PLAN056`/`TP083`/`TR082`): structured note capture
(`US-EMR-01,02`) across 8 sections, one-click templates (`US-EMR-03`),
persistent allergy/diagnosis banner (`US-EMR-04`), file attachments
(`US-EMR-09`), sign-off immutability enforced by a database trigger, not just
an application check (`US-EMR-06`), append-only addenda, and a cross-domain
patient timeline (`US-EMR-07`) merging Encounters/Diagnoses/Attachments/the
already-real TestResults. New `backend/src/encounters/` module,
`frontend/src/pages/clinician/EncounterWorkspace.jsx`, and this codebase's
first two Postgres triggers.

**P1/P2 still open**, per this requirement's own phase assignment below —
not silently dropped: ICD-10 coding (real coding, not free text), vitals as
discrete trendable rows for growth charts, investigation orders, referrals,
voice-to-text, clinical decision support, speciality packs. Each gets its own
future `PLAN###` when picked up.

**Two scoping decisions recorded, not guessed at** (see `PLAN056`): "vitals"
is a note section this slice, not a separate structured table (the PRD's own
phase-assignment prose vs. its Data Model Impact section disagreed on this —
resolved in favor of the phase-assignment prose, since "growth charts" is the
explicitly-P1 half). The allergy banner reuses `Diagnoses` rows
(`type: 'allergy'`) rather than a new `Allergies` table, since the
requirement's own Data Model Impact section never lists one.

# Consultation workspace and clinical records (EMR)

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M7 — Consultation & Clinical Records (EMR)** (`FR-EMR-01`–`FR-EMR-14`). Cross-referenced against `project-plans/05-competitive-analysis.md` §3 (Tier 2 "the moat") and `frontend/src/pages/patients/detail.jsx`.

## Current state vs. PRD ambition

This module does not exist. There is no `Encounter`, `EncounterNote`, `Vital`, or `Diagnosis` model anywhere in `schema.prisma`, and no consultation workspace of any kind in the backend. The closest surface is `pages/patients/detail.jsx` — a 1,013-line page with UI for documents, diagnoses, and letters — which `project-plans` F-18 already identified as **entirely driven by `useState([])`**: it renders a clinical-record shell with nothing behind it. That finding is directly relevant here, because it means the frontend investment for this module's UI already exists in outline; what's missing is everything underneath it.

`project-plans/05-competitive-analysis.md` calls this the single largest strategic gap in the codebase relative to the market: *"the product is one layer short of being a system of record."* Every named competitor (Semble, Cliniko, Jane, SimplePractice, HealthPlix) has a working clinical-notes layer; MediBook has patient demographics and free-text notes only.

Given the scale, this requirement scopes the **MVP-critical subset** the PRD itself prioritises as P0: structured note capture, templates/favourites, allergy/condition banners, attachments, sign-off immutability, and the patient timeline. Coded diagnosis (ICD-10), investigation orders, referrals, voice dictation, clinical decision support, and speciality packs are explicitly P1/P2 and should be scoped as follow-on requirements once this foundation exists — attempting all fourteen `FR-EMR` items in one slice would violate the PRD's own phase gates (§6.4, "scope creep" is R9 in its own risk register).

## Gap classification

- **Net-new, entirely:** `Encounter`, `EncounterNote`, `Vital`, `Diagnosis`, `Attachment` models; the three-pane consultation workspace UI; templates/favourites library; sign-off/addendum immutability mechanism; patient timeline aggregation.
- **Reusable groundwork:** `patients/detail.jsx`'s existing UI shell for documents/diagnoses/letters can likely be adapted once real data exists behind it, rather than rebuilt from scratch — worth a design review before implementation, not a default assumption.

## Phase assignment

PRD Phase: **MVP (P0)** for `FR-EMR-01`, `02`, `04`, `06`, `07`, `09`, `13` — structured notes, templates, allergy banners, attachments, sign-off immutability, and the timeline. **V1 GA (P1)** for `FR-EMR-03` (ICD-10 coding), `05` (vitals/growth charts), `08` (investigation orders), `10` (referrals). **V2 (P2)** for `FR-EMR-11` (voice-to-text/AI drafting), `12` (clinical decision support), `14` (speciality packs) — these three carry real clinical-liability questions (PRD §19 Open Question 5) that should not be resolved implicitly by shipping code.

## Dependencies

- **Requires:** `REQ019` (queue) for the `checked_in → in_consultation` transition this module's encounter creation hooks off; `REQ016`'s drug master is a prerequisite for `REQ021` (prescriptions), which itself extends the encounter this module creates.
- **Blocks:** `REQ021` (prescriptions) — a prescription is issued from within an encounter and cannot exist independently; `REQ031` (insurance pre-authorisation) needs the clinician's diagnosis/treatment-plan section for its clinical-justification step.

## User stories

### Epic: Consultation workspace

**US-EMR-01** — As a clinician, I want a three-pane workspace (patient timeline, current encounter, quick actions) that loads in under 1.5 seconds, so that I can start documenting the moment I call a patient.
- PRD refs: FR-EMR-01
- Priority: P0
- Acceptance criteria:
  - Given a patient is called from the queue (`REQ019`), when the clinician opens the encounter, then the workspace loads with the patient's timeline pre-fetched, meeting the PRD's own p95 load target of 1.5s (`§13`).
  - This is the module's hard product constraint from the persona table (`§5`, P4): *"the median consult must be recordable in ≤ 90 seconds using templates + favourites, or clinicians revert to paper."* Every story below must be designed against that constraint, not just made functionally correct.

**US-EMR-02** — As a clinician, I want structured note sections (complaints, history, exam, vitals, diagnosis, investigations, advice, follow-up) that I can relabel per specialty, so that a dentist's note doesn't force a cardiology-shaped template.
- PRD refs: FR-EMR-02
- Priority: P0
- Acceptance criteria: given a specialty-specific template is selected, section labels reflect that specialty while the underlying structured fields remain queryable identically across specialties for reporting purposes.

**US-EMR-03** — As a clinician, I want one-click templates and drug/test/advice favourites, so that a common consultation type takes seconds, not minutes, to document.
- PRD refs: FR-EMR-04
- Priority: P0
- Acceptance criteria: given a saved template, applying it populates every configured section in one action, fully editable afterward; org-level shared templates are visible to every clinician in the org, personal favourites are visible only to their owner.

### Epic: Patient safety banners

**US-EMR-04** — As a clinician, I want allergies, chronic conditions, current medications, and family history to appear as a persistent banner on every encounter for this patient, so that I never miss a critical safety fact because it was buried on a prior visit's note.
- PRD refs: FR-EMR-06
- Priority: P0
- Acceptance criteria: given a patient has a recorded penicillin allergy, when any clinician opens any encounter for that patient (current or future), then the allergy banner renders without requiring the clinician to search the timeline for it.

### Epic: Attachments and sign-off integrity

**US-EMR-05** — As a clinician, I want to attach a photo taken from my phone camera directly to the current encounter, so that a rash or a scanned report becomes part of the record without a separate upload flow.
- PRD refs: FR-EMR-07
- Priority: P0
- Acceptance criteria: given a photo is captured, when attached, then it is auto-compressed and tagged to the specific encounter, retrievable from the patient timeline.

**US-EMR-06** — As a compliance-conscious Org Admin, I want a signed encounter to become immutable, with any later correction recorded as a timestamped addendum rather than a silent edit, so that the medico-legal record can never be quietly altered after the fact.
- PRD refs: FR-EMR-09
- Priority: P0
- Acceptance criteria:
  - Given a signed encounter, when any user (including the original clinician) attempts to modify its content directly, then the write is rejected at the database layer (a trigger, per `PRD §14.2`'s own stated constraint: *"Signed Encounter rows are write-protected by trigger; changes must go through the addendum table"*), and only an addendum with author/timestamp/reason can be appended.
  - This is named directly in the PRD as *"a medico-legal requirement and a common competitor weakness"* — treat the trigger-level enforcement as non-negotiable, not something an application-layer check can substitute for.

### Epic: Patient timeline

**US-EMR-07** — As a clinician or patient, I want a chronological, filterable, full-text-searchable timeline of every visit, prescription, bill, lab result, upload, and message, so that ten seconds of scanning tells the whole clinical story.
- PRD refs: FR-EMR-13
- Priority: P0
- Acceptance criteria: given a patient with a multi-year history across several clinicians at the same org, when the timeline loads, then every event type appears in correct chronological order and is filterable by type, with search returning matches from note content, not just event titles.

## Data model impact

New tables, matching `PRD §14.1`'s abridged model but adapted to this schema's existing conventions (UUID PKs, `client_org_id` scoping via the encounter's parent appointment/clinic, snake_case columns):

- `Encounters`: `id`, `appointment_id`, `patient_id`, `clinician_id`, `status`, `signed_at`, `signed_by`, `locked`.
- `EncounterNotes`: `id`, `encounter_id`, `section`, `content_json`, `version`.
- `EncounterAddenda`: `id`, `encounter_id`, `author_id`, `content`, `reason`, `created_at` — the only path to modify a signed encounter.
- `Vitals`: `id`, `encounter_id`, `code`, `value`, `unit`, `recorded_by`, `at`.
- `Diagnoses`: `id`, `encounter_id`, `icd10_code` (nullable at MVP, free-text fallback per `FR-EMR-03`), `text`, `type`.
- `Attachments`: `id`, `encounter_id`, `file_ref`, `mime_type`, `uploaded_by`, `at`.
- `EncounterTemplates`: `id`, `client_org_id|null` (null = clinician-personal), `clinician_id|null`, `specialty`, `sections_json`.
- A database trigger on `Encounters` rejecting `UPDATE` of note content once `locked = true`, per the immutability requirement above.

## Non-functional notes

Every new tenant-scoped table here must use the corrected `orgScope()` pattern from `project-plans` F-01 from the start — this module handles the most sensitive PHI in the entire product, and the cross-tenant read `project-plans` found live on the catalogue domain would be materially worse if it recurred here. Extend the tenancy-matrix integration test (`project-plans/04`, F-25) to cover every new table in this module before it ships, not after.

## Open questions

- Carried from PRD §19.5: clinical liability posture for future CDS alerts (out of scope for this requirement, but the addendum/audit design here should anticipate that a later CDS feature will need to attach its own alert-override records to the same encounter).
