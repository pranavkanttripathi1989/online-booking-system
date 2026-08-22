---
id: REQ026
type: requirement
feature: telemedicine
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: REQ021
related: [REQ021, REQ018]
---

# Real teleconsultation: WebRTC, consent, and Telemedicine Practice Guidelines compliance

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M12 — Telemedicine** (`FR-TEL-01`–`FR-TEL-08`). Cross-referenced against `project-plans/01-codebase-analysis.md` §3.2 and `project-plans/06-execution-plan.md` P5 Wave B item 5.8.

## Current state vs. PRD ambition

`frontend/src/pages/video/index.jsx` exists as a routed page with **no implementation behind it** — `project-plans` already identified this as a route stub, not a partial build. There is no WebRTC signalling, no waiting room, no consent capture, and no recording infrastructure. This entire module is net-new.

Critically, this module **cannot ship compliantly without `REQ021`'s TPG drug-list enforcement already live** — `FR-RX-10`/`11` (List O/A/B enforcement, mandatory diagnosis before Rx) are Telemedicine Practice Guidelines requirements, and a teleconsultation product that lets a clinician prescribe without them is a direct regulatory exposure, not a missing nice-to-have. This requirement should be sequenced strictly after `REQ021`, and its acceptance testing should include the TPG guard as a release gate, not just its own video-call functionality.

## Gap classification

- **Net-new, entirely.** No partial credit exists — the routed page has no backend, no signalling server, and no session model.

## Phase assignment

PRD Phase: **V1 GA (P1)** in full.

## Dependencies

- **Requires:** `REQ021`'s TPG guardrails must be live before this module launches (hard compliance gate, not a scheduling nicety); `REQ018` (booking engine) already has a placeholder for teleconsult booking (`FR-BOOK-08`) that this module fulfils.
- **Blocks:** none downstream.

## User stories

### Epic: Video consultation

**US-TEL-01** — As a patient, I want to join a video consultation directly in my browser with no app install, so that a slow or unreliable connection doesn't force me to also fight with an app store.
- PRD refs: FR-TEL-01
- Priority: P1
- Acceptance criteria: given a poor network, the call degrades gracefully to audio-only rather than dropping entirely.

**US-TEL-02** — As a patient, I want a waiting room and a join link that only works around my actual appointment time, with one-tap rejoin if I disconnect, so that the link can't be reused later or shared beyond its purpose.
- PRD refs: FR-TEL-02
- Priority: P1
- Acceptance criteria: given a join link outside its valid window, access is refused; given a mid-call disconnect, rejoining resumes the same session rather than starting a new one.

### Epic: Consent and identity

**US-TEL-03** — As a clinician, I want explicit informed consent captured before any recording, stored encrypted with a retention policy, so that recording never happens by default or without the patient's knowledge.
- PRD refs: FR-TEL-03
- Priority: P1
- Acceptance criteria: given recording is not explicitly consented to, no recording occurs; given consent is given, the recording is encrypted at rest and subject to a defined retention/deletion schedule (coordinate with `REQ034`'s DPDP retention work).

**US-TEL-04** — As a patient, I want to see my clinician's registration number displayed during the call, per Telemedicine Practice Guidelines, so that I know I'm being treated by a verified practitioner.
- PRD refs: FR-TEL-04
- Priority: P1
- Acceptance criteria: the clinician's registration number (captured in `REQ015`'s clinician-verification work) is visibly shown to the patient for the duration of the call.

### Epic: Compliance logging

**US-TEL-05** — As the system, I want to log the mode of consultation (video/audio/text) on the encounter, since prescribing rights differ by mode under TPG, so that `REQ021`'s drug-list enforcement has the correct mode to check against.
- PRD refs: FR-TEL-05
- Priority: P1
- Acceptance criteria: every teleconsultation encounter records its mode, and `REQ021`'s TPG guard reads this field directly rather than inferring it.

**US-TEL-06** — As an Accountant, I want a consultation-fee invoice issued for every teleconsultation, so that tele visits are billed identically to in-person ones.
- PRD refs: FR-TEL-06
- Priority: P1
- Acceptance criteria: every completed teleconsultation produces an invoice through the same billing path as `REQ023`, not a separate ad-hoc mechanism.

### Epic: Escalation

**US-TEL-07** — As a clinician on a video call, I want a one-click "advise in-person visit" action that converts the encounter and books a physical appointment, so that a case needing hands-on examination doesn't require the patient to separately re-book from scratch.
- PRD refs: FR-TEL-07
- Priority: P1
- Acceptance criteria: given the escalation action is used, a new in-person appointment is created and linked to the originating teleconsultation encounter, pre-filled with the same patient/clinician/reason.

## Data model impact

- `Encounters` (from `REQ020`) gains `consultation_mode` (`video|audio|text`) and a link to a `TelemedicineSession` table: `id`, `encounter_id`, `join_token`, `valid_from`, `valid_to`, `recording_consent_at`, `recording_ref`.
- WebRTC signalling can reuse the existing `graphql-ws`/PubSub real-time infrastructure for session-state coordination, avoiding a second real-time transport.

## Non-functional notes

Recording storage, if used, must follow the same India-region, encrypted-at-rest pattern already established for other file storage (per `CLAUDE.md`'s AWS `ap-south-1` decisions) — do not introduce a new storage vendor for this feature alone.

## Open questions

None raised in PRD §19 specific to this module.
