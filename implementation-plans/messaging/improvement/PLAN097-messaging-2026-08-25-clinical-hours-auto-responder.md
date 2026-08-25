---
id: PLAN097
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ070
related: []
---

# PLAN097 — Implementation plan for the clinical-hours auto-responder

## Schema

`ClientOrganizations` gained 3 nullable columns: `clinical_hours_start
String?`, `clinical_hours_end String?`, `clinical_hours_auto_reply_message
String?`. No new table — reuses the existing org row, the same pattern
as every other `org-settings.service.ts` sub-feature (communication
settings, booking policies, security settings, branding).

## Changes

**`org-settings.input.ts` / `entity.ts` / `service.ts` / `resolver.ts`**:
`UpdateOrgClinicalHoursInput` (`HH:MM` regex validation on both time
fields), `toClinicalHours()`, `myClinicalHours()`, `updateMyClinicalHours()`
— matches `toBranding()`/`updateMyBranding()`'s own shape exactly,
including the explicit-null-clears / omitted-leaves-untouched convention
(the pass-through `data: {field: input.field}` write relies on Prisma's
own `undefined`-vs-`null` distinction, not custom logic).

**`messages.service.ts`**: `maybeSendClinicalHoursAutoReply(thread,
user)` — called from `sendMessage()` after the real message/notification
flow. Guard chain, in order: thread exists and is `patient_clinic` →
sender has the `'patient'` role → thread has `assigned_to_user_id` → org's
3 clinical-hours fields are all set → **reuses
`notificationTrigger.isWithinQuietHours(clinical_hours_start,
clinical_hours_end, now)`** against the clinical-hours window itself
(returning `true` means "now falls inside business hours", which
suppresses the reply) rather than writing a second time-window function
— the existing helper's wraps-midnight logic is exactly what a clinical-
hours window needs too. Burst suppression: fetches the last 2 messages
(`take: 2, orderBy: {sent_at: 'desc'}`) — `lastTwo[0]` is the message
`sendMessage()` just created, `lastTwo[1]` is whatever preceded it; if
that's already from the assignee, skip.

## Testing (see `TP124`)

`org-settings.service.spec.ts` extended — 8 new cases (scoping,
undefined-vs-null field mapping, the explicit-null-clears / omitted-
leaves-untouched pair, DB-error handling). `messages.service.spec.ts`
extended — a fixed the exact pre-existing "uses the caller org when
present" test's assertion (was an exact-object match that broke once
`thread_type` became a real, always-populated field on every
`createThread` call — see this doc's own note below), plus 7 new cases
for the auto-responder's full guard chain and 2 for `inferThreadType`
(a `REQ058` addition this slice's own `createThread` change now also
populates unconditionally, not previously covered directly).

**A real pre-existing test broke and was fixed, not silently left red**:
`createThread`'s own `thread_type` field (from `REQ058`, already
shipped) was always `undefined` in every test that didn't explicitly
set up a patient participant — `inferThreadType()`'s own `userProfiles
.findFirst` mock defaulted to `undefined` → `'staff_internal'`, a real
string, not `undefined`. One pre-existing test asserted the exact
`tx.messageThreads.create` call object without `objectContaining`,
which broke the instant `thread_type` became a real value on every call
rather than sometimes-absent. Fixed by loosening that one assertion to
`objectContaining` — the fields it actually cares about (`client_org_id`,
`last_message`, `last_activity`) are unchanged.

## Live verification

Real thread created by `patient@medibook.dev`, assigned to
`manager@medibook.dev` via `assignThread`, clinical hours set to
09:00–18:00 IST (current time was outside that window). Patient's
message triggered a real auto-reply from the assigned manager; a second
immediate message did not trigger a second one. Clinical-hours config
reverted to `null`/`null`/`null` afterward (a shared org-level setting);
the thread and its messages were left in place as new test residue.
