---
id: TR220
type: bug
feature: clinicians
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP220
related: [BUG028, PLAN200]
---

# TR220 — Results: clinician `email`/`phone` never readable over GraphQL

## Backend

- `npx jest clinicians --maxWorkers=1`: **27/27 green** across
  `clinicians.service.spec.ts` (pre-existing, unaffected) and the new
  `clinicians.resolver.spec.ts` (5/5 new).
- `npx tsc --noEmit`: clean.
- `docker exec medibook_backend npx prisma generate` + `docker restart
  medibook_backend`: required this pass — the running container has its
  own separate `node_modules` volume from the host, so a host-side
  `prisma generate` alone (already run earlier this session for the
  unrelated `revenue-share` migration) left the container's own Prisma
  Client stale, causing an unrelated `Property 'payouts' does not exist
  on type 'PrismaService'` compile failure on the first restart attempt.
  Regenerating inside the container and restarting again compiled
  clean — the same "container node_modules volume goes stale relative
  to the host" class this session already hit once this session for
  `web-vitals` (`P1-18`'s own documented gotcha).

## Live verification (real dev backend, real login sessions)

- Direct `psql` read against `medibook_db` confirmed
  `Clinicians.email = 'Sarah@medibook.com'` for the real edited row —
  the original save was always correct; the bug was entirely on the
  read side.
- `login` as `manager@medibook.dev` (httpOnly-cookie session, per
  `REQ145`'s SEC-2 closure — no bearer token in the response body) then
  `clinician(id) { email phone }` returned
  `{"email":"Sarah@medibook.com","phone":"+919876000001"}` — the real,
  current values.
- The identical query as `patient@medibook.dev` returned
  `{"email":null,"phone":null}` — confirming the new access gate
  actually withholds the field, not merely intends to.

## Real findings from this bug fix

1. **The actual root cause was narrower than it first looked.** The
   user's own report ("email not updating") reads like a write-path
   bug; it was entirely a read-path gap (`ClinicianType` never declared
   the fields at all) — confirmed by checking the database directly
   *before* touching any code, per this session's own standing
   discipline of verifying which side of a save/read pair is actually
   broken rather than assuming.
2. **A real, would-be-introduced security gap, caught before shipping**:
   `clinician`/`clinicians` have no role gate at all — a plain `@Field()`
   fix would have handed every patient a clinician's personal email/
   phone. Closed via `@ResolveField()`-level gating instead of widening
   the whole query's `@Auth()` (which would have been a larger, riskier
   change with its own blast radius on legitimate patient-facing usage
   of the same query).
3. Confirmed, a second time this session, that this container's
   `node_modules` volume is genuinely independent of the host's —
   `prisma generate` (or any `npm install`) needs to run inside the
   container too, not just the host, before a restart will pick it up.

## Open items

- No visible `email`/`phone` display exists on `clinicians/detail.jsx`
  today — the data now round-trips correctly through the edit form, but
  nothing else in the product surfaces it. Logged as a named, smaller
  follow-on, not silently added as scope creep on this bug fix.
