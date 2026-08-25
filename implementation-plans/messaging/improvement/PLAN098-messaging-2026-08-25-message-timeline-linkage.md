---
id: PLAN098
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ071
related: []
---

# PLAN098 — Implementation plan for message-thread timeline linkage

No schema change. All changes in `backend/src/encounters/`.

## Changes

**`encounters.service.ts`**: constructor now also injects
`PatientsService` (`encounters.module.ts` gained `PatientsModule` to its
`imports`, the same pattern `REQ065` used for `prescriptions`/
`test-results`).

`assertPatientAccess()`'s patient-role branch rewritten from
`patientId !== user.patient_id` to
`const allowedIds = await this.patientsService.ownAndDependantPatientIds(user);
if (!allowedIds.includes(patientId)) throw ...` — the exact fix `REQ065`
applied to two other services, found here by reading this method in full
before extending `patientTimeline()`, not originally scoped.

`patientTimeline()`: after assembling the existing appointment/
encounter/prescription events, resolves
`const patientUserProfile = await this.prisma.userProfiles.findFirst({where:
{patient_id: patientId, is_deleted: false}})`. If one exists, queries
`messageThreads.findMany({where: {thread_type: 'patient_clinic',
participants: {some: {user_id: patientUserProfile.id}}}})`, mapped to
`{type: 'message_thread', ...}` events merged into the returned,
chronologically-sorted array.

## Testing (see `TP125`)

`encounters.service.spec.ts` extended — added a `PatientsService` mock
(default mirrors "no dependants configured", so every pre-existing test
keeps passing unchanged) and `userProfiles.findFirst`/
`messageThreads.findMany` to the Prisma mock. 4 new cases: dependant
access allowed via the widened check, no-linked-login patient skips the
message lookup entirely, a real thread appears as a `message_thread`
event, and a `TS18048` strict-null-check fix (`result.find(...)`'s
return typed `any` since the test asserts a property on it after a
truthy check TypeScript can't narrow through).

## Live verification

Confirmed over the real GraphQL endpoint. The dev DB had zero
`UserProfiles` rows with a `patient_id` link at all (an even emptier
starting state than expected), so this reused `REQ070`'s own
already-created real `patient_clinic` thread (`patient@medibook.dev` ↔
`manager@medibook.dev`) by temp-linking `patient@medibook.dev` to the
real seeded Anita Sharma `Patients` row (direct SQL — no self-serve
"link my account" mutation exists, matching `REQ065`'s own established
fixture pattern), then querying `patientTimeline(patient_id: <Anita's
id>)` as the manager. It returned a real `message_thread` event with the
correct summary (the thread's last message). The link was reverted to
`NULL` immediately after — the thread itself and its messages were left
in place as `REQ070`'s own test residue, not duplicated here.
