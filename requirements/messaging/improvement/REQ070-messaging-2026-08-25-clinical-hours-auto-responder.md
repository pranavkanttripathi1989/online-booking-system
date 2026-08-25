---
id: REQ070
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ024
related: []
---

# REQ070 — Clinical-hours auto-responder

## Source

Part of an 8-slice batch, scoped from `REQ024`'s own `US-MSG-04` — "as a
patient messaging outside clinic hours, I want an automatic
acknowledgement so I know my message was received and when to expect a
real reply." `REQ024`'s own P0 pass (department/branch-scoped threads,
attachments, canned replies — shipped as `REQ058` in Phase G+3) explicitly
deferred `US-MSG-04`/`US-MSG-05`.

## Current-state gap

`org-settings.service.ts` had no clinical-hours concept at all.
`messages.service.ts#sendMessage()` had no notion of time-of-day or
auto-reply — every message just landed with a real-time notification to
the other participants, day or night.

## What shipped

`ClientOrganizations` gained `clinical_hours_start`/`clinical_hours_end`
(`HH:MM`) and `clinical_hours_auto_reply_message` — all three optional,
and all three must be configured for the feature to activate at all (a
half-configured org gets no auto-replies, not a broken one).
`myOrgClinicalHours` query / `updateMyOrgClinicalHours` mutation
(manager+) manage them, following this codebase's own explicit-null-
clears / omitted-leaves-untouched convention.

`messages.service.ts#sendMessage()` calls a new
`maybeSendClinicalHoursAutoReply()` after the real message and real
notifications are sent: fires only when the thread is `patient_clinic`,
the sender is a `'patient'`, the thread has a real assigned staff member
(no fabricated system sender — matching `REQ065`'s own precedent), and
the org's clinical hours are fully configured and the current time falls
outside them. It sends **at most once per burst** — if the message
immediately before the one just sent was already the auto-reply, it's
skipped, so a patient sending several messages in a row overnight gets
one notice, not one per message.

## User stories

- As a patient messaging the clinic after hours, I get an immediate
  automated acknowledgement telling me when to expect a real reply.
- As clinic staff, I don't have to manually reply "we're closed" to
  every after-hours message.

## Acceptance criteria (Given/When/Then)

- **Given** clinical hours 09:00–18:00 IST are configured and a patient
  messages at 22:00 IST, **when** the thread has an assigned staff
  member, **then** an auto-reply is sent from that staff member.
- **Given** the same setup, **when** the patient sends a second message
  immediately after, **then** no second auto-reply is sent.
- **Given** clinical hours are not configured (any of the three fields
  missing), **then** no auto-reply is ever sent.
- **Given** a message sent during configured clinical hours, **then** no
  auto-reply is sent.

## Traceability

`REQ024` `US-MSG-04`. `FR-MSG-05` (PRD).
