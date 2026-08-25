---
id: TR124
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP125
related: [REQ071, PLAN098]
---

# TR124 — Results for message-thread timeline linkage (REQ071)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` on
`master`, as part of an 8-slice batch.

## Unit

`encounters.service.spec.ts`: 38/38 pass (4 new). Full backend suite
(run once at the end of the batch): **84 suites / 1293 tests**, all
passing. Integration: **4 suites / 369 tests**, all passing. `eslint`:
0 errors. `tsc --noEmit`: clean.

## Live verification

The dev DB had zero `UserProfiles` rows linked to a `Patients` row at
all. Temp-linked `patient@medibook.dev` to the real seeded Anita Sharma
`Patients` row (direct SQL, matching `REQ065`'s own established fixture
pattern), then queried `patientTimeline(patient_id: <Anita's id>)` as
`manager@medibook.dev`. It returned a real `message_thread` event
(`summary: "Ok, I will wait then."`) — the exact last message of the
real thread created for `REQ070`'s own live pass. Confirms both the
`UserProfiles` resolution by `patient_id` and the `participants.some(...)`
thread lookup work correctly end to end, not just against a mocked
Prisma client. The account link was reverted to `NULL` immediately
after; the underlying thread/messages were left in place as `REQ070`'s
own residue, not duplicated.

## Commits

See the commits immediately following this test-results doc in `git log`.
