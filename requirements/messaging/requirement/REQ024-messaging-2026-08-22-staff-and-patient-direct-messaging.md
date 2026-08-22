---
id: REQ024
type: requirement
feature: messaging
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: null
related: [REQ025]
---

# Direct messaging: staff↔staff threads and patient↔clinic inbox with SLA

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M11 — Messaging & Notifications**, specifically the direct-messaging half (`FR-MSG-06`–`09`). The transactional-notification half is scoped separately in `REQ025` — the PRD itself frames these as *"two distinct systems that share one delivery layer."*

## Current state vs. PRD ambition

A real `messages` backend module already exists (`backend/src/messages`, 175 lines, 13 tests) with `MessageThreads`/`MessageParticipants`/`Messages` models and a real `graphql-ws` subscription (`messageReceived`). This is a genuine head start — the PRD's core ask (threads, participants, real-time delivery) is architecturally already present.

Gaps against the PRD's specific direct-messaging requirements:

1. **No branch/department scoping or file attachments on staff threads** (`FR-MSG-06`) — threads today don't distinguish staff-internal from patient-facing, and there's no attachment support.
2. **No shared-inbox routing for patient messages** (`FR-MSG-07`) — a patient message today goes into a generic thread; the PRD wants assignment, an SLA timer, canned replies, and escalation to a clinician, which is a helpdesk-shaped workflow layered on top of the existing thread model, not a new messaging transport.
3. **No clinical-safety guardrails** (`FR-MSG-08`) — no "not for emergencies" notice, no configurable clinical-hours auto-responder.
4. **Clinical messages aren't linked into the medico-legal record** (`FR-MSG-09`) — a message containing clinical advice should be attachable to the patient record and exportable as part of it; today messages live entirely outside `REQ020`'s encounter/timeline model.

## Gap classification

- **Extend existing:** the existing `MessageThreads`/`Messages` model and real-time subscription infrastructure is the correct foundation for everything in this requirement — no new transport is needed, only new fields (thread type, SLA metadata, patient-record linkage) and new UI (shared inbox, canned replies).
- **Net-new:** SLA timer and assignment workflow; canned replies; emergency-notice guardrail and clinical-hours auto-responder; the encounter-linkage mechanism.

## Phase assignment

PRD Phase: **V1 GA (P1)** in full, matching the PRD's own priority tags on `FR-MSG-06`–`09`.

## Dependencies

- **Requires:** none beyond the existing `messages` module.
- **Blocks:** `REQ020`'s patient timeline should include linked clinical messages once `FR-MSG-09` is built — sequence that field addition to land alongside this requirement, not as a later retrofit.

## User stories

### Epic: Staff↔staff messaging

**US-MSG-01** — As a staff member, I want 1:1 and group threads scoped to my branch/department with file attachments and mentions, so that internal coordination doesn't spill into a personal WhatsApp group.
- PRD refs: FR-MSG-06
- Priority: P1
- Acceptance criteria: given a group thread scoped to a department, only members of that department (or an Org Admin) can see it; a message can be linked to a specific patient/appointment context for reference without duplicating the message into that patient's clinical record unless explicitly flagged as clinical (see `US-MSG-04`).

### Epic: Patient↔clinic inbox

**US-MSG-02** — As a Front Desk staff member, I want incoming patient messages routed to a shared inbox with assignment and an SLA timer, so that no patient question sits unanswered because "someone else probably saw it."
- PRD refs: FR-MSG-07
- Priority: P1
- Acceptance criteria: given a new patient message, it lands unassigned in the shared inbox with a visible SLA countdown; once assigned, the countdown and ownership are visible to the whole team, and an unassigned message past its SLA is escalated.

**US-MSG-03** — As front-desk staff, I want canned replies for common questions, so that routine responses don't need to be typed fresh every time.
- PRD refs: FR-MSG-07
- Priority: P1
- Acceptance criteria: given a saved canned reply, inserting it into the compose box populates the message body, editable before send.

### Epic: Clinical safety and record linkage

**US-MSG-04** — As a patient messaging the clinic, I want a clear notice that messaging isn't for emergencies, so that I know to call or go to a hospital for anything urgent.
- PRD refs: FR-MSG-08
- Priority: P1
- Acceptance criteria: given the patient-facing message composer, an emergency instruction is always visible, not just shown once on first use; outside configured clinical hours, an auto-responder confirms the message was received and states expected response time.

**US-MSG-05** — As a clinician giving clinical advice over messaging, I want that exchange attached to the patient's record, so that it's part of the medico-legal history, not lost in a separate messaging silo.
- PRD refs: FR-MSG-09
- Priority: P1
- Acceptance criteria: given a message thread flagged as containing clinical advice, it appears on the patient's timeline (`REQ020` US-EMR-07) and is included in any export of that patient's full medico-legal record.

## Data model impact

- `MessageThreads` gains `thread_type` (`staff_internal|patient_clinic`), `assigned_to`, `sla_due_at`, `is_clinical`.
- New `CannedReplies` table scoped per org.
- New `MessageAttachments` table (currently no attachment support at all).
- A join from `Messages` (or the parent thread, if flagged clinical) into the patient's timeline query used by `REQ020`.

## Non-functional notes

None beyond what the existing `messages` module already satisfies (real-time delivery, tenant scoping).

## Open questions

None raised in PRD §19 specific to this module.
