---
id: TR081
type: requirement
feature: scheduling-engine
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP082
related: [REQ017, PLAN055]
---

# TR081 — Results for session/token scheduling mode + multi-resource booking

Executed 2026-08-24 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 session mode generates no slots | **pass** | new test in `availability.service.spec.ts` |
| TC-02 slot mode unaffected (regression) | **pass** | same file, paired test |
| TC-03 `sessionAvailability()` null case | **pass** | |
| TC-04 remaining/estimate/isFull math | **pass** | e.g. capacity 40 + overbook 3, booked 10 → remaining 33, estimate `10 * 15 = 150` min |
| TC-05 count scoped to non-slot bookings | **pass** | asserted `where.booking_mode` equals `{not: 'slot'}` |
| TC-06 Resources tenant isolation | **pass** | 12 cases in `resources.service.spec.ts`, mirroring `rooms.service.spec.ts`'s coverage including the F-01 org-less-non-operator regression |
| TC-07 session-mode booking (canonical dialect) | **pass** | 5 cases: no `assertSlotFree` call, sequential `token_no`, capacity+overbook rejection at the exact boundary (43 = 40+3), acceptance one below it (42), configured-room preference |
| TC-08 multi-resource booking (slot mode) | **pass** | 4 cases in `appointments.service.spec.ts` |
| TC-09 resource cleanup on cancel/no_show | **pass** | 3 cases |
| TC-10 session-mode booking (public dialect) | **pass** | 4 cases in `public.service.spec.ts`, independent of TC-07's coverage since the two dialects share no implementation |
| TC-11 full backend suite | **pass** | 59 suites / 808 tests, 0 failures |
| TC-12 backend lint + typecheck | **pass** | both clean |
| TC-13 full frontend suite | **pass, after one real fix** | first run: 7 failures in `booking/index.test.jsx` — its `MockedProvider` re-declares `GET_CLINICIAN_AND_PRODUCTS`'s query string locally (can't import the component's own `gql` doc from a test file), and `MockedProvider` matches mocks by exact query AST. Adding `recurrenceType`/`mode` to the real query without updating this file's copy broke every test that renders past the initial data load. Fixed by adding the same two fields to the test's re-declared query and default mock data. Re-run: 6 suites / 63 tests, 0 failures |
| TC-14 frontend lint | **pass** | 167 warnings (was 168 pre-slice — net -1, ratchet direction preserved), 0 errors |
| TC-15 e2e: manager configures session window | **pass** | see below — required 4 rounds of selector fixes before passing cleanly |
| TC-16 e2e: anonymous wizard reflects it | **pass** | see below |

## e2e verification narrative (TC-15/16)

`scheduling-session-mode.spec.js` needed four real fixes before it passed,
each corrected before the next attempt rather than papered over:

1. **`getByLabel('Clinician')`/`getByLabel('Clinic')`/`getByLabel('Scheduling Mode')`/`getByLabel('Recurrence')` timed out** — MUI `Select` doesn't expose an accessible name via label association in this codebase's rendering (the same gap already noted in `manager-staff.spec.js`'s own comment). Fixed by switching to `getByRole('combobox').nth(N)`, the already-established working pattern for these forms.
2. **The public-wizard assertion never found "Sarah Mitchell"** — `page.context().newPage()` shares the already-logged-in manager's cookies/localStorage, so the "anonymous" wizard page actually rendered inside `OptionalAuthShell`'s authenticated branch (the full `AppShell`), not the public layout. Fixed by using `page.context().browser().newContext()` for a genuinely separate, cookie-less context — this is the real bug the test was written to catch (the two dialects rendering differently for logged-in vs. anonymous visitors), so this fix was necessary for the test to test what it claims to test, not a workaround.
3. **`getByText(/session$/i)` matched two elements (strict-mode violation)** — both the session-window heading and the "Join this session" button end in "session". Scoped to `getByRole('heading', {...})`.
4. **Cleanup's delete hit a strict-mode violation and the test then timed out** — two earlier failed debug runs each left one un-cleaned session-mode availability row behind (a run that fails before reaching its own cleanup code leaves its test data in place — the same accepted trade-off `manager-services.spec.js` documents for its own test service). Manually removed both leftover rows via a direct `deleteAvailability` GraphQL call, made the spec's own cleanup loop robust to more than one matching row, and gave the whole test `test.setTimeout(90_000)` (it does two logins'-worth of work: manager form entry, a real mutation round-trip, a second browser context navigating a separate lazy-loaded route, and cleanup — each step is quick but they add up past the 30s default).

Final clean run: `1 passed (43.1s)`. Confirmed via a direct GraphQL query
before and after that the test's own cleanup left zero session/hybrid rows
behind.

## Static checks

New files: `backend/src/resources/{resources.module,resources.resolver,
resources.service,dto/resource.input,entities/resource.entity}.ts` +
`resources.service.spec.ts`; `frontend/src/pages/manager/resources/index.jsx`;
`frontend/e2e/scheduling-session-mode.spec.js`. Touched files: `schema.prisma`,
one hand-written migration, `availability.service.ts`/`.resolver.ts`/
`dto/availability.input.ts`/`entities/availability.entity.ts`,
`appointments.service.ts`/`dto/appointment.input.ts`/`entities/appointment.entity.ts`,
`public.service.ts`, `app.module.ts`, `App.jsx`, `AppShell.jsx`,
`graphql/queries.js`, `manager/Availability.jsx`, `clinician/Availability.jsx`,
`booking/index.jsx`, `calendar/index.jsx`, and the one pre-existing test file
fixed above.

## Commits

See the commit immediately following this test-results doc —
`feat(backend,frontend): session/token scheduling mode and multi-resource booking (REQ017)`.
