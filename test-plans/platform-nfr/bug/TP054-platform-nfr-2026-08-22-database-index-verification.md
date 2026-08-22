---
id: TP054
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: approved
parent: BUG005
related: [PLAN027, TR053, F-13]
---

# TP054 — Database index verification (F-13)

A performance fix cannot be verified by a passing unit test. The existing 602-test
suite passes identically with zero indexes and with 69, because unit tests mock
Prisma and never plan SQL. So this plan is structural-and-planner assertions, not
Jest cases.

## Suggestion stage

Skipped, per the `CLAUDE.md` conditional rule (`REQ013` Phase D). This is a
well-scoped fix against an already-proven pattern — the verification method is
prescribed by `technical-plans/04-data-model-evolution.md` §2.2, so there was
nothing exploratory to draft candidates for. Skipping the stage is not skipping
review.

## Structural cases

| ID | Case | Expected |
|---|---|---|
| TC-01 | `npx prisma validate` after editing `schema.prisma` | exits clean |
| TC-02 | `npx prisma migrate deploy` on the dev database | 24/24 applied, no error |
| TC-03 | `SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname LIKE '%_idx'` | 69 |
| TC-04 | `SELECT count(*) FROM pg_index WHERE NOT indisvalid` | 0 — a failed build leaves an invalid index that silently does nothing |
| TC-05 | `prisma migrate diff` schema-datamodel vs datasource | zero index-related lines; declarations and live indexes agree |
| TC-06 | every generated index name length | ≤ 63 bytes, else PostgreSQL truncates and it reads as permanent drift |
| TC-07 | `prisma generate` then `docker restart medibook_backend` then read watch log | "Found 0 errors" |
| TC-08 | full backend Jest suite | no regression versus the pre-change baseline |

## Planner cases — the ones that actually prove the fix

Run against a scratch database seeded to 50,000 appointments and `ANALYZE`d.
Never against the dev database, where 4 rows make a sequential scan correct.

"Before" is the same seeded data with `enable_indexscan`, `enable_bitmapscan` and
`enable_indexonlyscan` set `off`, which isolates index availability as the only
variable.

| ID | Query (must come from real service code, not invented) | Expected after |
|---|---|---|
| TC-09 | clinician schedule: `clinician_id` = ? AND `is_deleted` = false AND `appointment_time` in 30-day window, ORDER BY `appointment_time` DESC LIMIT 20 | Index Scan Backward on `Appointments_clinician_id_appointment_time_idx`; **no sort node**; buffers fall by >50× |
| TC-10 | clinic schedule: `clinic_id` = ? AND `appointment_time` >= ?, ORDER BY `appointment_time` LIMIT 50 | Index Scan on `Appointments_clinic_id_appointment_time_idx`; no sort node |
| TC-11 | patient history: `patient_id` = ?, ORDER BY `appointment_date` DESC LIMIT 20 | Bitmap or Index Scan on `Appointments_patient_id_appointment_date_idx` |
| TC-12 | org-scoped join through `Clinics.client_org_id` | **Sequential scan is the correct and accepted result.** The predicate matches ~20% of rows; a plan change here would be a planner mistake, not a win. Assert the plan is unchanged and buffers are equal. |

TC-12 exists specifically so that "no improvement" is recorded as a passing,
expected outcome rather than quietly dropped from the report.

## Explicitly not covered

- **No regression gate.** Nothing in CI fails when the next model lands with no
  indexes. Proposed in `technical-plans/00-foundation-hardening.md`, not built.
- **No sustained-load or concurrency test.** Single-query planner behaviour only.
  Lock contention and connection-pool behaviour under real concurrency are
  untested.
- **Wall-clock timings are recorded but must not be used as pass/fail.** The
  measurement host was saturated (load average 45–190). Buffer counts are the
  assertion; milliseconds are context.
