---
id: REQ157
type: requirement
feature: data-migration
created: 2026-08-27
updated: 2026-08-27
status: done
parent: null
related: [PLAN198, TP218, TR218]
---

# REQ157 — AI-assisted patient CSV importer (P2-05)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s P2-05
slice: *"`FRONTEND_RULES` §1 and PRD v1 §2.3.7 both name data migration
as the #1 switching blocker. Rivals win on 'free migration, 1-day
go-live.'"* A brand-new feature slug — no existing feature covers bulk
data import.

## A real scope correction made before writing any code

The phase doc's own BE bullet names "per-vendor export mappers" for
Practo/MocDoc/HealthPlix by name. This codebase has **no verified
knowledge of those vendors' real export column layouts** — claiming a
"Practo mapper" without ever having seen a real Practo export would be
fabricating vendor-specific behaviour this codebase has no evidence
for, the same class of dishonesty the ProcedureCodes/Icd10Codes
"curated starter set, not a licensed vendor set" precedent already
refuses to commit elsewhere.

Scoped instead to a **generic, configurable column-mapping importer**:
a real header-name similarity matcher (`column-mapping.ts`) suggests a
mapping for *any* export's headers — "Patient Name"/"DOB"/"Mobile"-
shaped columns are common across every EMR export regardless of vendor,
not something unique to naming a specific competitor. The importer is
genuinely usable against a real Practo/MocDoc/HealthPlix export the
moment one is available to test against; nothing here claims fidelity
it cannot back up today.

Also scoped down from "patients, appointments and encounters" (the
phase doc's own FE bullet: "column mapping preview → dry-run diff →
commit... lands as structured patients, appointments and encounters")
to **patients only** this slice. Synthesizing valid `Appointments` rows
(which `Encounters` requires — `appointment_id` is `@unique`) from
CSV-only source data would mean inventing clinics/clinicians/services
the CSV was never going to specify — a different, much larger feature
(matching an imported visit history to a *real* clinician/service
requires a whole separate reconciliation UI). Appointment/encounter
import is logged as a named follow-on, not silently dropped.

## What was found while scoping the AI wedge

`Patients.medical_notes String @default("")` already exists — a real,
already-shipped free-text field. This closes the gap the phase doc's
own framing depends on ("competitor exports contain unstructured
free-text notes, and the scribe pipeline can structure them... a
rival's own export becomes better data inside our product than it was
inside theirs") without needing to synthesize the Encounter/Appointment
chain at all: a mapped "notes"/"history" column is run through P1-11's
own `structureTranscript()` classifier (reused, not reimplemented) and
the labeled result is written straight into `medical_notes`.

## User story

As a clinic switching from another system, I want to upload a CSV
export of my patients, review and adjust how its columns map to real
fields, see exactly which rows will import cleanly and which will not
before committing anything, and have any free-text history in the file
come in as organised sections rather than one opaque blob.

## Acceptance criteria

- **Given** a CSV file, **when** it is uploaded, **then** its real
  headers, a small sample of real rows, and a suggested column mapping
  (derived from real header-name matching, never guessed at random) are
  shown — never a fabricated preview.
- **Given** the suggested mapping, **when** the user disagrees with it,
  **then** they can change or clear any column's target field before
  proceeding — the suggestion is a starting point, not a commitment.
- **Given** a chosen mapping, **when** a dry run is requested, **then**
  every row is validated against the same required-field contract a
  manually-created patient already has (`first_name`/`last_name`/
  `email`/`phone`/`date_of_birth`), with the exact reason reported for
  every row that would fail — capped in the response for a very large
  file, but the real total count is always shown.
- **Given** a dry run with zero valid rows, **then** commit is
  disabled — never lets a no-op import proceed silently.
- **Given** a commit, **then** the backend re-validates from scratch
  (never trusts an earlier dry run's own result) and creates only the
  real valid rows, scoped to the caller's own organisation.
- **Given** a mapped "notes"/"history" column with real free-text
  content, **then** the imported patient's `medical_notes` contains
  that content structured into labeled sections when it is long enough
  to have real sentence structure, and passed through unchanged
  otherwise — never inventing a fact the source text did not contain.
- **Given** every commit, **then** a real, queryable audit record
  (`ImportJobs`) is created — total/imported/error row counts and the
  full error list, not just what fit in one GraphQL response.

## In scope

- CSV upload (Excel: save-as-CSV first, not a separate binary parser
  this slice).
- Generic column mapping with real, deterministic suggestion.
- Dry-run validation with a per-row error report.
- Commit creating real `Patients` rows, scoped to the caller's org.
- The `medical_notes` AI-structuring wedge, reusing P1-11's own
  transcript classifier.
- An `ImportJobs` audit record per commit.

## Deliberately out of scope

- Per-vendor (Practo/MocDoc/HealthPlix) export mappers claiming
  fidelity to a real, unverified vendor format — see the scope
  correction above.
- Appointment/encounter import — needs a real clinic/clinician/service
  reconciliation step of its own, a separate, larger feature.
- A native `.xlsx` binary parser — CSV only this slice.
- Multiple concurrent import jobs / a job history/list page — one
  `ImportJobs` row is created per commit as an audit record, but
  nothing yet lists or re-visits past jobs.
