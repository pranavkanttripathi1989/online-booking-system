---
id: PLAN205
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG030, BUG034, BUG037]
---

# PLAN205 — DPDP citation, percent formatting, and room-display fixes (BUG030, BUG034, BUG037)

Three small, independent findings from the 2026-08-28 QA sweep, batched
together for one verification pass since none shares a root cause with
another.

## BUG030 — GDPR → DPDP

`admin/Policies.jsx`: tab label, subtitle, retention description, main
compliance banner, and "Right to Erasure" title all changed from UK
GDPR/Data Protection Act 2018 to India's DPDP Act 2023. Two specific
article citations (`GDPR Art.20`, `GDPR Art.17`) were dropped rather
than replaced with a guessed DPDP section — flagged for legal counsel
review via an inline comment, not invented. `auth/login.jsx`'s
marketing bullet fixed the same way.

## BUG034 — unrounded percentages

New `formatPercent(value, decimals = 1)` in `utils/dateTime.js`,
alongside the existing `formatCurrency` (same file, same
display-boundary-formatting convention). Wired into
`manager/Dashboard.jsx`'s Clinician Utilization / Cancellation Rate
cards.

## BUG037 — double "Room" prefix, null room type name

Frontend: dropped the hardcoded `Room ` prefix — `room_number` already
holds the full display string. Backend: root-caused via a direct DB
check (not guessed) that the two real Rooms rows stored the literal
string `'consultation'` in `room_type` instead of a real
`room_types.id` — pre-existing corrupted data, not a live-reachable
code bug (the real create/edit form already sends `t.id` correctly).
Fixed with a one-time backfill migration
(`20260829000000_fix_room_type_backfill`), applied via `prisma migrate
deploy` — this codebase's sanctioned path for a controlled data
correction, not an ad-hoc live `UPDATE`.

## Testing

`utils/dateTime.test.js`: 3 new `formatPercent` tests (34/34 total
pass). `npx eslint` clean on all 4 touched frontend files (0 new
errors). Migration applied cleanly; live-verified via direct
`psql` query that both rows now hold the real `room_types.id`.

Live-verified against the real dev stack — see `TR225`.
