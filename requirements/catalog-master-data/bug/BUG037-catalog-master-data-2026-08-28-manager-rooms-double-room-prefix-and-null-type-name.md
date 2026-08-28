---
id: BUG037
type: bug
feature: catalog-master-data
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: []
---

## Resolution (2026-08-28, `PLAN205`)

**Double prefix**: dropped the hardcoded `Room {room.room_number}` in
favor of `{room.room_number}` — confirmed `room_number` already holds
the full display string, and the edit form's own "Room Number" field
round-trips it verbatim, so a separate prefix was never correct once
real data (vs. the page's own bare-number mock assumption) reached it.

**`roomTypeName` null**: root-caused via a direct DB check, not
guessed — the two real seeded Rooms rows stored the literal string
`'consultation'` in `room_type`, not a real `room_types.id` (confirmed
the real create/edit form's own `Select` correctly sends `t.id`
already, so this was pre-existing corrupted data, not a live-reachable
code bug). `rooms.service.ts#resolveTypeNames()`'s id-based lookup was
already correct and needed no code change. Fixed with a one-time
backfill migration (`20260829000000_fix_room_type_backfill`) —
narrowly scoped to the exact known-corrupted value, matching this
org's own single real `room_types` row ("Consultation Room") — applied
via `prisma migrate deploy`, this codebase's own sanctioned path for a
controlled, reviewable data correction (not an ad-hoc live `UPDATE`).

Live-verified as `admin@medibook.dev`: both real rooms now show "Room
3A"/"Room 5B" (once, not doubled) and "Consultation Room" (resolved,
not the raw `consultation` code). See `TR225`.

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
