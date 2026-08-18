# QA Execution Prompt — Full Codebase Test Audit, Test-Case Update & Full Test Pyramid

> Run this **after** the frontend-design skill setup and Priority-1 backend test work in `CLAUDE.md` are confirmed in place. This prompt governs test strategy and execution — `CLAUDE.md`'s hard rules (never commit red, tenant isolation, mobile responsiveness, etc.) still apply throughout.

## Role

Act as **both** a QA engineer and a full-stack developer, each with 20 years of production experience in multi-tenant B2B/B2C SaaS in regulated domains (healthcare, fintech). As QA: specialize in RBAC verification, GraphQL API testing, and the full test pyramid (unit → integration → e2e → smoke) — you don't sample-test and call it coverage, you treat "did I check every role against every operation" as a literal, countable checklist. As the developer: you fix what QA finds yourself, in the same pass, the same way you'd fix your own bug — root cause, not a patch that makes the specific test green while leaving the underlying issue. You don't hand a bug report to someone else and move on; you close the loop.

## Mission

Analyze the **complete** frontend (`frontend/`), backend (`backend/`), and database schema (`backend/prisma/schema.prisma`) — every page, every component, every resolver, every service, every model — and:

1. Update `test-cases/` so it has a test case for every feature and every RBAC role/permission combination, with no line of functionality left unaccounted for.
2. Execute the full test pyramid against the real system (unit, integration/API, e2e, smoke) — no step skipped, no domain skipped.
3. **When a test fails, fix the underlying code (not the test) and re-run immediately** — loop fix → retest on that specific failure until it passes or you've confirmed the test case itself was wrong (see rule 9). Don't defer fixes to a later pass or a separate ticket; this prompt covers finding and closing in the same session.
4. Record outcomes in `test-result/` and gaps/improvements in `test-suggestion/`, following the existing per-feature triad convention already used in this repo (`test-plan/`, `test-result/`, `test-suggestion/` — one set of three files per feature).

## Hard rules for this pass

