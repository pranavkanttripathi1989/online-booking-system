---
id: TR079
type: requirement
feature: messaging
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP080
related: [REQ050, PLAN053]
---

# TR079 — Results: thread assignment and SLA timer

Executed 2026-08-23 in an isolated worktree, against a checkout of `master`
at `742179d` (the commit that shipped the feature without these docs).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `rejects a caller who is not a participant of the thread` |
| TC-02 | pass | `rejects an assignee that does not exist` (fixture corrected to supply a valid thread so this genuinely exercises the assignee-not-found branch, not the thread-not-found one) |
| TC-03 | pass | `rejects an assignee who belongs to a different org than the thread, never confirming they exist` — new test, proves the fix |
| TC-04 | pass | `sets assigned_to_user_id and starts the SLA clock on first assignment` |
| TC-05 | pass | `does not reset an already-running SLA clock on reassignment` |
| TC-06 | pass | Full `messages.service.spec.ts`: 18/18 pass |
| TC-07 | pass | Full backend suite: 760/760 pass; 1 suite fails to compile on `@nestjs/schedule` (confirmed pre-existing — present in `package.json`, absent from this host's `node_modules`, unrelated to this or any prior slice this session) |
| TC-08 | pass | `npx prisma generate` — regenerated cleanly; this was in fact **required**, not optional: the suite failed to even compile beforehand (`assigned_to_user_id`/`sla_due_at` unknown on the generated `MessageThreads` types), confirming the client committed in `742179d` was never regenerated after the migration |
| TC-09 | pass | `npx tsc --noEmit` — 0 new errors |
| TC-10 | pass | `npx eslint src/messages` — 0 errors, 0 warnings |

## What this proves

A real, exploitable cross-tenant authorization gap existed in already-live
(committed, running) code: `assignThread` would silently succeed for an
assignee in a different organization, adding that person as a
`MessageParticipants` row with read access to the thread's messages. TC-03
proves the fix rejects this with the same generic error a nonexistent
assignee gets, and TC-06/TC-07 prove the fix didn't regress the feature's
existing, already-correct behavior (first-assignment SLA start, no reset
on reassignment).
