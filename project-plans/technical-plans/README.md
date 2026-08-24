---
id: TECH000
type: index
feature: technical-plans
created: 2026-08-22
updated: 2026-08-25
status: active
parent: PP007
related: [PP002, PP006, PP007]
---

# technical-plans — phase-wise implementation detail

Engineering-level plans for building the CareOS product described in
`PRD-Healthcare-Booking-SaaS-India.md` on top of this codebase.

**Status note (2026-08-25):** "Phase 1 / MVP" below is substantially
built — every module it lists (org hierarchy, dual-mode scheduling,
booking, check-in/queue, EMR, Rx, billing, plan builder v1) has real,
tested code today, closed across Phase G/G+1/G+2 and this session's own
"Phase G+3" 8-slice batch (`REQ051`–`REQ058`). This document's own phase
*plans* (schema DDL, module layout, sequencing rationale) remain accurate
as engineering reference — what's stale is only the assumption, if read
without `CLAUDE.md`, that Phase 1 is still mostly ahead of the codebase
rather than mostly behind it. See `CLAUDE.md`'s own Phase G/G+1/G+2/G+3
sections and `07-prd-gap-analysis-and-roadmap.md`'s own staleness note
for what's actually shipped.

## How this relates to everything else

The repo now has three layers of planning, and they answer different questions.
Don't duplicate content between them.

| Layer | Question it answers | Where |
|---|---|---|
| **Requirements** | *What* should the product do, and why? User stories, acceptance criteria, PRD `FR-*` traceability. | `requirements/<feature>/` (`REQ014`–`REQ035`) |
| **Roadmap** | In *what order*, and what blocks what? | `project-plans/07-prd-gap-analysis-and-roadmap.md` |
| **Technical plans** (this directory) | *How* is it built? Schema DDL, migration order, module layout, resolver contracts, index strategy, integration points. | `project-plans/technical-plans/` |
| **Implementation plans** | The actual per-slice plan written immediately before coding, after reading the real code. | `implementation-plans/<feature>/` (`PLAN###`) |

**These are not a substitute for `implementation-plans/`.** `CLAUDE.md`'s working
loop still requires entering plan mode and exploring the real code before writing
a `PLAN###` doc for a specific slice. These documents give that step a technical
starting point — the schema shape, the constraint decisions, the sequencing — so
each slice's plan doesn't re-derive the same architecture from scratch.

## Documents

| Doc | Phase | Scope |
|---|---|---|
| [00-foundation-hardening.md](./00-foundation-hardening.md) | **Phase F** (prerequisite) | Tenant-scoping helper, index migration, CI, mock-auth removal, integration-test harness. Blocks everything below. |
| [01-phase1-mvp.md](./01-phase1-mvp.md) | **Phase 1 / MVP** | "Run the OPD day": org hierarchy, dual-mode scheduling, booking, check-in/queue, EMR, Rx, billing, plan builder v1. |
| [02-phase2-v1-ga.md](./02-phase2-v1-ga.md) | **Phase 2 / V1 GA** | "Sellable to chains": pharmacy, WhatsApp, telemedicine, ABDM M1–M3, insurance OPD cashless, e-mandate billing, public API. |
| [03-phase3-v2.md](./03-phase3-v2.md) | **Phase 3 / V2** | "Depth & moat": full insurance desk, NHCX, labs, IPD-lite, AI scribe, speciality packs, government schemes. |
| [04-data-model-evolution.md](./04-data-model-evolution.md) | cross-phase | Every schema change across all phases in dependency order, with migration-file naming, backfill strategy, and the index catalogue. |
| [05-cross-cutting-conventions.md](./05-cross-cutting-conventions.md) | cross-phase | Module scaffolding template, GraphQL dialect/response-convention decision table, testing obligations per slice, definition of done. |
| [06-frontend-architecture-and-mobile.md](./06-frontend-architecture-and-mobile.md) | cross-phase | Frontend/mobile plan for current **and** PRD surfaces: measured responsiveness audit (live-verified at 360 px), the responsive **tiering** model (mobile-first / tablet-first / desktop-dense), design-system and typography rules, PWA + performance budgets, frontend hard rules, and the CI gates that enforce them. |

## Reading order

New to this: `05-cross-cutting-conventions.md` first (it's the shortest and
everything else assumes it), then `00-foundation-hardening.md`, then the phase
document you're actually working in. Consult `04-data-model-evolution.md`
whenever you touch `schema.prisma`, and `06-frontend-architecture-and-mobile.md`
whenever you touch anything under `frontend/src`.

## The one hard prerequisite

`00-foundation-hardening.md` is not optional sequencing advice. Nine of the
PRD's twenty modules are entirely net-new and eleven more are extensions —
roughly 40 new tenant-scoped tables. Every one of them inherits the
`client_org_id`-scoping bug class (`project-plans/02-findings-register.md` F-01,
F-04, F-05) and the zero-index defect (F-13) if the shared helper and the index
discipline aren't in place first. Building Phase 1 on the current foundation
means fixing those defects ~40 times instead of once.
