---
id: CTX-messaging-2026-08-25-req071
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ071
related: [PLAN098, TP125, TR124]
---

# messaging — Message-thread events on the patient timeline (2026-08-25)

One of an 8-slice backend batch. Closes `REQ024`'s own `US-MSG-05`:
`encounters.service.ts#patientTimeline()` now includes the patient's own
`patient_clinic` message threads as `message_thread` events, alongside
appointments/encounters/prescriptions.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ071 | [Message-timeline linkage](../../requirements/messaging/improvement/REQ071-messaging-2026-08-25-message-timeline-linkage.md) |
| implementation-plans | PLAN098 | [implementation plan](../../implementation-plans/messaging/improvement/PLAN098-messaging-2026-08-25-message-timeline-linkage.md) |
| test-plans | TP125 | [test plan](../../test-plans/messaging/improvement/TP125-messaging-2026-08-25-message-timeline-linkage.md) |
| test-results | TR124 | [results](../../test-results/messaging/improvement/TR124-messaging-2026-08-25-message-timeline-linkage.md) |

## A real adjacent bug found and fixed, not originally scoped

`encounters.service.ts#assertPatientAccess()`'s patient-role branch used
a strict own-`patient_id` check — the exact same bug class `REQ065`
closed the same day for `prescriptions`/`test-results`. Found by reading
the method in full before extending `patientTimeline()`, fixed the same
way (`PatientsService.ownAndDependantPatientIds`).

## Live verification

The dev DB had zero linked patient accounts at all. Temp-linked
`patient@medibook.dev` to the real seeded Anita Sharma `Patients` row,
confirmed `patientTimeline` returned a real `message_thread` event
(reusing `REQ070`'s own live thread fixture), reverted the link.
