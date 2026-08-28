---
id: PLAN208
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG041, BUG043]
---

# PLAN208 — Sidebar Messages badge and patients mock-fallback fixes (BUG043, BUG041)

Two unrelated mock/fabricated-data findings, batched for one
verification pass.

## BUG043

`AppShell.jsx`'s `msgUnreadCount` was sourced entirely from `MockStore`
(initial state and a `MockStore.subscribe` effect), unconditionally,
for every account — not a fallback, there was no real-data path at
all. Replaced with a real, lightweight `useQuery(GET_THREADS_FOR_SHELL)`
against the same `threads` resolver `messages/index.jsx` already
uses, trimmed to `{id, unread_count}` and polling every 30s
(`DATA-12`'s cap). Removed the now-entirely-unused `import * as
MockStore`.

## BUG041

`patients/index.jsx`'s `useMock` condition
(`apiPatients.length === 0 && !loading`) fell back to hardcoded mock
patients on any genuine empty result, not just a real error — the
`DATA-13` shape already fixed once for `appointments/index.jsx`/
`calendar/index.jsx`. Changed to `!!error`, matching that precedent
exactly. The page's own real, contextual empty state
(`No patients match "..."` etc.) was already built and simply never
reachable before.

## Testing

`npx eslint` clean on both files (0 new errors). No new unit tests —
neither file has an existing test suite to extend; verified live
against the real dev stack instead.

Live-verified: `/messages` sidebar badge now reads a real "Messages 1"
(was a fabricated "Messages 3" on every account); `/patients` searching
for a string matching nothing now shows the real "No patients match"
empty state, not the fabricated mock list.
