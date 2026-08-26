---
id: REQ035
type: requirement
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: null
related: []
---

# Platform non-functional requirements: performance, scale, availability, accessibility, localisation

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §7 (System Architecture & Tenancy Model) and §13 (Non-Functional Requirements) in full. Cross-referenced against `project-plans/analysis/01-codebase-analysis.md` and `project-plans/analysis/06-execution-plan.md` P0/P3.

## Current state vs. PRD ambition

This requirement is unusual among the set: it is not primarily about missing features, but about whether the platform can carry the PRD's stated scale target (§13: 5,000 tenants, 50,000 concurrent staff sessions at peak, 5M appointments/month, 50M patient records by Year 2) at all. `project-plans` already answered a large part of this question independently, and this requirement should be read as adopting those findings as its own acceptance criteria rather than re-deriving them.

**The single most important fact here:** `project-plans/analysis/02-findings-register.md` F-13 found **zero declared indexes across all 41 Prisma models** (`grep -c "@@index" schema.prisma` → 0), confirmed live against the running database (`\d "Appointments"` shows only the primary key). At the current 4 appointments this is invisible; at the PRD's stated Year-2 target of 5 million appointments/month it is not a performance problem, it is an outage. **No module in this entire PRD-derived requirements set should ship new tenant-scoped tables without indexes on their scoping and hot-query columns from day one** — the cost of fixing this retroactively across 20+ new modules would be far higher than building it in correctly now.

Similarly, `project-plans` F-14 (unbounded list resolvers) and F-15 (N+1 query patterns, JS-side aggregation) describe exactly the failure modes the PRD's peak-load NFR (9–11 AM and 6–9 PM IST, per §13) would expose first, since that's precisely when every clinic's queue board, calendar, and dashboard are being refreshed simultaneously.

Gaps genuinely new to this requirement, not already covered by `project-plans`:

1. **Offline resilience** (front desk must continue check-in for ≥15 min of connectivity loss) — no such capability exists in the frontend architecture at all; flagged already as needing its own technical spike under `REQ019`.
2. **Low-bandwidth mode** (<300 KB initial payload) — the current Vite/React bundle has not been measured or budgeted against this target.
3. **Accessibility** (WCAG 2.1 AA on patient-facing surfaces) — not audited; `project-plans` didn't specifically check this.
4. **Localisation** (English + Hindi + 6 regional languages) — no i18n framework exists in the frontend at all (`project-plans/analysis/05-competitive-analysis.md` Tier 3 item 14).
5. **Formal SLOs and error budgets** — no structured logging/tracing/business-metric alerting exists; `project-plans` F-26 (no CI) and general observability gaps mean there's no measurement infrastructure to even know if an SLO is being met.
6. **Deployability requirements** (feature flags for progressive rollout, per-tenant canary, zero-downtime migrations) — no feature-flag system exists.

## Gap classification

