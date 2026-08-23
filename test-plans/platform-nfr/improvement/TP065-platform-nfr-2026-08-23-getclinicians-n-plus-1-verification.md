---
id: TP065
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ036
related: [PLAN038, TR064]
---

# TP065 — Verification for the `getClinicians` N+1 fix

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `getClinicians()` with N clinicians | `reviews.groupBy` called exactly once, regardless of N |
| TC-02 | A clinician present in the `groupBy` result | Real `rating`/`reviews` values, correctly mapped |
| TC-03 | A clinician absent from the `groupBy` result (zero reviews) | `{rating: undefined, reviews: 0}`, not missing/crashing |
| TC-04 | Zero clinicians | `reviews.groupBy` not called at all |
| TC-05 | Live `getClinicians` query against the real dev backend | Returns all real seeded clinicians with correctly-resolved ratings |
| TC-06 | `tsc --noEmit`, `eslint` on `public.service.ts`/spec | Clean |

## How this was checked

TC-01–04 via Jest unit tests with a mocked Prisma `reviews.groupBy`.
TC-05 via a direct `curl` GraphQL call against the real running backend
after a restart — no real review rows exist in the dev database currently,
so this only exercises the zero-reviews path live; the non-zero path is
unit-tested only (not re-verified live, since creating disposable real
review rows for this alone wasn't judged worth the dev-DB pollution). TC-06
via the backend container's own commands.
