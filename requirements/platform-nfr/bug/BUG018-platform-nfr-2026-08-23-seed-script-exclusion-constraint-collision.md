---
id: BUG018
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: [BUG017, BUG007, PLAN043]
---

# BUG018 — The new e2e seed script's own generated data collided with the exclusion constraints it was seeded against

Found while building and validating P1.5 (`PLAN043`, the isolated e2e stack).
`backend/prisma/seed-e2e.ts` generates 2,000 appointments at real volume —
directly into a database that, as of the same day's `BUG017`, now enforces
two Postgres `EXCLUDE USING gist` constraints
(`appointments_no_overlapping_booking` on `clinician_id`,
`appointments_no_overlapping_room_booking` on `room_id`). The seed script
predates neither constraint's existence conceptually, but its
slot-generation formula was written without them in mind, and both broke it
in two separate, sequential ways.

## Bug 1 — room-level collision

The original loop:

```javascript
for (let i = 1; i < APPOINTMENT_COUNT; i++) {
  const clinician = allClinicians[i % allClinicians.length];
  const dayOffset = (i % 91) - 30;
  const hour = 9 + (i % 8);
  // ... room_id = clinician's clinic's single room
  appointment_time: daysFromNow(dayOffset, hour, i % 2 === 0 ? 0 : 30),
}
```

cycles every `91 * 8 * 2 = 1,456` iterations — well inside `APPOINTMENT_COUNT
= 2000` — and every clinician at a given clinic shares that clinic's one
seeded room. Two different clinicians, same room, same repeating slot
formula: a guaranteed room-level exclusion violation, confirmed live via the
exact Postgres error (`23P01` on `appointments_no_overlapping_room_booking`,
wrapped in a `PrismaClientUnknownRequestError`) that crash-looped
`backend_e2e` on every startup.

**Fix**: replaced the cyclic formula with a per-room slot counter
(`nextRoomSlot()`) that tracks the next free `(dayOffset, hour, minute)`
triple *per room*, incrementing until it finds one not already claimed for
that room — guaranteeing no two appointments in the same room ever land on
the same slot, regardless of how many clinicians share it.

## Bug 2 — clinician-level collision, found immediately after fixing bug 1

Same error shape, now on `appointments_no_overlapping_booking` (the
clinician constraint) for Sarah Mitchell's id, at exactly the slot
(`roomA1`, day 0, 10:00) that a *separate*, manually-pushed appointment row
(Anita Sharma's fixture appointment, pushed into the array before the main
loop, specifically to match pre-existing e2e specs) already occupied. The
new per-room counter from bug 1's fix had no visibility into that manual
push — it happily re-derived the identical slot once its own counter cycled
back to a room/day/hour combination the manual row had already claimed.

**Fix**: seeded a `reservedRoomSlots: Set<string>` with the manual
appointment's own key (`` `${roomA1.id}|0|10|0` ``); `nextRoomSlot()` now
skips any counter-derived key present in that set, not just keys already
issued by the counter itself.

**The lesson, not just the fix**: a slot-collision guard that only tracks
its own generated output is not enough once *any* hand-placed fixture row
shares the same underlying resource. Any future seed script writing into a
constrained table needs one shared reservation set covering every insertion
path into that table, not per-loop bookkeeping.

## Bug 3 (smaller) — a stale `backend_e2e` container masked both fixes behind unrelated compile errors

