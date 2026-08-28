---
id: BUG037
type: bug
feature: catalog-master-data
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG037 — `/manager/rooms`: every real room renders "Room Room 3A", and its room type never resolves to a name

## Source

Found live during a Chrome-DevTools-driven manager-role QA sweep. Both
real seeded rooms rendered as "Room Room 3A" and "Room Room 5B."

## What's wrong, exactly

**Double "Room" prefix.** `frontend/src/pages/manager/rooms/index.jsx`
line 494: `` Room {room.room_number} ``. The real backend's own
`room_number` field already stores the full display name — confirmed
via the live `GetRoomsPaginated` response:
`{"room_number":"Room 3A", ...}`. This page's own mock fallback data
(line 111: `room_number: '101'`) shows what the author actually
expected this field to look like — a bare identifier the template
literal would correctly prefix with "Room ". The real data doesn't
match that shape, so every real room shows the word "Room" twice.

**`roomTypeName` never resolves.** The same response has
`"room_type":"consultation"` (a real, non-null code) but
`"roomTypeName":null` — even though the paired `GetRoomsMetadata` query
(run on the same page load) returns a real room type named
"Consultation Room" for this org. The card visibly falls back to
showing the raw code ("consultation") under the room number instead of
the human-readable name, because the field meant to carry it is never
actually populated.

## Acceptance criteria

- A real room's card shows its name once, not twice — either drop the
  hardcoded "Room " prefix (if `room_number` is meant to be the full
  display string) or fix whichever layer produces `room_number` so it
  holds a bare identifier consistently, matching this page's own
  mock-data assumption.
- `roomTypeName` resolves to the real room type's name (e.g.
  "Consultation Room") for a room whose `room_type` code has a match,
  rather than staying `null` and falling back to the raw code.
