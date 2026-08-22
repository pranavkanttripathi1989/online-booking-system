---
feature: test-coverage-audit
date: 2026-08-22
ids: [REQ013, PLAN023]
status: in-progress
---

# test-coverage-audit — 2026-08-22

A ground-truth audit of the five-root documentation workflow (`requirements/`, `implementation-plans/`, `test-plans/`, `test-results/`, `test-suggestions/`), verified by listing actual directory contents and reading actual frontmatter rather than trusting the (known-stale) root `README.md` summary tables. Found: 4 real coverage gaps (`public` domain, `organizations` admin CRUD, orphaned `organization-onboarding` suggestion, and the unbacked `tasks`/`waiting-room` pages), a correctness risk where two mock-era test-plans (`TP003` appointments, `TP011` clinicians) document mock-fallback behavior as spec-correct that the same-day Priority 3 mock-removal sweep found and fixed as real bugs, a duplicate-ID collision (`TP045`/`TR044` each exist twice, under `products` and `settings`), 11 dangling `in-progress` context bundles (some nearly five months old by this repo's internal dates), archive infrastructure (`test-results/_archive/`) referenced in `CLAUDE.md` but not present on disk, and a quiet process drift where every "real era" feature skips the suggestion-review stage `CLAUDE.md`'s documented workflow still describes.

Scoped into four closure phases (A–D) rather than one slice, each to get its own `PLAN###` against `REQ013` as parent: (A) rewrite the two mock-era plans that now contradict fixed behavior, (B) close the real coverage gaps, (C) close or justify the dangling bundles and resolve `REQ006`'s stuck `in-progress` status, (D) record and act on a decision about the suggestion-stage drift. No phase closes without a real `test-results/` entry, per the same hard rule (`CLAUDE.md` rule 7) this audit is checking everyone else against.

## Requirement

- [REQ013 — Test documentation coverage: gap analysis & closure requirements](../../requirements/test-coverage-audit/requirement/REQ013-test-coverage-audit-2026-08-22-documentation-gap-analysis.md) — approved, Phase A planned, Phases B–D not yet started

## Implementation plan

- [PLAN023 — Phase A: rewrite the mock-era test-plans that now endorse fixed bugs](../../implementation-plans/test-coverage-audit/requirement/PLAN023-test-coverage-audit-2026-08-22-phase-a-rewrite-mock-era-plans.md) — approved, not yet executed. Scopes an in-place rewrite of `TP003`/`TP011` (appointments/clinicians), triaged case-by-case against what's factually wrong (endorses since-fixed bugs) vs. still valid vs. already covered by this session's real e2e specs, plus a re-audit of two clinician-portal pages (`Calendar.jsx`, `Availability.jsx`) never checked for mock fallbacks this session.

## Related

- [organization-onboarding — 2026-08-17 bundle](../organization-onboarding-2026-08-17/manifest.md) — TS025, the orphaned suggestion Finding 1 flags for promotion in Phase B.
- [communications-policies — 2026-08-20 bundle](../communications-policies-2026-08-20/manifest.md) — REQ006, the requirement Finding 4 flags as the only non-`done`/`approved` requirement doc in the tree.
