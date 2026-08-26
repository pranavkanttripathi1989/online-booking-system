# project-plans — MediBook / CareOS

Planning root. Three folders, three different questions:

```
project-plans/
├── phase-plans/      WHAT to build, in order, front-end and back-end together
├── technical-plans/  HOW to build it — schema, conventions, FE architecture, rules
└── analysis/         WHY — point-in-time audits, findings, competitive, slice history
```

---

## Start here

| If you want to… | Read |
|---|---|
| **Know what to work on next** | [`phase-plans/README.md`](./phase-plans/README.md) — carries the `▶ CURRENT POSITION` block and the `continue` protocol |
| **Know what is actually built** | [`phase-plans/00-implementation-status.md`](./phase-plans/00-implementation-status.md) — measured, not inherited |
| **Build a slice** | [`technical-plans/05-cross-cutting-conventions.md`](./technical-plans/05-cross-cutting-conventions.md) (backend) + [`technical-plans/08-frontend-backend-integration.md`](./technical-plans/08-frontend-backend-integration.md) (the contract between halves) |
| **Touch any frontend file** | [`../FRONTEND_RULES.md`](../FRONTEND_RULES.md) + [`technical-plans/07-frontend-rules-compliance.md`](./technical-plans/07-frontend-rules-compliance.md) |
| **Understand the product strategy** | [`../PRD-v2-CareOS.md`](../PRD-v2-CareOS.md) — supersedes v1 where the market moved |
| **Know why a rule or finding exists** | [`analysis/`](./analysis/) — historical, cite for provenance only |

---

## The document hierarchy

Five layers. Don't duplicate content between them.

| Layer | Answers | Where |
|---|---|---|
| **PRD** | What is the product, commercially and functionally? | `PRD-v2-CareOS.md` (current) · `PRD-Healthcare-Booking-SaaS-India.md` (v1, still authoritative for unchanged architecture, RBAC, M1–M17 FRs, payments, data model) |
| **Phase plans** | What next, in what order, both tracks? | `phase-plans/` |
| **Technical plans** | How is it built? | `technical-plans/` |
| **Requirements → results** | The per-slice loop | `requirements/` → `implementation-plans/` → `test-plans/` → `test-results/` → `context/` |
| **Analysis** | Why does this constraint exist? | `analysis/` |

**Precedence when two documents disagree:** the user's own instruction → `CLAUDE.md`
hard rules → `FRONTEND_RULES.md` (frontend) → `PRD-v2` → `phase-plans/` →
`technical-plans/` → `analysis/`. Analysis loses every argument about *current
state*; it wins arguments about *why something was decided*.

---

## `phase-plans/` — the execution spine

| Doc | Purpose |
|---|---|
| [`README.md`](./phase-plans/README.md) | `▶ CURRENT POSITION`, the `continue` protocol, the parallel-track rule, slice DoD |
| [`00-implementation-status.md`](./phase-plans/00-implementation-status.md) | Measured FE+BE state per module; frontend platform debt; re-measure commands |
| [`01-phase1-close-the-gates.md`](./phase-plans/01-phase1-close-the-gates.md) | **Current.** 18 slices: ABDM, AI, and the revenue/security/margin blockers |
| [`02-phase2-win-the-midmarket.md`](./phase-plans/02-phase2-win-the-midmarket.md) | 21 slices: agentic claims, migration importer, revenue-share, i18n depth |
| [`03-phase3-depth-and-moat.md`](./phase-plans/03-phase3-depth-and-moat.md) | 20 slices: NHCX, speciality packs, Capacitor shell, platform |

**Every slice has a BE track and an FE track and ships as one unit.** This is a
rule, not a preference — two backend-only batches in this repo's history each
needed a catch-up frontend pass, and each pass found bugs that existed *only
because* the halves shipped apart. See `phase-plans/README.md`.

## `technical-plans/` — how

