---
id: REQ133
type: improvement
feature: platform-nfr
created: 2026-08-26
updated: 2026-08-26
status: done
parent: null
related: [PLAN173, TP193, TR193]
---

# REQ133 — Bounded pagination for `testResults` (F-14 residue)

## Why this slice

F-14's own status line: *"the hard-cliff risk is closed [global 200-row
`clampTakeMiddleware`], but the per-domain `{data, paginatorInfo}`
migration is still open, real, requirement-sized work."* Named
`testResults`, `notifications`, `threads` as the three remaining
unbounded list resolvers.

## Scope correction, found before starting

Investigated all three before picking one. `notifications.findAll` is
already scoped to `user_id: user.sub` — one caller's own notifications,
bounded by nature (realistically hundreds, not the org-wide growth F-14
actually warns about). `messages.service.ts#threads()` has its own
already-flagged N+1/complexity concerns (department-scoped
auto-participant logic from `REQ058`/`REQ102`) — real surgery risk for a
final slice in a ten-slice batch, disproportionate to this finding's own
marginal value there. `testResults` — org-wide clinical data across
every patient, realistically growing over years — is the one genuinely
matching F-14's own "one tenant with a large catalogue degrades the
whole API" framing. Scoped this slice to `testResults` alone, migrated
correctly and completely, rather than three domains done partially.

## User story

As a clinic with years of accumulated lab-result history, I want the
test-results list to be served from a genuinely bounded query — not just
protected by a global safety-net middleware — so a large catalogue can't
degrade the API for everyone.

## Acceptance criteria

- **Given** the `testResults` query, **then** it returns `{data,
  paginatorInfo}`, not a bare unbounded array.
- **Given** no `first`/`page` supplied, **then** the resolver defaults to
  `first: 200` (matching `clampTakeMiddleware`'s own ceiling) — every org
  under that size sees identical behaviour to before this slice.
- **Given** more results exist than were fetched, **then** the frontend
  shows an honest "showing N of Total" note rather than silently
  truncating with no signal.
- **Given** a real query error (not an empty result), **then** the
  frontend's mock-data fallback still engages — and **given** a real,
  genuine empty result, **then** it does not.

## In scope

- `TestResultPaginatedType`/`TestResultPaginatorInfoType` (backend),
  `findAll`'s pagination math, `testResults(first, page)` resolver args.
- `TEST_RESULTS_QUERY` and `test-results/index.jsx` updated to match
  (Hard Rule 7).
- A real, adjacent bug found and fixed while touching these exact
  lines: `test-results/index.jsx`'s own `useMock` fallback triggered on
  any empty result, not just a genuine network error — the same class of
  bug Priority-3's own sweep already found and fixed on
  `appointments/index.jsx`/`calendar/index.jsx`. This page's own version
  of it had never been caught, since the page had zero test coverage
  before this slice.
- The tenancy matrix's own `test-results` fixture query/extractor
  (`domain-cases.ts`), updated to match the new response shape — a
  necessary, mechanical consequence of the schema change, not a new
  finding.

## Deliberately out of scope

- `notifications`/`threads` — investigated, both deliberately deferred
  (see the scope-correction note above), not silently dropped. Each is a
  real, separate future slice.
- No pagination *controls* added to the UI (no Next/Previous, no page-size
  picker) — the page's own client-side search/filter/sort still operates
  across the fetched batch (now capped at 200 rather than truly
  unbounded), matching today's UX for every realistic org size. A real
  "load more"/server-driven search UI is a genuine follow-on once an org
  actually exceeds 200 results, not built speculatively here.
- No change to `notifications`/`threads`' own resolvers, entities, or
  frontend consumers.
