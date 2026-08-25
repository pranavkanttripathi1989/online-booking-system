---
id: TP132
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN105
related: [REQ074]
---

# TP132 — Test plan for the `threads()` N+1 fix (F-15)

## `messages.service.spec.ts` (extended)

| # | Case | Expected |
|---|---|---|
| 1 | 2 threads | `messageParticipants.findMany` called exactly twice, not once per thread |
| 2 | Second call's shape | `where: {thread_id: {in: [threadIds]}}` |
| 3 | Result | Both threads still returned correctly |

## Full-suite gate (Hard Rule 3)

```
cd backend && npx jest --maxWorkers=2 && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
```

## Live verification

Real `threads` query as a real caller with 2 real threads.