- **Already scoped as fixes elsewhere (adopt, don't duplicate):** F-13 (indexes), F-14 (pagination), F-15 (N+1/aggregation) — `project-plans/analysis/06-execution-plan.md` P0/P3 items. This requirement's role is to make those fixes a **standing engineering constraint for every future module** in this requirements set, not to re-plan them.
- **Net-new:** offline resilience, low-bandwidth budget, accessibility audit and remediation, i18n framework, observability/SLOs, feature-flag/canary deployment infrastructure.

## Phase assignment

PRD Phase: performance/scale/security/auditability NFRs are effectively **MVP-blocking (P0)** in spirit — the PRD does not phase-tag `§13` explicitly, but a product that cannot survive its own stated peak-load pattern cannot honestly claim MVP status regardless of feature completeness. Accessibility and localisation are **V1 GA (P1)**, matching the PRD's own "at GA" language for both. Feature-flag/canary deployment is **ongoing platform maturity**, matching `project-plans/06`'s own "Wave C / continuous" framing for comparable items.

## Dependencies

- **Requires:** `project-plans/analysis/06-execution-plan.md` P0 (index migration, CI) as a hard prerequisite — no module in this requirements set (`REQ014`–`034`) should be implemented before that P0 phase completes, since every one of them adds new tenant-scoped tables that would otherwise repeat F-13.
- **Blocks:** implicitly gates every other requirement's "done" definition — a feature that is functionally correct but violates the indexing/pagination/N+1 constraints below is not actually done per this requirement's acceptance bar.

## User stories

### Epic: Performance and scale (adopting project-plans findings as acceptance criteria)

**US-NFR-01** — As the system, I want every new tenant-scoped table to carry indexes on its `client_org_id`-equivalent scoping column and its hot query paths from the day it's created, so that the platform doesn't accumulate the same defect 20 more times across this requirements set.
- PRD refs: §7.2 (data layer), §13 (scale)
- Priority: P0
- Acceptance criteria: given any new table introduced by `REQ014`–`034`, its migration includes the relevant `@@index` declarations in the same commit that creates the table — this is a code-review gate, not a follow-up task.
  - This closes `project-plans` F-13 as a forward-looking standing rule, in addition to the backward-looking fix already scoped in `project-plans/analysis/06-execution-plan.md` P0 item 0.4 for the 41 existing models.

**US-NFR-02** — As the system, I want every list-returning resolver to be paginated or capped by default, so that a large tenant's catalogue or appointment history cannot degrade the API for every other tenant.
- PRD refs: §13 (scale)
- Priority: P0
- Acceptance criteria: no new resolver in this requirements set returns an unbounded array — this closes `project-plans` F-14 as a standing rule for new work, alongside the existing-resolver fix in `project-plans/analysis/06-execution-plan.md` P3.

**US-NFR-03** — As the system, I want aggregation (counts, sums, medians) computed in the database, not by looping over full result sets in application code, so that reporting and queue/ETA calculations stay fast as data volume grows.
- PRD refs: §13 (performance targets: slot-availability p95 < 400ms, queue board update latency < 2s)
- Priority: P0
- Acceptance criteria: `REQ017`'s throughput/ETA calculation and `REQ029`'s report queries use SQL `groupBy`/`count`/window functions, not JavaScript loops — this closes `project-plans` F-15 as a standing rule for new work.

### Epic: Offline resilience and low-bandwidth mode

**US-NFR-04** — As front-desk staff, I want to keep checking patients in and recording vitals during a connectivity loss of up to 15 minutes, with automatic sync on recovery, so that a network blip doesn't stop the clinic from running.
- PRD refs: §13 "Offline resilience"
- Priority: P1
- Acceptance criteria: given a simulated 15-minute connectivity loss, check-in and vitals entry continue functioning against a local cache, and every locally-recorded action syncs correctly (with conflict resolution defined, not assumed) once connectivity returns.

**US-NFR-05** — As a patient on a low-end Android device in a tier-3 city, I want the booking page and PWA to load quickly even on a poor connection, so that the product doesn't implicitly exclude people outside metro areas.
- PRD refs: §13 "Low-bandwidth mode", "Browser/device"
- Priority: P1
- Acceptance criteria: the initial payload for the lightweight UI mode is measured and budgeted under 300 KB; the patient PWA is verified functional on a 2 GB RAM device budget, not just assumed to work because it works on a developer's machine.

### Epic: Accessibility and localisation

**US-NFR-06** — As a patient using assistive technology, I want every patient-facing surface to meet WCAG 2.1 AA, so that the booking and portal experience isn't inaccessible by default.
- PRD refs: §13 "Accessibility"
- Priority: P1
- Acceptance criteria: an accessibility audit is run against every patient-facing route (booking page, PWA, doctor profile) with findings tracked to closure, not just a stated intent; minimum 16px base type and high-contrast queue displays are verified, not assumed.

**US-NFR-07** — As a non-English-speaking user (staff or patient), I want the UI itself available in Hindi and regional languages at GA, so that language isn't a barrier to adopting the product.
- PRD refs: §13 "Localisation"
- Priority: P1
- Acceptance criteria: an i18n framework is introduced to the frontend (none exists today); English + Hindi + the PRD's minimum of 6 regional languages are supported at GA, with correct INR formatting and Indian date formats throughout — coordinated with `REQ027`'s patient-portal localisation story so the two aren't built twice.

### Epic: Observability and deployability

**US-NFR-08** — As an on-call engineer, I want structured logs, distributed tracing, and business-metric alerting (e.g., a live tenant's bookings dropping to zero pages someone), so that a real incident is caught by monitoring, not by a support ticket.
- PRD refs: §13 "Observability"
- Priority: P1
- Acceptance criteria: the specific business-metric alert named in the PRD (a live tenant's appointment volume dropping to zero) exists and pages on-call, as a concrete, testable example of the broader observability requirement.

**US-NFR-09** — As an engineer shipping a risky change, I want feature flags for progressive rollout and per-tenant canary deployment, so that a bad change affects one tenant, not all 5,000.
- PRD refs: §13 "Deployability"
- Priority: P2
- Acceptance criteria: a feature-flag system exists that can gate a new capability to a specific tenant or percentage of tenants before full rollout.

## Data model impact

No new domain tables — this requirement's data-model impact is entirely about the *indexing discipline* applied to every other requirement's tables, plus:

- New `FeatureFlags`/`FlagAssignments` tables for progressive rollout (distinct from `REQ032`'s plan-entitlement feature flags — this is a deployment-risk mechanism, not a commercial-packaging one, and the two should not be conflated into one system).

## Non-functional notes

This requirement is, in effect, the engineering constitution the other 21 requirement documents in this set must operate under. Its acceptance criteria should be enforced as review-gate checklist items (indexes on new tables, pagination on new lists, no JS-side aggregation) applied to every pull request touching `REQ014`–`034`, not tracked as a separate, deferrable backlog item.

## Open questions

None raised in PRD §19 specific to this module — the PRD treats these NFRs as settled targets, not open questions.
