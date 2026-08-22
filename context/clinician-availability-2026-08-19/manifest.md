---
feature: clinician-availability
date: 2026-08-19
ids: [TP007, TR006, TS006, REQ013]
status: in-progress
---

# clinician-availability — 2026-08-19

3 linked documents across 3 roots. No requirements doc exists for this feature yet — every downstream doc's `parent` is `unknown`. Still has open work.

**2026-08-22 addendum:** this feature's file (`clinician/Availability.jsx`) is also covered by `test-plans/clinicians/requirement/clinicians-test-plan.md` (`TP011`) — a genuine cross-feature duplication `REQ013`'s original audit didn't catch, logged as an addendum to Finding 7. `TP011` was fully rewritten this session against the real backend after 3 real bugs were found and fixed in this exact file (wrong `clinicianId`, a `dayOfWeek` type mismatch, a `null`-vs-`'daily'` sentinel mismatch — see `TP011`/`TR010` and this session's `fix(frontend): clinician portal Availability/Calendar...` commit for full detail). `TP007` (this bundle) was checked and does not itself document the specific bug as correct (unlike `TP003`/`TP011`'s pre-rewrite versions), so it's lower-risk, but it has **not** been rewritten to reflect the real fix — flagged with a note in `TP007` itself rather than silently left stale. Still open work: a full `TP007` rewrite (or a merge of this feature slug into `clinicians`) is real follow-up, not done in this pass.

## Test suggestion

- [TS006 — Clinician Availability — Test Suggestions (Session 4 — 2026-03-30)](../../test-suggestions/clinician-availability/requirement/clinician-availability-test-suggestion.md) — in-progress, updated 2026-08-19

## Test plan

- [TP007 — Clinician Availability — Test Plan](../../test-plans/clinician-availability/requirement/clinician-availability-test-plan.md) — approved, updated 2026-04-02

## Test result

- [TR006 — Clinician Availability — Test Results (Session 4 / v4)](../../test-results/clinician-availability/requirement/clinician-availability-test-results.md) — done, updated 2026-08-19

