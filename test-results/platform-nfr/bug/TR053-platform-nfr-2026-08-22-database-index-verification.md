---
id: TR053
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: pass
parent: TP054
related: [BUG005, PLAN027, F-13]
---

# TR053 — Database index verification results

Executed 2026-08-22 against the running Docker stack (`medibook_postgres`,
`medibook_backend`) and a scratch database `medibook_idxtest`.

## Structural

| Case | Result | Evidence |
|---|---|---|
| TC-01 `prisma validate` | **pass** | clean exit |
| TC-02 `migrate deploy` | **pass** | `Applying migration 20260822130000_add_indexes` → "All migrations have been successfully applied"; `migrate status` → "Database schema is up to date!" |
| TC-03 index count | **pass** | 0 before, **69** after |
| TC-04 invalid indexes | **pass** | 0 |
| TC-05 diff vs datasource | **pass** | `grep -ci index` over the diff output → **0** index-related lines |
| TC-06 name lengths | **pass** | all ≤ 63 bytes |
| TC-07 clean compile | **pass** | `prisma generate` → `docker restart medibook_backend` → Nest application successfully started, no `error TS` |
| TC-08 backend suite | **pass** | `npx jest --maxWorkers=2` → **50 suites / 641 tests, 0 failures**, 129 s. No regression: this change is DDL plus comments, and the suite mocks Prisma, so it proves the change broke nothing rather than that the indexes work — TC-09–TC-12 carry that |

## Planner — 50,000 appointments, ANALYZEd

| Case | Before | After | Buffers | Verdict |
|---|---|---|---|---|
| TC-09 clinician schedule | 154.6 ms, Seq Scan + top-N heapsort | 0.52 ms, **Index Scan Backward**, sort node gone | 2755 → **34** (81×) | **pass** |
| TC-10 clinic schedule | 72.0 ms, Seq Scan + quicksort | 3.8 ms, **Index Scan**, sort node gone | 2753 → **77** (36×) | **pass** |
| TC-11 patient history | 100.7 ms, Seq Scan | 2.8 ms, **Bitmap Index Scan** | 2753 → **20** (138×) | **pass** |
| TC-12 org-scoped join | 21.5 ms Seq Scan | 52.1 ms Seq Scan | 610 → 610 (identical) | **pass as specified** — no plan change was the expected outcome |

TC-09's disappearing `top-N heapsort` is the composite index's equality-then-range
column order working as designed: one index serves both the filter and the sort.

TC-12 confirms the reasoning behind that column order. The tenant predicate
matches ~20% of rows and is not selective enough to index usefully on its own.
Identical buffer counts prove the planner chose the same plan both times, so the
52 ms vs 21 ms wall-clock gap is host-load noise, not a regression. This matters
for the ~40 new tenant-scoped tables the PRD adds: lead composite indexes with the
selective column, not with `client_org_id`.

## Caveats stated rather than buried

- **Wall-clock times are indicative only.** Host load average ranged 45–190
  during measurement. Buffer counts carried the verdicts.
- **The dev database was never seeded to volume** — a scratch database was used
  so dev data stayed clean. The 69 indexes are live on the dev database; the
  *measurement* comes from the scratch copy with identical schema and migrations.
- **No CI gate exists**, so this result does not protect against the next model
  landing unindexed.
- **The default `npm test` invocation was killed (exit 137, OOM) on this host**
  before completing. TC-08's figures come from `npx jest --maxWorkers=2`. Same
  suite, same assertions — but a bare `npm test` is not currently a reliable way
  to observe green here, the same host-resource constraint that already forced
  the e2e suite to be run in small batches.
- **33 lines of pre-existing schema drift** (foreign keys, `UserProfiles.staff_status`
  nullability) were found by TC-05 and are unrelated to this change. Reported, not
  fixed here.
