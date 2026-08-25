---
id: CTX-messaging-2026-08-25-req070
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ070
related: [PLAN097, TP124, TR123]
---

# messaging — Clinical-hours auto-responder (2026-08-25)

One of an 8-slice backend batch. Closes `REQ024`'s own `US-MSG-04`: a
patient messaging a `patient_clinic` thread outside the org's configured
clinical hours gets an automatic, at-most-once-per-burst reply from the
thread's real assigned staff member.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ070 | [Clinical-hours auto-responder](../../requirements/messaging/improvement/REQ070-messaging-2026-08-25-clinical-hours-auto-responder.md) |
| implementation-plans | PLAN097 | [implementation plan](../../implementation-plans/messaging/improvement/PLAN097-messaging-2026-08-25-clinical-hours-auto-responder.md) |
| test-plans | TP124 | [test plan](../../test-plans/messaging/improvement/TP124-messaging-2026-08-25-clinical-hours-auto-responder.md) |
| test-results | TR123 | [results](../../test-results/messaging/improvement/TR123-messaging-2026-08-25-clinical-hours-auto-responder.md) |

## A real pre-existing test fixed along the way

`createThread`'s `thread_type` field (from the earlier-shipped `REQ058`)
became an always-real value once this slice's own `inferThreadType()`
call was added unconditionally to `createThread`; one pre-existing test
asserted an exact `data` object without `objectContaining` and broke as
a direct, correct consequence. Fixed by loosening that one assertion —
see `PLAN097`.

## Live verification

Full live round trip: real thread, real assignment, real clinical-hours
config, a real auto-reply fired outside the window, burst suppression
confirmed on a second message, config reverted via explicit `null`.
