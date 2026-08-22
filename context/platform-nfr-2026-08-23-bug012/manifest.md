---
id: CTX-platform-nfr-2026-08-23-bug012
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG012
related: [BUG007, REQ035]
---

# platform-nfr — BUG012, closing the tenancy matrix's KNOWN_GAPS domains (2026-08-23)

First of three sequenced slices to actually finish `project-plans/06-execution-plan.md`'s
P1 ("prove the boundary"), which `07-prd-gap-analysis-and-roadmap.md` names as
a hard prerequisite before any of the 22 PRD-derived requirements
(`REQ014`–`REQ035`) may proceed to implementation planning. `CLAUDE.md`'s
"Phase F COMPLETE" claim maps to P0 plus part of P1, but P1.3's own DoD
("the tenancy matrix covers every domain") wasn't met — `BUG007` left 10 of
21 tenant-scoped domains in a frozen `KNOWN_GAPS` list. This bundle closes
that.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG012 | [tenancy matrix KNOWN_GAPS closed](../../requirements/platform-nfr/bug/BUG012-platform-nfr-2026-08-23-tenancy-matrix-known-gaps-closed.md) |
| implementation-plans | PLAN033 | [close the 10 KNOWN_GAPS domains](../../implementation-plans/platform-nfr/bug/PLAN033-platform-nfr-2026-08-23-close-tenancy-matrix-known-gaps.md) |
| test-plans | TP060 | [verification plan](../../test-plans/platform-nfr/bug/TP060-platform-nfr-2026-08-23-tenancy-matrix-known-gaps-verification.md) |
| test-results | TR059 | [verification results](../../test-results/platform-nfr/bug/TR059-platform-nfr-2026-08-23-tenancy-matrix-known-gaps-verification.md) |
| test-suggestions | — | skipped — extends an already-proven harness pattern, not exploratory |

## What changed

| File | Change | Commit |
|---|---|---|
| `availability.resolver.ts` | `availabilities` gated `manager/admin/super_admin/staff` (was ungated) | `d818e1e` |
| `blocks.resolver.ts` | `spacerBlocks`/`roomBlocks` gated `manager/admin/super_admin`; `getSpacerBlocks` gated + takes `user` | `d818e1e` |
| `blocks.service.ts` | `getSpacerBlocks` now self/org-scoped (was a live cross-tenant IDOR) | `d818e1e` |
| `availability.resolver.spec.ts`, `blocks.resolver.spec.ts` (new), `blocks.service.spec.ts` | unit coverage for the above | `d818e1e` |
| `test/integration/setup/domain-cases.ts` | 7 new `CASES` entries (reviews, cancellation-rules, availability, analytics, blocks, dashboard, services) | `af9c2dc` |
| `test/integration/setup/fixture.ts` | new org-A/org-B rows for `Reviews`, `ProductCancellationRules`, `ClinicianAvailability`, `SpacerBlocks` | `af9c2dc` |
| `test/integration/matrix-coverage.int-spec.ts` | `organizations`/`org-settings`/`notifications` → `EXEMPT`; `KNOWN_GAPS` → `[]` | `af9c2dc` |
| `project-plans/02-findings-register.md`, `06-execution-plan.md` | F-25 and P1.3 marked closed, with the exemption reasoning cross-referenced | (docs, this pass) |

## Outcome

The tenancy matrix now classifies all 21 tenant-scoped resolver domains
(covered or exempt with a stated reason) instead of 12. Three real,
previously-undiscovered authorization gaps found and fixed while writing the
new cases — matching this project's own established pattern that reading a
domain's real source while writing its matrix case finds a real bug nearly
every time.

## What this does not do

- Does not finish P1 — items 1.5 (realistic seed dataset + separate e2e
  database) and 1.6 (frontend unit tests: `AuthContext`, `ProtectedRoute`/
  `RoleGuard`, booking-wizard validation, currency/date utils) remain,
  sequenced as their own future slices per the user's explicit choice to do
  P1 one slice at a time.
- Does not unblock `REQ014`–`REQ035` implementation planning — that still
  needs 1.5 and 1.6 done too, per `07-prd-gap-analysis-and-roadmap.md`'s own
  stated prerequisite.
- Does not touch `booking-concurrency.int-spec.ts` (P1.4) — it already
  existed, already correctly documents itself as `it.failing` pending P3's
  exclusion constraint, and needed no changes.
