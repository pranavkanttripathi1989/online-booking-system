---
id: TR163
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP163
related: [PLAN145]
---

# TR163 — Test results: booking-widget embed code UI

## TP163 case outcomes

| # | Case | Result |
|---|---|---|
| 1 | `@Public()` gating | Pass — `booking-widget.resolver.spec.ts` |
| 2 | Delegation | Pass |
| 3 | Embed Code dialog opens with clinician list | Pass — `settings/index.test.jsx` |
| 4 | Generated snippet correctness | Pass |
| 5 | Not-embedded skip | Pass — pre-existing `booking/index.test.jsx` suite (10/10 total across both files) stayed green with zero regressions after the new `useQuery(VALIDATE_BOOKING_WIDGET_EMBED, {skip: ...})` addition, confirming the skip guard works in the default (non-embedded) jsdom test environment |
| 6 | Live embedded-with-invalid-origin check | **Not performed this session** — the shared dev backend container had uncommitted, actively-in-progress changes from a parallel session (`schema.prisma`, `app.module.ts`) at verification time; restarting it risked picking up a half-written state. Deferred to a future live-verification pass once the shared container is quiescent. |

## Full verification run

- `backend: npx jest src/booking-widget --maxWorkers=2` — 2/2 suites, 11/11 tests.
- `backend: npx tsc --noEmit` — clean.
- `frontend: npx eslint src/pages/settings/index.jsx src/pages/booking/index.jsx` — 0 errors (46 pre-existing warnings, none new).
- `frontend: npx jest src/pages/settings/index.test.jsx src/pages/booking/index.test.jsx` — 2/2 suites, 14/14 tests (10 pre-existing + 4 new).

## One real fixture fix made along the way

`settings/index.test.jsx`'s own inline `GET_INTEGRATIONS` mock query
didn't include the new `clinic { id }` field this slice added to the
real component's query — `MockedProvider` matches by exact query AST,
so 3 pre-existing tests broke immediately after the component change.
Fixed by updating the test's own query text and widget fixture to match
(added `clinic: null`), confirming this is a query-shape mismatch in the
test, not a real regression.
