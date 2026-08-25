---
id: CTX-appointments-2026-08-25-req065
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ065
related: [PLAN092, TP119, TR118]
---

# appointments — Dependant self-scoping for prescriptions and test results (2026-08-25)

Closes two of the three domains flagged in `REQ018`'s own residue note
(`CLAUDE.md`'s "What's still open" #3): `prescriptions.service.ts`'s
`patientPrescriptions`/`prescription`, and `test-results.service.ts`'s
`findAll`/`findOne`, both widened from a strict own-`patient_id` check
to the same "own or dependant" definition `patients.service.ts` and
`appointments.service.ts` already use
(`PatientsService.ownAndDependantPatientIds`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ065 | [Dependant self-scoping for prescriptions and test results](../../requirements/appointments/improvement/REQ065-appointments-2026-08-25-dependant-self-scoping-for-prescriptions-and-test-results.md) |
| implementation-plans | PLAN092 | [implementation plan](../../implementation-plans/appointments/improvement/PLAN092-appointments-2026-08-25-dependant-self-scoping-for-prescriptions-and-test-results.md) |
| test-plans | TP119 | [test plan](../../test-plans/appointments/improvement/TP119-appointments-2026-08-25-dependant-self-scoping-for-prescriptions-and-test-results.md) |
| test-results | TR118 | [results](../../test-results/appointments/improvement/TR118-appointments-2026-08-25-dependant-self-scoping-for-prescriptions-and-test-results.md) |

## What shipped

`prescriptions.module.ts`/`test-results.module.ts` both now import
`PatientsModule`; both services inject `PatientsService` and call its
existing `ownAndDependantPatientIds(user)` instead of a scalar
`patient_id` equality check. Backend-only, no schema change, no frontend
change (the GraphQL contract shape is unchanged — only who is allowed to
see what).

## The third flagged domain, `messages.service.ts`, was reclassified, not fixed

Re-reading the file before touching it found the residue note's
assumption didn't hold: `MessageThreads`/`Messages` have no `patient_id`
column at all — access is scoped by `MessageParticipants.user_id`, a
real login account a dependant categorically doesn't have. Logged as
`context/open-questions.md` #16 (a genuine product/schema decision, not
a bug) rather than force-fitting a mechanical widening that doesn't
apply to this domain's data model.
