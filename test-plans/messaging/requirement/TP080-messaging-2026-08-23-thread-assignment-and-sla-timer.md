---
id: TP080
type: requirement
feature: messaging
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ050
related: [PLAN053]
---

# TP080 — Test plan: thread assignment and SLA timer

Direct test-plan against an already-existing (if previously undocumented)
implementation, written while backfilling and fixing a real defect —
suggestion stage skipped per `CLAUDE.md`'s working loop step 4.

## Unit — `messages.service.spec.ts`, `describe('assignThread (REQ043)')`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | Caller is not a participant of the thread | `assignThread` called | `NotFoundException` |
| TC-02 | Caller is a participant; assignee id doesn't resolve to any real `UserProfiles` row | `assignThread` called | `NotFoundException` |
| TC-03 | Caller is a participant; assignee exists but belongs to a **different** `client_org_id` than the thread | `assignThread` called | `NotFoundException('Assignee not found')` — the exact same rejection as TC-02, never confirming the assignee exists in another org |
| TC-04 | First assignment (thread's `sla_due_at` is null) | `assignThread` called | `MessageThreads.update` sets `assigned_to_user_id` and a real `sla_due_at` (~24h out); the assignee is upserted as a `MessageParticipants` row |
| TC-05 | Reassignment (thread already has a real `sla_due_at`) | `assignThread` called | `sla_due_at` is passed through unchanged, not recomputed |

## Regression

| Case | Given | When | Then |
|---|---|---|---|
| TC-06 | Every pre-existing case in `messages.service.spec.ts` | Suite run | Still green |
| TC-07 | Full backend unit suite | `npx jest --maxWorkers=2` | Green except the one pre-existing, unrelated `@nestjs/schedule` failure |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-08 | `npx prisma generate` | Regenerates cleanly against the already-live schema/migration |
| TC-09 | `npx tsc --noEmit` | No new errors |
| TC-10 | `npx eslint src/messages` | 0 errors, 0 new warnings |

## Deliberately not covered

No live GraphQL/e2e run of `assignThread` against a real database this
session — the fix is a pure service-layer authorization check, fully
exercised by TC-01–TC-05 against the real Prisma-generated types (via
TC-08's regenerate step), and the feature's own frontend wiring
(`assignThreadMutation`, the assignee picker) was already live and
untouched by this fix.