After fixing bugs 1–2, `backend_e2e` failed to even reach the point of
running the seed: `nest start --watch` reported `Cannot find module
'helmet'` and two "property does not exist" errors on `AuditLogsCreateInput`
(`user_agent`, `outcome`). Root cause: `backend_e2e`'s anonymous
`node_modules` Docker volume is separate from the main `medibook_backend`
dev container's — this session's earlier `npm install helmet` and `npx
prisma generate` (for `BUG017`'s audit-log columns) had only ever run inside
the dev container, never propagated to `backend_e2e`. Anonymous volumes
persist across `--force-recreate` unless explicitly removed, so the mismatch
didn't self-heal on a routine stack recreate.

**Fix**: `docker exec medibook_backend_e2e npm install && npx prisma
generate` directly against the e2e container, then force-recreated the
stack again.

## Bug 4 (finding, surfaced by the same seed data) — `testResults` scoping requires the FK, not just the free-text field

Seeding a `TestResults` row with only `ordered_by_name` (free text) set —
matching the seed script's own initial, plausible-looking assumption — left
the row permanently invisible to every org-scoped caller: `testResults`
always returned `[]}`, even though the row existed in the database the
whole time. Root cause: `test-results.service.ts`'s `findAll()` scopes via
`orgScopeVia(user, 'ordered_by')`, a real relation filter against
`ordered_by_user_id → UserProfiles.client_org_id` — the free-text
`ordered_by_name` column plays no part in visibility at all. This is not a
bug in `test-results.service.ts` (the relation-based scope is correct and
intentional, matching every other `orgScopeVia` use in the codebase) — it's
a seed-script gap: a plausible-looking field was populated instead of the
one that actually governs visibility.

**Fix**: set `ordered_by_user_id: managerUser.id` alongside the existing
`ordered_by_name: 'Sarah Manager'`. Verified live post-fix: `testResults`
now returns the seeded row (`Priya Sharma` / `Blood Test` / `completed`) to
an authenticated manager.

## Bug 5 — the standalone "GP Consultation" product existed but was never attached to any payment

`finances.spec.js` and `manager-analytics.spec.js` need a real "GP
Consultation" / "₹499" line item, but the seed script's `gpConsult` product
(added specifically for `manager-services.spec.js`'s org-less-visibility
case) was never referenced by any of the 2,000 seeded appointments or their
payments — every one of them used `generalConsult` ("General Consultation",
₹500) instead. `finances/index.jsx` and the manager dashboard both join
`appointment.product` to render the service name (confirmed in
`appointment-payments.service.ts`'s `include: { appointment: { include: {
product: true } } }`), so creating the product row alone did nothing for
either spec.

**Fix, in two steps** (the first was insufficient on its own): routed
Anita Sharma's fixture appointment through `gpConsult.id` instead of
`generalConsult.id`, and built her payment row's amount from the actual
appointment's product price instead of a flat 50000 for every payment.
This alone still failed — live-confirmed the payment-generation step's
`prisma.appointments.findMany({ take: 600 })` has no `orderBy`, so it isn't
guaranteed to include Anita's specific row (inserted first, but "first" is
not a Postgres guarantee without an explicit sort), and even when it did
sample the right batch, `findFirst({ where: { patient_id: anita.id } })`
returned a *different* appointment of hers — she's also cycled into via
`patients[i % patients.length]` in the bulk loop, so she legitimately has
more than one appointment. Fixed by disambiguating the lookup with
`product_id: gpConsult.id` (the one field only her manual fixture row has)
and building her payment explicitly rather than hoping an unordered
600-of-2001-row sample includes it.

## Verification

- `npx tsc --noEmit` / `npx eslint prisma/seed-e2e.ts` clean after all five
  fixes.
- `docker compose --profile e2e up -d --force-recreate postgres_e2e
  backend_e2e frontend_e2e` completes with `GraphQL endpoint ready` logged
  and no crash-loop, confirmed across two independent fresh recreates.
- Live GraphQL query against the isolated stack
  (`http://localhost:4001/graphql`), authenticated as `manager@medibook.dev`:
  `testResults` returns exactly the seeded row with the expected fields, and
  `myFinanceTransactions` includes `{"amount":499,"product_name":"GP
  Consultation","patient_name":"Anita Sharma"}`.
- Full isolated e2e suite run — see `TR069`. No clean, uninterrupted full run
  was achieved this session (environmental, not a code defect — see `TR069`
  for detail), but the specific claims above are independently confirmed via
  direct API calls, not dependent on that run.

## What this does not close

- The room-*selection* logic itself (`create()`'s `rooms.findFirst()` with
  no availability check, logged as open question #14 under `BUG017`) is
  unrelated to this bug and remains open.
- Does not add idempotency to `seed-e2e.ts` — it is deliberately
  non-idempotent, matching a genuinely fresh tmpfs database on every
  `--force-recreate`. A plain container restart (not recreate) against a
  non-fresh `postgres_e2e` will still crash-loop on unique-constraint
  violations; this is expected, not a bug, and is now documented in
  `PLAN043`.
