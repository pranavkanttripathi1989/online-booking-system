---
feature: test-coverage-audit
date: 2026-08-22
ids: [REQ013, PLAN023, PLAN024, PLAN025, PLAN026]
status: done
---

# test-coverage-audit — 2026-08-22

A ground-truth audit of the five-root documentation workflow (`requirements/`, `implementation-plans/`, `test-plans/`, `test-results/`, `test-suggestions/`), verified by listing actual directory contents and reading actual frontmatter rather than trusting the (known-stale) root `README.md` summary tables. Found: 4 real coverage gaps (`public` domain, `organizations` admin CRUD, orphaned `organization-onboarding` suggestion, and the unbacked `tasks`/`waiting-room` pages), a correctness risk where two mock-era test-plans (`TP003` appointments, `TP011` clinicians) document mock-fallback behavior as spec-correct that the same-day Priority 3 mock-removal sweep found and fixed as real bugs, a duplicate-ID collision (`TP045`/`TR044` each exist twice, under `products` and `settings`), 11 dangling `in-progress` context bundles (some nearly five months old by this repo's internal dates), archive infrastructure (`test-results/_archive/`) referenced in `CLAUDE.md` but not present on disk, and a quiet process drift where every "real era" feature skips the suggestion-review stage `CLAUDE.md`'s documented workflow still describes.

Scoped into four closure phases (A–D) rather than one slice, each to get its own `PLAN###` against `REQ013` as parent: (A) rewrite the two mock-era plans that now contradict fixed behavior, (B) close the real coverage gaps, (C) close or justify the dangling bundles and resolve `REQ006`'s stuck `in-progress` status, (D) record and act on a decision about the suggestion-stage drift. No phase closes without a real `test-results/` entry (or, for the two documentation-only phases C/D, an equivalent self-evidencing verification — see each `PLAN###`), per the same hard rule (`CLAUDE.md` rule 7) this audit is checking everyone else against.

**Status:** All four phases done. `REQ013` closed.

## Requirement

- [REQ013 — Test documentation coverage: gap analysis & closure requirements](../../requirements/test-coverage-audit/requirement/REQ013-test-coverage-audit-2026-08-22-documentation-gap-analysis.md) — done, all four phases complete

## Implementation plans

- [PLAN023 — Phase A: rewrite the mock-era test-plans that now endorse fixed bugs](../../implementation-plans/test-coverage-audit/requirement/PLAN023-test-coverage-audit-2026-08-22-phase-a-rewrite-mock-era-plans.md) — done. In-place rewrite of `TP003`/`TP011` (appointments/clinicians) against the real, post-Priority-3-sweep backend/frontend contract, with the previously-mock-endorsed behaviors called out as the bugs they turned out to be; `TR003`/`TR010` re-issued with real live verification.
- [PLAN024 — Phase B: close the real documentation-coverage gaps](../../implementation-plans/test-coverage-audit/requirement/PLAN024-test-coverage-audit-2026-08-22-phase-b-close-real-gaps.md) — done. `TP052`/`TR051` written for admin org CRUD (`organizations`); `TP053`/`TR052` written for `backend/src/public/**` (`TP005` marked superseded in place); `TS025` re-checked and deliberately left un-promoted with a note explaining why. No bugs found in either domain.
- [PLAN025 — Phase C: close or justify the dangling context bundles, resolve the archive-infrastructure question](../../implementation-plans/test-coverage-audit/requirement/PLAN025-test-coverage-audit-2026-08-22-phase-c-close-dangling-bundles.md) — done. 8 of 11 dangling bundles closed to `done` (`REQ006` for real, 7 more as process-drift hygiene per Finding 6); 2 reconfirmed as already correctly justified open; 1 already closed in Phase A. `archive-sweep.mjs --apply` run for real for the first time, archiving 6 eligible bundles; `test-results/_archive/README.md` created as a real stub.
- [PLAN026 — Phase D: decide and record whether the suggestion stage is still required for new features](../../implementation-plans/test-coverage-audit/requirement/PLAN026-test-coverage-audit-2026-08-22-phase-d-suggestion-stage-decision.md) — done. Put the choice to the user directly per `CLAUDE.md` Hard Rule 10; decided conditional — required for exploratory/ambiguous features, skippable for well-scoped slices against a proven pattern. Recorded in `context/open-questions.md` #9, `CLAUDE.md` working loop step 4 rewritten to match.

## Related

- [organization-onboarding — 2026-08-17 bundle](../organization-onboarding-2026-08-17/manifest.md) — TS025, the orphaned suggestion Finding 1 flagged for promotion; Phase B decided against promoting it (no backend exists) and left the bundle `in-progress` with that reasoning on record.
- [communications-policies — 2026-08-20 bundle](../communications-policies-2026-08-20/manifest.md) — REQ006, the requirement Finding 4 flagged as the only non-`done`/`approved` requirement doc in the tree; closed for real in Phase C once its dependent requirements (`REQ008`, `REQ010`, `REQ011`, `REQ012`) were confirmed to have already resolved every open question it deferred.
