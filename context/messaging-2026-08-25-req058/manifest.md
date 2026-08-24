---
id: CTX-messaging-2026-08-25-req058
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ058
related: [REQ024, REQ050, PLAN081, TP108, TR107]
---

# messaging — REQ058: department/branch-scoped threads, attachments, and canned replies (2026-08-25)

Eighth and final slice in the 8-slice batch picked from `project-plans/`
this session (research cross-checked against real code — see
`queue-management-2026-08-25-req051`'s manifest for the full research
account).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ058 | [department/branch-scoped threads + attachments + canned replies](../../requirements/messaging/improvement/REQ058-messaging-2026-08-25-department-scoped-threads-attachments-canned-replies.md) |
| implementation-plans | PLAN081 | [implementation plan](../../implementation-plans/messaging/improvement/PLAN081-messaging-2026-08-25-department-scoped-threads-attachments-canned-replies.md) |
| test-plans | TP108 | [verification plan](../../test-plans/messaging/improvement/TP108-messaging-2026-08-25-department-scoped-threads-attachments-canned-replies.md) |
| test-results | TR107 | [verification results — pass, 80/80 suites](../../test-results/messaging/improvement/TR107-messaging-2026-08-25-department-scoped-threads-attachments-canned-replies.md) |

## What shipped

`MessageThreads` gains department/branch scoping via create-time
auto-participant-add (resolved through pre-existing
`UserProfiles.clinician_id`/`.clinic_id` columns, no new member-mapping
schema needed) rather than a dynamic read-time visibility rule —
`threads()`/`thread()` are completely unchanged, zero regression risk to
every thread that existed before this slice. A new
`departmentThreads()` oversight query covers the "or Org Admin" half of
the AC separately. New `MessageAttachments` (reuses
`attachments.controller.ts`'s exact upload pattern) and `CannedReplies`
(org-scoped, staff-only — deliberately excludes `'patient'`, unlike the
rest of this module).

## No real bugs found this pass — the batch's second "quiet" slice

Like `REQ054`, this final slice held on the first implementation pass.
Every fix pattern learned across the batch (optional tenancy-matrix
arguments, `isPlatformOperator`/`isSameOrg` semantics, Hard Rule 6
cross-domain FK validation) was applied proactively. The genuine design
decision — gating canned replies away from `'patient'` while leaving the
rest of messaging open to every role — was made deliberately during
design, not discovered via a failing test.

## Verification

Backend unit: 80/80 suites, 1213/1213 tests (was 80/1198). `eslint`/
`tsc --noEmit` clean. New `cannedReplies` tenancy-matrix `CASES` row.
Container restarted and confirmed a clean compile.

## This closes the 8-slice batch

All 8 slices (`REQ051`–`REQ058`, `PLAN074`–`PLAN081`, `TP101`–`TP108`,
`TR100`–`TR107`) are now committed. Per the user's own standing
instruction, the next step is a consolidated final verification run
across the whole batch, plus updating `project-plans/`,
`project-plans/technical-plans/`, and CLAUDE.md's own narrative section
with what shipped — not part of this bundle's own scope, tracked
separately.
