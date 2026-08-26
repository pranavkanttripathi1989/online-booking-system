---
name: careos-phase-planning
description: Navigate the CareOS PRD, its 22 derived requirements, and the phase-wise technical plans to answer "what should we build next" or "how does this PRD feature map onto our codebase". Use when starting new PRD-derived product scope, asking which phase something belongs to, checking what blocks what, or planning a slice from a PRD FR-ID. Triggers on "what's next", "which phase", "PRD", "CareOS", "FR-", "roadmap", "what should I build", "is this blocked", "REQ0" ids in the 014-035 range.
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-22 alongside the technical plans it indexes. Grounded in
    PRD-Healthcare-Booking-SaaS-India.md, the 22 requirement documents derived
    from it, and the 2026-08-22 codebase audit — all in-repo, no external
    sources.
---

# CareOS phase planning

Answers "what do we build next, and how does it land on this codebase".

## The four planning layers — don't duplicate between them

| Layer | Answers | Location |
|---|---|---|
| **PRD** | What is the product, commercially and functionally? | `PRD-Healthcare-Booking-SaaS-India.md` |
| **Requirements** | What must each module do? Stories, acceptance criteria, `FR-*` traceability. | `requirements/<feature>/` — `REQ014`–`REQ035` |
| **Technical plans** | How is it built? Schema, constraints, module layout, sequencing. | `project-plans/technical-plans/` |
| **Implementation plans** | The slice-specific plan, written after reading real code. | `implementation-plans/<feature>/` — `PLAN###` |

Technical plans are a *starting architecture*, not a substitute for plan mode.
The working loop still requires exploring the actual code before a `PLAN###`.

## Phase map

| Phase | Theme | Requirements |
|---|---|---|
| **F — Foundation** *(blocks everything)* | Tenant-scoping helper, indexes, CI, mock-auth removal, tenancy-matrix harness | — (`project-plans/06` P0/P1) |
| **1 — MVP** "Run the OPD day" | Org hierarchy, dual-mode scheduling, booking, queue, EMR, Rx, billing, plan builder | `REQ014` `REQ016` `REQ017` `REQ018` `REQ019` `REQ020` `REQ021` `REQ023` `REQ032` |
| **2 — V1 GA** "Sellable to chains" | Pharmacy, WhatsApp, telemedicine, ABDM M1–M3, OPD cashless, e-mandate, public API, RBAC enforcement, DPDP | `REQ015` `REQ022` `REQ024` `REQ025` `REQ026` `REQ027` `REQ028` `REQ030` `REQ031`(P1) `REQ033` `REQ034` |
| **3 — V2** "Depth & moat" | Full insurance desk, NHCX, labs, IPD-lite, AI scribe, speciality packs, schemes | `REQ029` (partly) + new follow-on REQs |

Cross-phase standing constraints: `REQ035` (platform NFRs).

## Phase F is a hard gate, not a suggestion

The PRD adds ~40 new tenant-scoped tables. Every one inherits the
`client_org_id`-scoping bug class (F-01/F-04/F-05) and the zero-index defect
(F-13) unless the shared helper, the index migration, and the tenancy-matrix
integration test land first.

Building Phase 1 on the current foundation means fixing those defects ~40 times
instead of once. If asked to start Phase 1 work before Phase F is done, say so
rather than proceeding quietly.

## Sequencing rules that aren't obvious from the dependency graph

1. **`REQ017` (scheduling) is the critical path** in Phase 1 — the PRD's own "heart of the product", and `REQ019` (queue) is meaningless without its session/token mode.
2. **`REQ016`'s drug master must precede `REQ021`** (prescriptions), which must precede `REQ022` (pharmacy).
3. **`REQ025` (WhatsApp) should ship first and early in Phase 2** — highest ROI in the whole audit, zero dependencies, and the provider registry already exists.
4. **`REQ028` (ABDM) certification paperwork starts on day one of Phase 2**, regardless of build timing — external gated process, long lead time, PRD risk R2.
5. **`REQ015` (RBAC enforcement) lands early in Phase 2** — every new role (Pharmacist, Insurance Desk) is decorative until permissions are enforced.
6. **`REQ021`'s TPG drug-list guardrails must precede `REQ026`** (telemedicine) — prescribing over video without them is a regulatory violation, not a missing feature.
7. **`REQ031` is OPD-first**, per the PRD's own Open Question 10. IPD pre-auth/claims/NHCX are Phase 3, designed against real Phase 2 usage — not speculatively now.

## Mapping a PRD `FR-*` id to work

1. Find its module (M1–M17) in PRD §9.
2. Look up the module in `project-plans/analysis/07-prd-gap-analysis-and-roadmap.md` §1 — that table maps every module to its feature slug, current state, and `REQ` id.
3. Open that `REQ` document for the acceptance criteria.
4. Open the matching phase document in `technical-plans/` for the schema and constraints.
5. *Then* enter plan mode, read the real code, and write the `PLAN###`.

## Current state, honestly

Of the PRD's 20 module rows: **9 are entirely unbuilt** (queue management,
clinical records, prescriptions, pharmacy, telemedicine, ABDM, public API,
insurance, platform e-mandate billing); **11 are partial** — real working
foundations with specific named gaps. **None are fully satisfied.**

The booking/scheduling core is genuinely competitive and worth building on. The
clinical, pharmacy, insurance and interoperability layers that make it a full
practice-management platform are almost entirely absent.

## When the PRD and the codebase disagree

- **PRD wins on product behaviour** (what it does, what the user sees).
- **Codebase wins on convention** (naming, GraphQL dialect, response shape, tenancy pattern, money representation).
- **Neither wins silently on architecture** — adapt the PRD's intent onto the existing shape and record the deviation in the slice's `PLAN###`.
- **Genuine ambiguity → stop and ask** (Hard Rule 10), logged in `context/open-questions.md`.

Several PRD open questions are unresolved and block specific slices: drug
database build-vs-license (§19.4, blocks `REQ016` real data), regional-language
priority (§19.8), free-tier strategy (§19.6), lab build-vs-integrate (§19.7),
payer-partnership approach (§19.11). Check before scoping those areas.
