---
id: REQ071
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ024
related: []
---

# REQ071 — Message-thread events on the patient clinical timeline

## Source

Part of an 8-slice batch, scoped from `REQ024`'s own `US-MSG-05` — "as a
clinician reviewing a patient's history, I want to see that a message
conversation happened, alongside their appointments and clinical notes,
so I have the full picture without switching screens." `REQ020`'s own
cross-domain `patientTimeline()` (built for encounters/appointments/
prescriptions) had no messaging awareness at all.

## Current-state gap

`encounters.service.ts#patientTimeline()` aggregated appointments,
encounters, and prescriptions into one chronological feed. Message
threads involving the patient were invisible to it.

## What shipped

`patientTimeline()` now also resolves the patient's own `UserProfiles`
row (via `patient_id`) and, if one exists (a linked patient login — a
dependant with no login of their own correctly has none), queries
`patient_clinic` threads where that user is a participant, added to the
timeline as `type: 'message_thread'` events.

A real, adjacent bug in `assertPatientAccess()` was found and fixed
while reading this method in full before extending it (not originally
scoped): the patient-role branch used a strict `patientId !==
user.patient_id` check instead of `PatientsService
.ownAndDependantPatientIds()` — the exact same gap `REQ065` closed for
`prescriptions`/`test-results` the same day, now also closed here.

## User stories

- As a clinician reviewing a patient's timeline, I can see that a
  message conversation exists alongside their clinical history.

## Acceptance criteria (Given/When/Then)

- **Given** a patient with a linked login who has an active
  `patient_clinic` thread, **when** their timeline is requested, **then**
  a `message_thread` event appears in the feed.
- **Given** a dependant patient with no login of their own, **then** no
  message-thread lookup is attempted (there is no `UserProfiles` row to
  resolve) and the timeline still returns cleanly.
- **Given** a `'patient'`-role caller requesting their own or a genuine
  dependant's timeline, **then** access is granted; a caller requesting
  a timeline belonging to neither is still rejected.

## Traceability

`REQ024` `US-MSG-05`. `FR-MSG-06` (PRD). Same bug class as `REQ065`.
