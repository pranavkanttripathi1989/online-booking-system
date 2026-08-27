---
id: TP219
type: requirement
feature: revenue-share
created: 2026-08-27
updated: 2026-08-27
status: done
parent: PLAN199
related: [REQ158, TR219]
---

# TP219 — Test plan: doctor revenue-share & payouts engine (P2-06)

New feature slug, well-scoped against an already-proven pattern
(`resolveServicePrice()`'s own cascade, `setPayerTariff`'s own upsert
shape, `ClaimAppeals`' own "recompute only when still open" shape) —
suggestion stage skipped per `CLAUDE.md`'s conditional rule, drafted
directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1–5 | `resolveRevenueShare()`: clinician rule beats clinic beats org; falls through correctly at each level; returns `null` with no rule anywhere; a clinic rule for a different clinic never leaks through | `revenue-share.service.spec.ts` |
| 6–7 | `setRevenueShareRule` rejects a `clinic_id`/`clinician_id` belonging to a different org (Hard Rule 6) | same |
| 8 | Requires `clinic_id` for a clinic-scope rule | same |
| 9–10 | Creates a new rule when none exists; updates the existing rule in place instead of duplicating | same |
| 11 | Rejects an org-less non-platform caller (`ForbiddenException`, via `orgIdForWrite`) | same |
| 12–13 | `computeMonthlyPayouts` sums succeeded payments net of discount, grouped per clinician, applies the resolved share | same |
| 14 | Skips a clinician with no resolvable rule and reports their name in `skippedClinicianNames` rather than dropping them silently | same |
| 15 | US-REV-03: never overwrites an already-`approved` payout on recomputation; the untouched figure is still returned | same |
| 16 | Rejects a `clinic_id` from a different org | same |
| 17 | Returns immediately with no rule/clinician queries when there are no succeeded payments this month | same |
| 18–19 | `approvePayout` rejects a cross-org payout (`NotFoundException`, masked per `assertSameOrg`'s own convention); throws for a nonexistent id | same |
| 20 | A platform operator may approve across orgs | same |
| 21 | Approving an already-approved payout is idempotent — no re-stamp | same |
| 22–26 | Resolver: every handler gated `manager`/`admin`/`super_admin`; each handler purely delegates to the service with the exact args | `revenue-share.resolver.spec.ts` |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | The new migration (`RevenueShareRules`/`Payouts` tables + FKs) applies cleanly via `migrate deploy` |
| 2 | `matrix-coverage.int-spec.ts`'s own gate correctly fails on the new unclassified `revenue-share` domain until the `EXEMPT` entry is added, then passes |
| 3 | Full existing suite (414 tests) stays green — no regression from the two new models/back-relations |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | Loads the selected clinic, its share rules, and the current month's payouts | `manager/revenue-share/index.test.jsx` |
| 2 | Saves an org-level share rule via the form and the rules table refreshes with the new value | same |
| 3 | Runs the monthly payout computation and the resulting per-doctor row appears | same |
| 4 | Approves a pending payout and its status updates to Approved | same |

## Out of scope for this test plan

- Actual money disbursement (bank/UPI/Razorpay Route payout) — this
  slice produces the statement, not a transfer; no payout vendor exists
  in this codebase (see REQ158's own scope note).
- Historical share-rule versioning/audit trail beyond the payout's own
  `share_percentage_used` snapshot.
- E2E/Playwright coverage — a new, isolated manager page;
  `MockedProvider`-based unit coverage against the real query/mutation
  contracts is the established pattern for this codebase's own
  manager-page test files (matching `manager/imports`' own precedent).
