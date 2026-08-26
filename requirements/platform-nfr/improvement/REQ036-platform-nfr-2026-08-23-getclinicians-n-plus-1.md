---
id: REQ036
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: []
---

# REQ036 — `getClinicians` issued one extra query per row instead of one query total

`project-plans/analysis/06-execution-plan.md` P3.4. `public.service.ts`'s
`getClinicians()` (backs the public doctor-directory listing) fetched every
matching clinician with a single `findMany`, then fanned out
`Promise.all(clinicians.map(async c => ratingFor(c.id)))` — a separate
`reviews.aggregate()` round-trip per clinician, so a 50-clinician listing
issued 51 queries where one would do.

## Fix

New `ratingsFor(clinicianIds: string[])` batches every clinician's rating
into a single `reviews.groupBy({ by: ['clinician_id'], where: { clinician_id: { in: ids } } })`
call, then maps results back per id — including clinicians entirely absent
from the `groupBy` result (zero reviews), which must resolve to `{rating:
undefined, reviews: 0}`, not be silently dropped or crash on a missing map
entry. `getClinician()` (singular, one clinician) still uses the original
`ratingFor()` — no N+1 risk there, nothing to batch.

## Verification

4 new unit tests: exactly one `groupBy` call regardless of clinician count,
correct per-clinician mapping, the zero-reviews-absent-from-groupBy case,
and zero `groupBy` calls when there are no clinicians at all. Live
`getClinicians` query against the real dev backend returned all 10 real
seeded clinicians with correctly-resolved `reviews: 0` (none have real
review rows in this database currently, so only the empty-result path was
exercised live; the non-empty path is unit-tested only). `tsc --noEmit` and
`eslint` clean. See `TR064`.