| Doc | Scope |
|---|---|
| [`00-foundation-hardening.md`](./technical-plans/00-foundation-hardening.md) | Phase F — tenant scoping, indexes, CI, tenancy matrix. **Complete** |
| [`01-phase1-mvp.md`](./technical-plans/01-phase1-mvp.md) · [`02`](./technical-plans/02-phase2-v1-ga.md) · [`03`](./technical-plans/03-phase3-v2.md) | Original per-phase engineering detail. Substantially built — see the status doc |
| [`04-data-model-evolution.md`](./technical-plans/04-data-model-evolution.md) | Schema changes in dependency order, migration naming, index catalogue |
| [`05-cross-cutting-conventions.md`](./technical-plans/05-cross-cutting-conventions.md) | **Shortest and most load-bearing.** Backend module scaffolding, dialect + response decision tables, per-slice DoD |
| [`06-frontend-architecture-and-mobile.md`](./technical-plans/06-frontend-architecture-and-mobile.md) | Responsive tiering, the element-level overflow probe, PWA budgets |
| [`07-frontend-rules-compliance.md`](./technical-plans/07-frontend-rules-compliance.md) | **New.** Per-rule audit of `FRONTEND_RULES.md` with evidence and priority order |
| [`08-frontend-backend-integration.md`](./technical-plans/08-frontend-backend-integration.md) | **New.** The contract between tracks, the five shipped contract bugs, test-layer division of labour |

## `analysis/` — why (historical)

Accurate when written; several have drifted and say so in their own headers.
**Cite for provenance, never for current state.**

| Doc | What |
|---|---|
| [`01-codebase-analysis.md`](./analysis/01-codebase-analysis.md) | Original inventory (2026-08-22) |
| [`02-findings-register.md`](./analysis/02-findings-register.md) | **The 33 findings (F-01…F-33)** with evidence and status lines. Most-cited doc in the repo |
| [`03-security-and-tenancy-audit.md`](./analysis/03-security-and-tenancy-audit.md) | Includes a live-reproduced cross-tenant read the then-602-test suite passed clean |
| [`04-test-and-quality-strategy.md`](./analysis/04-test-and-quality-strategy.md) | Why the suite missed those findings |
| [`05-competitive-analysis.md`](./analysis/05-competitive-analysis.md) | **Superseded by `PRD-v2` §2** — its own header admits competitor data was never live-verified, and most of its Tier 1/2 recommendations have since shipped |
| [`06-execution-plan.md`](./analysis/06-execution-plan.md) | Original P0–P5. P0/P1 complete; superseded by `phase-plans/` |
| [`07-prd-gap-analysis-and-roadmap.md`](./analysis/07-prd-gap-analysis-and-roadmap.md) | PRD v1 → code mapping. **Header admits it drifted twice** — superseded by `phase-plans/00` |
| [`08-integration-gap-analysis.md`](./analysis/08-integration-gap-analysis.md) | 2026-08-25 sweep, incl. the S1 fabricated clinician dashboard. All findings closed |
| [`09`–`13`](./analysis/13-next-10-slice-batch.md) | Slice-batch history (`REQ100`–`REQ143`). Useful for "has this been tried" |
| [`_audit-dashboard.html`](./analysis/_audit-dashboard.html) | Rendered audit view |

---

## Provenance

Produced 2026-08-22 by reading every source, test and requirement file and
probing the running stack; restructured and re-baselined 2026-08-27 alongside
`PRD-v2-CareOS.md` and the `FRONTEND_RULES.md` v2.0 rewrite.

The 2026-08-22 headline conclusion — *"the backend is well-built at the level of
individual resolvers; the problems are all at the seams"* — has largely been
addressed: all five of its named P0 blockers are closed (cross-tenant read,
client-side auth bypass, zero indexes, fabricated pages, no CI). **The seams that
remain are different ones:** the front-end/back-end contract (hence
`technical-plans/08`), the front-end platform debt (hence `07`), and the two
absent modules that now gate a sale (hence `phase-plans/01`).
