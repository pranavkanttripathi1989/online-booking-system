---
id: TP108
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN081
related: [REQ058]
---

# TP108 — Test plan: department/branch-scoped threads, attachments, and canned replies

Skipping the test-suggestion stage per CLAUDE.md's conditional rule —
department/clinic scoping extends `createThread()`'s already-proven
pattern, attachments copy `attachments.controller.ts`'s already-proven
upload shape verbatim, and canned replies are routine org-scoped CRUD.
Going straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `createThread` — department outside the caller's org | Rejected via `assertDepartmentInScope` |
| 2 | `createThread` — clinic outside the caller's org | Rejected |
| 3 | `createThread` — `department_id` given | Every department member auto-added as a participant; `clinic_id` derived from the department |
| 4 | `createThread` — `clinic_id` given, no department | Every clinic member auto-added as a participant |
| 5 | `createThread` — a scoped member already an explicit participant | Not duplicated |
| 6 | `departmentThreads` — department outside the caller's org | Rejected |
| 7 | `departmentThreads` — happy path | Lists every thread for the department regardless of the caller's own participation |
| 8 | `cannedReplies()` | Scoped to the caller's own org |
| 9 | `createCannedReply` — org-less caller | Rejected |
| 10 | `createCannedReply` — happy path | Stamps the caller's own org and creator id |
| 11 | `updateCannedReply` — cross-org reply | Rejected, never confirms it exists |
| 12 | `deleteCannedReply` — happy path | Soft-deletes (`is_deleted: true`) |
| 13 | `createMessageAttachment` — nonexistent message | Rejected |
| 14 | `createMessageAttachment` — caller not a participant of the message's thread | Rejected |
| 15 | `createMessageAttachment` — happy path | Attachment row created, `uploaded_by_id` stamped from the caller |
| 16 | Tenancy matrix — `messages` domain's new `cannedReplies` query | Own-org-only visibility enforced; `patient` role rejected |

## Out of scope

`US-MSG-04` (auto-responder), `US-MSG-05` (clinical-record linkage),
non-clinician staff department membership resolution, frontend UI
(backend-only per this batch's confirmed direction).
