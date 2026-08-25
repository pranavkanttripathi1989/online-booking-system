---
id: PLAN105
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ074
related: []
---

# PLAN105 — Implementation plan for the `threads()` N+1 fix (F-15)

No schema change. All changes in `backend/src/messages/messages.service.ts`.

## Changes

Extracted `mapParticipantRows(rows)` from the body of `participantsFor()`
(pure row-shaping, no query). `participantsFor(threadId, preloaded?:
Map<string, any[]>)` uses `preloaded?.get(threadId)` when given, else
its original per-thread `findMany`. `toGraphQL(thread, currentUserId,
includeMessages, preloadedParticipants?)` passes the map through to
`participantsFor`, and also derives `myParticipant` (for `unread_count`)
from `preloadedRows.find(r => r.user_id === currentUserId)` when a
preloaded map is present, instead of a second per-thread `findUnique`.

`threads()`: after fetching the caller's own participations, collects
`threadIds`, issues one `messageParticipants.findMany({where:{thread_id:
{in: threadIds}}}, include: {...})`, groups into a `Map<string, any[]>`
by `thread_id`, and passes it to every `toGraphQL()` call in the
`Promise.all`.

`assigneeFor()` (the small per-thread `assigned_to_user_id` lookup) is
deliberately **not** batched — smaller, not named in the original
finding, and only fires when a thread actually has an assignee (often
null). Left as a known, minor residual N+1, not silently claimed fixed.

## Testing (see `TP132`)

New test in `messages.service.spec.ts`'s existing `threads` describe
block: for 2 threads, asserts `messageParticipants.findMany` is called
exactly twice (the caller's own participations, then the batched
all-participants query) and the batched call's `where` shape is
`{thread_id: {in: [...]}}`.

## Live verification

`threads` query against the real dev DB (a manager account with 2 real
threads) — returned correct participants and `unread_count` per thread,
confirming the batched path produces identical output to the old
per-thread path.
