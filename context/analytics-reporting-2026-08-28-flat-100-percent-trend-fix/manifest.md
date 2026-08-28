---
id: CTX-analytics-reporting-2026-08-28-flat-100-percent-trend-fix
type: bug
feature: analytics-reporting
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG035, BUG042, PLAN206, TP226, TR226]
---

# The flat-100%-trend bug class — fixed (2026-08-28)

Fourth fix batch from the 2026-08-28 five-role QA sweep. `BUG035`
(`/manager/dashboard`) and `BUG042` (`/staff/dashboard`, a separate
independently-implemented instance of the same defect in a different
service) both fabricated a flat 100% (or 0%) trend badge whenever the
prior comparison period had no recorded activity — the common state
for a fresh org or thin historical data.

Fixed both `pctChange` implementations to return `null` instead of a
guessed number; made the corresponding GraphQL fields nullable;
updated every frontend consumer to render no badge on `null` rather
than coercing it into a fabricated "0%". One consumer
(`dashboard/index.jsx`'s `KpiCard`) needed no change at all — it was
already written defensively for a `null` trend it had just never
actually received before. Two pre-existing backend tests that asserted
the old fabricated values (pinning the bug in place, per this
codebase's own standing CLAUDE.md warning) were fixed to assert
`null`.

Deliberately did *not* extract one shared cross-service `pctChange`
helper, despite `BUG042`'s own suggestion — the function is 3 lines,
and a shared-module dependency between `analytics` and `dashboard`
felt like more real cost than the duplication; both copies now
cross-reference each other in a comment instead.

Live-verified against the real dev stack for both pages.

## Documents

- `requirements/analytics-reporting/bug/BUG035-*.md` (done)
- `requirements/dashboard/bug/BUG042-*.md` (done)
- `implementation-plans/analytics-reporting/bug/PLAN206-*.md`
- `test-plans/analytics-reporting/bug/TP226-*.md`
- `test-results/analytics-reporting/bug/TR226-*.md`
