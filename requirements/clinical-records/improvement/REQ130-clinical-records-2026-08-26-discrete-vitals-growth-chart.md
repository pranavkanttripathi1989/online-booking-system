---
id: REQ130
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ020
related: [PLAN170, TP190, TR190]
---

# REQ130 — Discrete vitals for growth charts (FR-EMR-05)

## Why this slice

`REQ020`'s own P0 slice made a recorded, explicit scoping decision (see
its own "Two scoping decisions recorded" note): "vitals" would ship as a
free-text note *section* (`EncounterNotes.section === 'vitals'`) at P0,
with structured/trendable vitals explicitly deferred to P1 as the part
that actually enables "growth charts" — the PRD's own phase-assignment
language for `FR-EMR-05`. Confirmed still true before starting: no
`Vitals` table existed, and the free-text `vitals` note section (still
present, unrelated, and untouched by this slice) has no way to trend a
value over time.

## User story

As a clinician, I can record a patient's vital-sign readings (height,
weight, temperature, pulse, blood pressure, SpO2) as discrete, structured
values during a consultation, and view a chart of how a patient's weight
and height have changed across every encounter they've had.

## Acceptance criteria

- **Given** an open (unsigned) encounter, **when** a clinician records
  one or more vital readings in a batch, **then** a `Vitals` row is
  created per reading, with its unit derived server-side from the
  reading's code (never trusted from the client).
- **Given** a locked (signed) encounter, **when** vitals are recorded,
  **then** it is rejected with the same "signed and can no longer be
  edited" message every other clinical-content mutation on a locked
  encounter uses.
- **Given** an encounter with recorded vitals, **when** it is fetched,
  **then** `vitals` on the response includes every reading tied to it.
- **Given** a patient with vitals recorded across multiple encounters,
  **when** the growth chart is opened, **then** weight and height are
  each plotted chronologically across every encounter, not just the
  current one.
- **Given** no readings recorded yet for a code, **then** the chart
  shows an honest empty state for that series, not a broken/empty
  render.

## In scope

- `Vitals` table (`encounter_id`, `code`, `value`, `unit`,
  `recorded_by_user_id`, `recorded_at`) — a code/value/unit shape
  matching this requirement's own Data Model Impact section verbatim.
- `Encounters.recordVitals` mutation (batch) and `patientVitals` query
  (one code, every encounter, chronological).
- A "Vitals" section on `EncounterWorkspace.jsx` (record + display this
  encounter's own readings) and a "Growth Chart" dialog (weight/height
  line charts via the existing `recharts` dependency, already used by
  `analytics/index.jsx`/`finances/index.jsx`/`manager/Dashboard.jsx`).

## Deliberately out of scope

- The pre-existing free-text `vitals` note section on `EncounterNotes` —
  untouched; the two concepts (a note vs. a structured reading) coexist,
  matching how "Diagnosis" (free text) coexists with the structured
  "Diagnoses" list built earlier in this same batch.
- WHO/CDC percentile overlay bands on the growth chart (the clinically
  rigorous version of a pediatric growth chart) — this slice plots the
  patient's own raw trend line only; percentile-band rendering needs its
  own reference-data source and is a real follow-on, not silently
  dropped.
- Vital-sign reference ranges / abnormal-value flagging — no clinical
  decision support this slice (matches `FR-EMR-12`'s own explicit P2
  deferral in `REQ020`).
- A dedicated growth-chart view outside the encounter workspace (e.g. on
  `patients/detail.jsx`) — that page's own clinical-record tabs are
  still paused pending a separate product decision
  (`context/open-questions.md` #13); the growth chart is reachable from
  the clinician's own consultation workflow instead, which needed no
  new product decision to build.
