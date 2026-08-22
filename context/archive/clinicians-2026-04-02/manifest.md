---
feature: clinicians
date: 2026-04-02
ids: [TP011, TR010, TS010, REQ013, PLAN023]
status: done
---

# clinicians — 2026-04-02 (rewritten 2026-08-22 under `REQ013`/`PLAN023` Phase A)

`TP011`/`TR010` were fully rewritten against the real backend under `REQ013`'s Phase A (see `context/test-coverage-audit-2026-08-22/manifest.md`) — the mock-era version documented a fake profile-rating/education field and a non-existent "weekend unavailable" placeholder as correct, and never asserted that Save actually persists a real clinician (the exact blind spot that let `CreateClinicianPage.jsx`'s `const useMock = true` ship). Four real bugs were found and fixed this session across `clinicians/{index,CreateClinicianPage,detail}.jsx` and `clinician/{Availability,Calendar}.jsx`; both docs now carry `parent: REQ013`.

`TS010` is left as historical record of the mock-era baseline.

## Requirement

- [REQ013 — Test documentation coverage: gap analysis & closure requirements](../../requirements/test-coverage-audit/requirement/REQ013-test-coverage-audit-2026-08-22-documentation-gap-analysis.md) — approved (Phase A)

## Implementation plan

- [PLAN023 — Phase A: rewrite the mock-era test-plans that now endorse fixed bugs](../../implementation-plans/test-coverage-audit/requirement/PLAN023-test-coverage-audit-2026-08-22-phase-a-rewrite-mock-era-plans.md) — approved, clinicians portion executed

## Test suggestion

- [TS010 — Clinicians — Feature Suggestions (Session 4 — 2026-03-30)](../../test-suggestions/clinicians/requirement/clinicians-test-suggestion.md) — historical, mock-era baseline, superseded by the rewrite above

## Test plan

- [TP011 — Clinicians — Test Plan](../../test-plans/clinicians/requirement/clinicians-test-plan.md) — approved, rewritten 2026-08-22 against the real backend

## Test result

- [TR010 — Clinicians — Test Result](../../test-results/clinicians/requirement/clinicians-test-results.md) — passed, re-executed 2026-08-22 against the real backend

## Related

- [clinician-availability — 2026-08-19 bundle](../clinician-availability-2026-08-19/manifest.md) — a separate feature slug covering the exact same `clinician/Availability.jsx` file (`TP007`), a genuine cross-feature duplication not yet merged or fully rewritten.

