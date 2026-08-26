---
id: CTX-platform-nfr-2026-08-23-bug015
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG015
related: [BUG009, REQ035]
---

# platform-nfr — BUG015, P2 UI-truth quick wins (2026-08-23)

First slice of `project-plans/analysis/06-execution-plan.md` P2 ("Truth in the UI"),
picked after a full live audit of P2/P3 found only 1 of 14 items actually
done. Bundles the three cheapest, lowest-risk P2 items: the 3 missing
`TableContainer` wrappers (F-20), the dead `GlobalSearch` mock component
(F-18/2.3), and the stale "backend offline" Apollo debug line (F-21/2.7) —
plus one more real bug found while touching `RecentAppointmentsTable.jsx`
for its wrapper fix (an empty-result-treated-as-mock-fallback defect, same
class `BUG009` already fixed twice elsewhere).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG015 | [P2 UI-truth quick wins](../../requirements/platform-nfr/bug/BUG015-platform-nfr-2026-08-23-p2-ui-truth-quick-wins.md) |
| implementation-plans | PLAN036 | [implementation](../../implementation-plans/platform-nfr/bug/PLAN036-platform-nfr-2026-08-23-p2-ui-truth-quick-wins.md) |
| test-plans | TP063 | [verification plan](../../test-plans/platform-nfr/bug/TP063-platform-nfr-2026-08-23-p2-ui-truth-quick-wins-verification.md) |
| test-results | TR062 | [verification results](../../test-results/platform-nfr/bug/TR062-platform-nfr-2026-08-23-p2-ui-truth-quick-wins-verification.md) |
| test-suggestions | — | skipped — mechanical fixes against established patterns |

## What this does not do

- Does not touch P2.1's 4 remaining fabricated pages, P2.2's 3 backend-less
  pages, or P2.5's 88-file theme sweep — each tracked separately in
  `06-execution-plan.md`, none folded into this bundle.
- Does not change Apollo's *global* `cache-first` default to
  `cache-and-network` — that's a broader behavioral change needing testing
  across every list page, left open.
