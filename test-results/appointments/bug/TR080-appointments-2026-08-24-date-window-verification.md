---
id: TR080
type: bug
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP081
related: [BUG019, BUG020, PLAN054]
---

# TR080 — Results for the calendar/appointments date-window fix

Executed 2026-08-24 against the backend unit suite (`medibook_backend`) and
the isolated e2e stack (`postgres_e2e`/`backend_e2e`/`frontend_e2e`, ports
5435/4001/3101), on `master`.

## Per-defect contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 `date_from` alone | **pass** | `where.appointment_time.gte` equals the parsed date, `.lte` undefined |
| TC-02 `date_to` alone | **pass** | `where.appointment_time.lte` equals `2026-08-23T23:59:59.999Z` for input `2026-08-23`, `.gte` undefined |
| TC-03 both together | **pass** | both bounds correct |
| TC-04 neither provided | **pass** | `where.appointment_time` is `undefined` — confirms no implicit default window exists today |
| TC-05 default ordering | **pass** | `orderBy` equals `{ appointment_time: 'desc' }` |
| TC-06 full backend suite regression | **pass** | `appointments.service.spec.ts`: 31/31 passing (26 pre-existing + 5 new), 0 regressions |
| TC-07 backend lint + typecheck | **pass** | `npx eslint "src/appointments/**/*.ts"` and `npx tsc --noEmit`: both clean |
| TC-08 frontend lint | **pass** | `npx eslint` on `calendar/index.jsx`, `appointments/index.jsx`, `CalendarView.jsx`: 0 errors; warnings present are pre-existing (unrelated unused-var/no-unused-vars lines, confirmed unrelated to the diff) |
| TC-09 direct GraphQL inspection, realistic dataset | **pass** | Extracted the `Appointments` operation's raw request/response from a Playwright trace against `backend_e2e`: request `variables.filters` correctly carried `{date_from, date_to}` matching the calendar's visible range / the appointments list's active tab; response contained real, correctly-bounded rows (e.g. `{"first":500,"filters":{"date_from":"2026-08-01","date_to":"2026-08-31"},"page":1}` → real August-dated appointments, not an unbounded dump) |
| TC-10 live browser: Today's Schedule sidebar | **pass** | One full live-browser pass (captured before the TZ boundary described below was crossed) showed `Anita Sharma`'s real seeded fixture rendered correctly at `3:30 PM – 4:00 PM` in the Today's Schedule panel, clinician `Sarah Mitchell`, status `scheduled` — the exact target behavior `BUG019` was filed to fix |
| TC-11 `calendar.spec.js` (2 assertions) | **environment-blocked, not code-failing — see below** | |
| TC-12 `manager-appointments.spec.js` "manager sees real seeded appointments" | **environment-blocked, not code-failing — see below** | |

## TC-11/TC-12: root-caused environmental block, not a regression

Both specs' remaining failures trace to one fully-diagnosed cause, not the
code under test: the isolated stack's `backend_e2e`/`postgres_e2e`
containers run in UTC with no `TZ` set (confirmed via `docker exec
medibook_backend_e2e date`), and this verification pass happened to fall
within the ~5.5-hour nightly window after IST midnight where UTC has not
yet rolled to the same calendar day as the host/browser. `seed-e2e.ts`
anchors `Anita Sharma`'s fixture appointment to the backend's own `new
Date()` "today" at seed time — confirmed via direct `psql` query, her
`appointment_time` is literally `2026-08-23 10:00:00`, one calendar day
behind the browser's `dayjs()`-computed "today" of `2026-08-24` (IST). Both
specs' assertions look for her by name on "today's" view; the fix correctly
excludes a genuinely-not-today appointment under this mismatch — the same
correctness the fix is supposed to provide, just pointed at a stale fixture.

This is proven not to be a resolver/frontend defect: TC-09 confirms the
exact right `date_from`/`date_to` reach the backend and the exact right
rows come back for whatever "today" the browser computes; TC-10 confirms
the UI renders the target fixture correctly when the seed's "today" and the
browser's "today" agree (as they did earlier in the same session, before
the boundary was crossed by real wall-clock time advancing past midnight
IST mid-verification). Re-seeding the isolated stack after crossing the
boundary (`docker compose --profile e2e up -d --force-recreate postgres_e2e
backend_e2e`) reproduced the *same* one-day-behind fixture every time,
because the backend container's own clock — not the seed timing — is what's
behind. Filed as `context/open-questions.md` #15 (backend containers'
missing `TZ` — a product-wide question, not this bug's scope) rather than
worked around locally.

**A second, unrelated finding surfaced during the same verification pass**:
`manager-appointments.spec.js`'s "a real filter with zero matches..." test
assumes zero real `no_show` appointments exist for this org, which broke
once the realistic ~2,000-row seed's status distribution genuinely included
some (received 20, expected 0) — filed separately as `BUG020`, not fixed
here (unrelated to date-window logic; the filter and resolver both behaved
correctly, only the test's premise was stale).

**Recommended re-verification**: re-run `calendar.spec.js` and
`manager-appointments.spec.js`'s first two tests against a freshly-recreated
isolated stack once IST and UTC agree on the calendar day (any time from
~05:30 IST onward) — expected to pass outright with no further code changes,
per TC-09/TC-10's evidence.

## Static checks

Four files touched: `CalendarView.jsx` (new optional prop), `calendar/index.jsx`
(date-range state + handler + `data-testid`), `appointments/index.jsx`
(tab-anchored default filters), `appointments.service.spec.ts` (new test
block, no production code changed). `calendar.spec.js` re-scoped to the new
`data-testid` for its two existing assertions — same intent, same fixture,
correctly-targeted locator.

## Commits

See the commit immediately following this test-results doc in `git log` —
`fix(frontend): wire date-window filters into calendar and appointments list (BUG019)`.