1. **No skipped code, no skipped feature, no skipped role.** If a page, resolver, or model exists, it gets a test-case entry. If a role exists (`admin`, `super_admin`, `manager`, `clinician`, `receptionist`, `patient` — from `backend/prisma/seed.ts`), it gets tested against every operation it could plausibly touch, both allowed and denied paths. "I covered the main flow" is not done — "I covered the main flow, every role's access to it, and its failure modes" is done.
2. **RBAC is tested as a matrix, not a sample.** For every resolver/mutation, build an explicit table: role × operation → expected allow/deny. Write an automated test for every cell, not just the "happy" roles. A missing `@Auth()`/`@Public()` check that silently over-permits is exactly the class of bug this pass exists to catch.
3. **Multi-tenancy is tested as a security boundary, not a filter.** For every tenant-scoped resolver, write a test proving Tenant A's token cannot read/write Tenant B's data, not just that Tenant A can see Tenant A's data.
4. **Nothing is marked passed without being run.** Do not write a test-result entry from reading the code and reasoning it should pass — execute it, capture the actual output, and record the actual result. A test you wrote but didn't run goes in "pending," not "passed."
5. **Use the real stack, not mocks, for integration/e2e/smoke.** Per `CLAUDE.md`, these tiers exist specifically to prove the real backend works — running them against `frontend/src/mocks/store.js` defeats the purpose. Unit tests are the one tier allowed to mock collaborators.
6. **Follow the existing documentation structure — don't invent a new one.** `test-cases/` is organized 15 domains × {Unit, Backend-API, Functional-E2E, Frontend} sections; keep that shape, extend it, don't restructure it. `test-plan/`, `test-result/`, `test-suggestion/` stay as matching triads per feature.
7. **A found gap is a finding, not a failure to hide.** If you discover an untested privilege-escalation path, a missing validation, or a page silently on mock data, log it plainly in `test-suggestion/` (and, if it's a live security gap, flag it prominently at the top of your summary) rather than working around it quietly.
8. **Verify before commit, per `CLAUDE.md` rule 3–4.** Commit test-case updates, new test files, and fixes together per domain, only once that domain's tests actually run and pass and their results are recorded.
9. **Fix the code, not the test — with one narrow exception.** When a test fails, first assume the code is wrong and fix the code. Only change the test itself if, on inspection, the test's expected behavior is actually incorrect against the real requirement (e.g. it asserts a role should be denied something it should legitimately be allowed) — and if you do, say explicitly why the original test case was wrong, don't just quietly loosen an assertion to make it pass. Never widen a permission, remove a tenant-isolation check, or soften a validation rule purely to make a red test green — a passing RBAC/tenant test that now permits something it shouldn't is a worse outcome than a red test.
10. **Loop until actually green, with a cap.** For each failing test: fix → re-run → confirm pass, before moving to the next test in that domain. If the same test is still failing after 3 fix attempts, stop looping on it, mark it clearly as an open blocker in `test-suggestion/` (with what you tried and why it didn't work), and move on rather than burning the session on one case — flag it in the final summary as unresolved.
11. **Use the Chrome MCP server for real, live-browser verification — not just automated test files.** This repo already has `.playwright-mcp` configured. Written Playwright e2e specs (Phase 5) prove the flow works in CI; that is necessary but not sufficient. For every domain's critical journeys, also drive an actual live browser through the connected Chrome/Playwright MCP tool: log in as each relevant role, click through the real flow, and visually confirm — don't just check that assertions pass, look at what's actually rendered. Use it specifically for: (a) the RBAC UI check — confirm a denied role doesn't just get a blocked API call but doesn't see the button/menu/route at all, or gets a proper denied state, not a broken page; (b) the mobile-responsiveness check in hard rule 5's 360/768/1280px sweep — resize the real browser and look, don't infer from CSS; (c) anything a written assertion could pass while the page visually looks broken (layout shift, overlapping elements, a silently-empty state that isn't an explicit "no data" message). Screenshot findings into the relevant `test-result/` entry.
12. **No feature or journey is "too small" to skip.** This applies at every phase, not just Phase 1's inventory. Secondary flows, edit/delete/cancel actions, empty states, pagination, sort/filter controls, form field-level validation messages, tooltips and inline help that gate an action, "forgot password"/"resend OTP" paths, notification read/unread toggles, minor settings toggles, confirmation dialogs, and any journey that's short (2–3 steps) or used by only one role — all of these get a test case, get tested, and get a recorded result, exactly like the primary booking/payment flows. If Phase 1's inventory finds a page, button, or resolver, it does not get left out of Phases 2–7 for being small or "obviously fine." If something is explicitly out of scope, say so in writing in the inventory with a reason — don't let it quietly fall off the list.

## Phase 1 — Full codebase inventory (no test-writing yet)

1. **Frontend inventory**: every page and component under `frontend/src/` (per `context/backend-api-requirements-master-plan.md`'s existing 75-page/55-component audit — verify it's still current, update if the codebase has moved on). For each: what GraphQL operations it calls, which dialect (canonical vs public), and whether it's still on `mocks/store.js` for any part of its data.
2. **Backend inventory**: every resolver and service method under `backend/src/` across all ~20+ built domains. For each: its `@Auth()`/`@Public()`/`@Roles()` annotations as written, and what it *should* require based on the feature's intent (flag any mismatch immediately — this is often where privilege bugs hide).
3. **DB inventory**: every model in `backend/prisma/schema.prisma`, which have `client_org_id` directly vs. scope through a relation (per `CLAUDE.md`'s multi-tenancy note), and which resolvers touch each model.
4. **RBAC role inventory**: confirm the full role list from `backend/prisma/seed.ts` and any role logic in `RolesGuard`/`jwt.strategy.ts`. Build the role × domain permission matrix as a working document (this becomes the backbone of Phase 2's RBAC test cases).

**DoD:** a written inventory (e.g. `context/qa-full-inventory.md`) covering 100% of frontend pages, backend resolvers, DB models, and roles, with every existing gap or mismatch already flagged — before any test is written.

## Phase 2 — Update `test-cases/`

For each of the 15 domains in `test-cases/`, across all four sections (Unit / Backend-API / Functional-E2E / Frontend):

1. Cross-check existing test cases against Phase 1's inventory — add any missing feature, field, mutation, or query.
2. Add the full RBAC matrix for that domain: every role × every operation in that domain, both allow and deny cases.
3. Add multi-tenant isolation cases for every tenant-scoped operation.
4. Add negative/edge cases: invalid input, boundary values, empty states, already-cancelled/already-processed states, concurrent-mutation conflicts where relevant.
5. Add India-specific cases where relevant (paise rounding, GST fields, Razorpay/MSG91 failure and retry paths).

**DoD:** every domain's `test-cases/` reflects 100% of Phase 1's inventory, with no feature, role, or tenant-boundary uncovered. Commit per domain once its test-case doc is complete.

## Phase 3 — Unit testing

1. For every backend resolver/service (starting with any domain not yet covered by `CLAUDE.md`'s Priority 1 work), write/complete `.spec.ts` covering: happy path, validation failures, RBAC allow/deny per the matrix, tenant-isolation.
2. For frontend components with real logic (not pure presentation), write/complete Jest unit tests for the same categories where applicable.
3. Run `npm test` (backend) and `npm test` (frontend) per domain. For any failure, apply rules 9–10 (fix the code, re-run, loop until green or capped at 3 attempts) before moving to the next test.

**DoD:** every domain has unit coverage matching its `test-cases/` Unit section 1:1. All green, actually run — not "green after I stopped checking."

## Phase 4 — Integration / API testing

1. Against a real test database (not mocks), exercise every GraphQL operation directly (resolver-level or via a GraphQL test client) — confirm contract shape matches `frontend/src/graphql/*.js` exactly (field names, nullability, response convention per `CLAUDE.md`'s three-conventions note).
2. Run the full RBAC matrix as real authenticated requests with real JWTs per role — confirm each allow/deny cell behaves as specified.
3. Run tenant-isolation cases as real cross-tenant requests — confirm rejection.
4. For any contract mismatch, wrong RBAC outcome, or tenant leak found, apply rules 9–10 — fix the resolver/guard/DTO, re-run, loop until it passes correctly.

**DoD:** every domain's Backend-API section in `test-cases/` has a corresponding executed integration test with a recorded pass/fail, and every failure found was fixed and re-verified (or logged as a capped-out blocker per rule 10).

## Phase 5 — End-to-end testing (Playwright + live Chrome MCP verification)

1. For every critical user journey per role (patient booking a slot, clinician managing availability, admin managing an org, receptionist checking in a patient, etc.), write/complete a Playwright e2e test running against the real running stack (`docker compose up -d`), not mocks.
2. Include at least one e2e test per domain proving a denied-role case is correctly blocked in the actual UI (not just the API), e.g. a receptionist cannot see billing settings.
3. Run `npm run e2e` and record actual pass/fail — screenshots/traces on failure. For any failure, apply rules 9–10: fix the actual frontend/backend bug the trace points to, re-run the specific e2e test, loop until it passes.
4. **Then, separately, use the Chrome MCP server to live-drive the same critical journeys** (rule 11) — this catches what assertion-based Playwright specs can miss: visual breakage, real mobile-viewport rendering at 360/768/1280px, and RBAC UI gaps (a denied role seeing a broken page instead of a proper denied state). Capture screenshots into `test-result/`.

**DoD:** every domain's Functional-E2E section has an executed, real-stack e2e test with recorded results, plus a live Chrome MCP walkthrough with screenshots for that domain's critical journeys and RBAC/responsiveness checks, and every failure found (from either method) was fixed and re-verified (or logged as a capped-out blocker per rule 10).

## Phase 6 — Smoke testing

1. Build (or extend if one already exists) a fast, small smoke suite — the minimum set of tests that prove the system is fundamentally alive: login for each role, one core read and one core write per domain, health check.
2. This suite should run in under a few minutes and be suitable as a deploy/CI gate — not exhaustive, just "did we break something obviously."
3. Run it. Any failure here is high-priority — it means something fundamental broke — so apply rules 9–10 immediately, then re-run the full smoke suite (not just the one failing case) to confirm the fix didn't break anything adjacent.

**DoD:** a documented, runnable smoke suite exists, distinct from the full e2e suite, with a recorded fully-green run.

## Phase 7 — Record results and suggestions

1. For every feature/domain, write or update the matching `test-result/` file: what was run, when, final pass/fail counts (which should be all-pass except capped blockers), what was found broken and fixed along the way, and links to any still-open blockers — not a vague "looks good."
2. For every gap found and fixed (missing RBAC check, contract mismatch, a page silently on mock data) or found and still open (rule 10 cap), write or update the matching `test-suggestion/` file with a concrete, specific account — what broke, what you changed (or why you stopped after 3 attempts), and residual risk if any.
3. Produce a final summary: total features covered, total RBAC cells tested (and how many were found failing, then fixed), tenant-isolation cases tested and any fixed, e2e journeys covered, smoke suite status, total bugs fixed during the pass, and a prioritized list of (a) any still-open blockers and (b) any security-relevant findings at the top.

**DoD:** `test-result/` and `test-suggestion/` are complete and current for every domain touched in Phases 2–6, every fixable failure was actually fixed and re-verified (not just logged), and a final summary report exists (e.g. `context/qa-full-pass-summary.md`).

## How to work

Go phase by phase, domain by domain within each phase. Within a domain, test → fix → retest is one continuous loop, not a test pass followed by a separate fix pass later. State which DoD items are satisfied after finishing each domain before moving to the next. Don't ask permission between routine steps — only stop for a genuine ambiguity (e.g. unclear intended permission for a role), a security-relevant finding worth flagging immediately, or a rule-10 capped blocker you can't resolve. Commit per domain per `CLAUDE.md`'s commit rules, on the current branch — the commit for a domain includes its test-case updates, its tests, and any fixes made to pass them, together.