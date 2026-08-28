---
id: BUG043
type: bug
feature: messaging
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG043 — The sidebar "Messages" unread badge is fabricated from `MockStore`, unconditionally, for every account

## Source

Found live during a Chrome-DevTools-driven staff-role QA sweep, logged
in as `receptionist@medibook.dev` (Jamie Reception). The sidebar showed
"Messages **3**" (a red unread-count badge), but opening `/messages`
showed "No conversations found" — a genuine, real, empty result:
`GetThreads` returned `{"data":{"threads":[]}}` over the network, no
error, `total` effectively zero.

## What's wrong, exactly

`frontend/src/layouts/AppShell.jsx`:

```js
// line 1006
const [msgUnreadCount, setMsgUnreadCount] = useState(
  () => MockStore.getStore().message_threads.filter((t) => (t.unread_count ?? 0) > 0).length,
)
...
// line 1063
useEffect(() => {
  return MockStore.subscribe(() => {
    const count = MockStore.getStore().message_threads.filter((t) => (t.unread_count ?? 0) > 0).length
    setMsgUnreadCount(count)
  })
}, [])
...
// line 1032
const navItems = rawNavItems.map((item) => (item.path === '/messages' ? { ...item, badge: msgUnreadCount } : item))
```

Both the initial value and every subsequent update of the sidebar's
"Messages" badge come exclusively from `MockStore` — never from the
real `messages` GraphQL domain (`GetThreads`/`threads`, confirmed real,
wired, and correctly returning `[]` for this account over the network).
This isn't a mock-on-error fallback (DATA-13's usual shape) — there is
no real-data path at all for this one badge; it is unconditionally
mock, for every account, regardless of whether that account has real
unread threads. The number shown (a static "3", matching `MockStore`'s
seed data) has no relationship to the signed-in user's real inbox
state.

Confirmed live: `unreadNotificationCount` (the separate, real,
correctly-wired bell-icon query) returned `0` in the same session, and
the real `threads` query returned `[]` — so a real, correct
implementation of this badge would show 0 or be hidden entirely, not
"3".

## Acceptance criteria

- The sidebar "Messages" badge derives its count from real data —
  either the existing `threads` query's own `unread_count` fields
  (already fetched by the Messages page itself) or a dedicated
  lightweight query, not `MockStore`.
- Live-verified: an account with zero real unread threads shows no
  badge (or a "0"/hidden badge, per whatever the chosen UI convention
  is), and an account with real unread threads shows the real count.
- `MockStore`'s `message_threads` subscription in `AppShell.jsx` is
  removed once the real wiring lands — it should not run in parallel
  with a real data source.
