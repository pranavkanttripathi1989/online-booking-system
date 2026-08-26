---
id: PLAN173
type: improvement
feature: platform-nfr
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ133
related: [TP193, TR193]
---

# PLAN173 — Implementation plan: testResults bounded pagination

## Change

**`backend/src/test-results/entities/test-result.entity.ts`**: new
`TestResultPaginatorInfoType`/`TestResultPaginatedType`, matching
`AppointmentPaginatedType`'s own dedicated-per-domain-type convention
(no shared generic paginator type exists in this codebase).

**`backend/src/test-results/test-results.service.ts`**: `findAll` gains
`first`/`page` parameters. The `where` clause is unchanged (still every
existing filter/scope: search, type, status, org-scope via
`orgScopeVia(user, 'ordered_by')`, patient self/dependant scope); it now
runs inside `this.prisma.$transaction([count, findMany])` with
`skip: (page-1)*first, take: first`, computing `paginatorInfo` with the
identical math `appointments.service.ts#findAll` already uses (`lastPage`,
`firstItem`, `hasMorePages`).

**`backend/src/test-results/test-results.resolver.ts`**: `testResults`
now returns `TestResultPaginatedType`; new `first`/`page` args,
`defaultValue: 200`/`1` — `200` matches `clampTakeMiddleware`'s own
`DEFAULT_MAX_TAKE`, so every org under that size sees identical results
to before this slice.

**`backend/test/integration/setup/domain-cases.ts`**: the `test-results`
tenancy-matrix case's fixed query/extractor updated
(`{ testResults { id } }` → `{ testResults { data { id } } }`,
`d.testResults` → `d.testResults?.data`) — a necessary, mechanical
consequence of the schema change; the matrix case itself (roles, fixture
ids) is unchanged. Applied via a hand-crafted patch isolating this one
hunk from the concurrent session's own unrelated `tasks`-domain addition
elsewhere in the same file, which remains unstaged and untouched.

**`frontend/src/graphql/queries.js`**: `TEST_RESULTS_QUERY` updated to
select `{data {...} paginatorInfo {...}}` and accept optional `$first`/
`$page` variables.

**`frontend/src/pages/test-results/index.jsx`**: `apiResults =
data?.testResults?.data ?? []` (was `data?.testResults ?? []`). Also
fixes a real bug found while touching these exact lines: `useMock` was
`apiResults.length === 0 && !loading` — falling back to fabricated
`MOCK_RESULTS` on any real *empty* result, not just a genuine network
error. Fixed to `useMock = !!error`, matching the exact established fix
already applied to `appointments/index.jsx`/`calendar/index.jsx`
(`error ? mockRows : apiRows`). Added an honest "showing N of Total"
note, shown only when `paginatorInfo.hasMorePages` is true.

## Testing

`backend/src/test-results/test-results.service.spec.ts`: existing 13
`findAll` call sites updated to the new 6-argument signature (added
`first, page`); mock gains `count`/`$transaction`. 4 new cases:
skip/take derived from page/first, a correctly-computed `paginatorInfo`
on a populated page, `hasMorePages: false` on the last page, and a
zero-total empty result never reporting a negative `firstItem`.

`frontend/src/pages/test-results/index.test.jsx` (new — this page had
zero test coverage before this slice): renders real paginated results;
does NOT fall back to mock data on a genuine empty result (the bug this
slice fixes); DOES fall back on a genuine query error; shows the
"showing N of Total" note when more pages exist; shows no such note when
everything fit on one page.

Full backend unit suite: 92/92 suites, 1525/1525 tests (4 new).
Integration suite: 4/4 suites, 387/387 — **initially red** (9 failures
in the tenancy matrix, `GRAPHQL_VALIDATION_FAILED` instead of the
expected role-gate result, since the fixture's own query no longer
matched the new schema shape) until `domain-cases.ts`'s fixed query/
extractor were updated; reconfirmed green after. `tsc --noEmit`/`eslint`
clean on backend. Frontend: new page suite 5/5, `eslint` clean (23
pre-existing warnings on `test-results/index.jsx`, confirmed identical
count before/after this slice's edit); full `npm run lint` unchanged at
1909 (the `REQ132`-lowered ceiling).

## Documentation

`REQ133` (this requirement, includes the notifications/threads
scope-correction), `PLAN173` (this plan), `TP193`/`TR193` (verification),
a context bundle, and index updates across all five doc roots plus the
`platform-nfr` feature README. Also folds in the batch plan's own noted
F-30 one-line correction in `project-plans/02-findings-register.md`
(pointing at `scripts/test-count-status.mjs`, built by `REQ123`).
