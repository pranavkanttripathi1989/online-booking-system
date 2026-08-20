---
id: PLAN008
type: plan
feature: test-results-backend
created: 2026-08-17
updated: 2026-08-17
status: done
parent: unknown
related: []
---

# Test Results (Lab Reports) — Backend Implementation Plan

## Status: built, migrated, live-verified — full strict QA cycle complete

Backend built (`backend/src/test-results/**`, new `TestResults` model + migration `20260817130000_add_test_results`), frontend rewired from 100%-mock to real-with-fallback, and the full QA cycle re-run against the real API: 36 test cases (30 original + 6 new real-API-specific), 0 failures. One real behavior change documented (not a bug): the mock's 6 fixture rows only show when the real table is empty — once real orders exist, only real data shows. Full detail: `test-plan/test-results-page-test-plan.md` (v3.0), `test-result/test-results-page-test-results.md` (v3.0), `test-suggestion/test-results-page-test-suggestion.md` (v3.0, 3 new suggestions — the most important being that `patient` is still free text, blocked on Phase 6/Patients existing).

Written before any code, per the standing convention. Triggered by a request to run a strict real-API QA cycle on `/test-results` — impossible as asked, since the domain has **zero backend today** (confirmed: `pages/test-results/index.jsx` has no `gql` import at all, 100% `MOCK_RESULTS` local state; `schema.prisma` has no `Test`/`Lab` model). This plan covers building the backend first so the QA cycle can run for real, per the user's explicit choice.

## Grounding

- `frontend/src/pages/test-results/index.jsx` — the only consumer, entirely mock, no existing contract to match, so this is a **from-scratch design**, not a Rule-9 matching exercise like every prior increment.
- `test-result/test-results-page-test-results.md` — 30/30 mock-mode cases already passing, 4 historical bugs already fixed (Download PDF, Order Test dialog, flag-color fallback, Clear Filters). Nothing currently failing in mock mode — the only real gap is the missing backend.
- `test-suggestion/test-results-page-test-suggestion.md` — 8/9 suggestions already completed; 1 open (`SUG-TRES-009`, low priority, "Share to clipboard" — frontend-only, unrelated to backend work).
- `test-cases/05-patients/test-cases.md` `TC-PAT-API-010`/`011` — already-written spec: test-result values withheld until `status: 'completed'`; a patient can only view their own results. Written assuming a real `patient_id` relation.

## The real design decision: `patient` is a free-text name today, not a relation

The "Order New Test" dialog's Patient field is a **plain `TextField`** with placeholder "Search patient by name…" — no autocomplete, no real patient lookup, just typed text (confirmed by reading the actual form code, not assumed). `Patients` exists in `schema.prisma` (scaffolded, no resolver yet — Phase 6, not built this session) but nothing in the current frontend contract references a real patient ID.

**Decision:** build `TestResults` with a denormalized `patient_name String` (matches the current contract exactly, Rule 9) **and** an optional, nullable `patient_id String?` FK to `Patients` (additive, doesn't change the contract, sets up a clean migration path once Phase 6 exists and the Order dialog gets a real picker). `TC-PAT-API-010`/`011`'s patient-self-scoping spec is noted as **not enforceable yet** — it needs a logged-in patient's own `Patients` row to compare against, which doesn't exist until Phase 6. Documented as a follow-up, not silently skipped.

## Schema

New `TestResults` model: `id, patient_name, patient_id? (FK, nullable), test_name, test_type, ordered_by_name, ordered_by_user_id? (FK to Users, nullable — same reasoning as patient_id), date_ordered, date_completed?, status (enum: pending/processing/completed), values (Json — array of {name, value, ref, flag}, matches the frontend's exact per-parameter shape)`.

## GraphQL contract (new — this module defines it, not matches an existing one)

- `testResults(search, type, status)` — list, filtered server-side (matches the page's search/type/status filter bar).
- `testResult(id)` — single, for the detail dialog.
- `orderTest(input: OrderTestInput!)` — create, `{patient_name, test_type}` matching the Order dialog's actual two fields exactly (test_name/ordered_by_name/status/date_ordered derived server-side, not client-supplied — an ordering user shouldn't be able to submit a fake "completed" status or fabricate who ordered it).
- **`values` are only returned once `status: 'completed'`** (`TC-PAT-API-010`) — enforced in the service layer, not just hidden client-side.

## Hard-rules checklist (`context/backend-hard-rules.md`)

- Rule 1: scope by `client_org_id` — indirect via `ordered_by_user_id`'s `UserProfiles.client_org_id`, same pattern as everywhere else; a result with no ordering user (legacy/seeded data) is visible to any authenticated staff role rather than hidden, since it belongs to no tenant yet.
- Rule 2: no per-resolver `@UseGuards` — global auth, `@Auth('manager','admin','super_admin','clinician','staff')` on `orderTest` (ordering a test is a clinical/front-desk action).
- Rule 3: `OrderTestInput` DTO, validated.
- Rule 5: no multi-table writes here, no transaction needed.
- Rule 9: match the frontend's *current* free-text contract, don't invent a patient-picker UI it doesn't have.

## Frontend integration

`pages/test-results/index.jsx` goes from 100%-mock to real-with-mock-fallback — same `useMock` pattern already applied to `manager/clinics/index.jsx` this session. New `TEST_RESULTS_QUERY`/`ORDER_TEST_MUTATION` added to the canonical `graphql/queries.js`/`mutations.js` (this module gets to define them fresh, unlike every prior increment which matched an existing inline contract).

## Then: the full strict QA cycle, for real

Once built and curl-verified, re-run all 30 existing test-plan cases against the real API (not mocks), record results in `test-result/test-results-page-test-results.md` (updated in place, not a new file — this one already exists and has a real history worth preserving), add new cases for real-API-specific scenarios (auth expiry mid-session, 4xx/5xx, empty state, the `status: 'completed'`-gating enforcement now that it's server-side not just UI-hidden), and update the suggestion file.
