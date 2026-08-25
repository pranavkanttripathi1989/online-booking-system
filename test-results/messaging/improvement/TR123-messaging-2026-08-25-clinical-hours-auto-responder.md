---
id: TR123
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP124
related: [REQ070, PLAN097]
---

# TR123 — Results for the clinical-hours auto-responder (REQ070)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` on
`master`, as part of an 8-slice batch.

## Unit

`org-settings.service.spec.ts`: 32/32 pass (8 new). `messages.service.spec.ts`:
42/42 pass (9 new, plus 1 pre-existing test's assertion fixed — see
`PLAN097`). Full backend suite (run once at the end of the batch):
**84 suites / 1293 tests**, all passing. Integration: **4 suites / 369
tests**, all passing. `eslint`: 0 errors. `tsc --noEmit`: clean.

## Live verification

Confirmed the full flow over the real GraphQL endpoint:

1. `updateMyOrgClinicalHours` set 09:00–18:00 IST + a real reply message
   for the "MG Road Clinic" org (real time was ~22:00 IST, outside the
   window).
2. `patient@medibook.dev` created a real thread with
   `manager@medibook.dev` as the sole other participant —
   `createThread`'s own `thread_type` inference correctly returned
   `patient_clinic`.
3. `assignThread` (as the manager) assigned the thread to themself.
4. The patient sent a message — the returned thread's message list
   showed a real, immediate reply from "Sarah Manager" with the
   configured text.
5. The patient sent a second message immediately after — no second
   auto-reply appeared, confirming the burst-suppression check.
6. Cleanup: `updateMyOrgClinicalHours` reset all 3 fields to `null` via
   real mutations (confirming the explicit-null-clears convention works
   live, not just in the unit suite). The thread and its 4 messages were
   left in place as new test residue, matching this codebase's own
   convention.

## Commits

See the commits immediately following this test-results doc in `git log`.
