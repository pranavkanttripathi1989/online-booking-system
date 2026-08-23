---
id: PLAN038
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ036
related: [TP065, TR064]
---

# PLAN038 — Batch `getClinicians`' per-clinician rating lookup

No test-suggestions stage per `REQ013` Phase D — a straightforward
`aggregate` → `groupBy` batching change against an already-proven Prisma
pattern (the same batching approach `dashboard.service.ts`/`analytics.service.ts`
already use elsewhere).

## Approach

- New `ratingsFor(clinicianIds: string[])`: one `reviews.groupBy({by:
  ['clinician_id'], where: {clinician_id: {in: ids}}})` call, mapped back
  into a `Map<clinicianId, {rating, reviews}>`. Clinicians absent from the
  `groupBy` result (zero reviews) are explicitly backfilled to `{rating:
  undefined, reviews: 0}` rather than left missing from the map.
- `getClinicians()`: replace the `Promise.all(map(async c => ratingFor(c.id)))`
  fan-out with one `ratingsFor()` call before mapping the response.
- `getClinician()` (singular) untouched — no N+1 risk for a single row.

## Verification plan

See `TP065`.
