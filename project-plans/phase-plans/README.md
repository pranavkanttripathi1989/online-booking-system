---
id: PP-PHASE-INDEX
type: index
feature: project-plans
created: 2026-08-27
updated: 2026-08-27
status: active
---

# phase-plans — the execution spine

This directory is the **single answer to "what do I work on next".** Everything
else in `project-plans/` explains *why* or *how*; this explains *what, in what
order, front-end and back-end together.*

---

## ▶ CURRENT POSITION

```yaml
current_phase:  2
current_doc:    02-phase2-win-the-midmarket.md
current_slice:  P2-14            # next unstarted, unblocked slice — P2-01 depends on blocked P1-10; P2-02..P2-13 done (P2-07 shipped allergy-only; P2-08 shipped English/Hindi only; P2-09 shipped all 6 offered languages, not just 3, per explicit user selection, see REQ161; P2-10 shipped as a new AppointmentSeries domain, see REQ163; P2-11 shipped as a new ImmunizationScheduleItems/ImmunizationRecords domain, see REQ167; P2-12 shipped as a new ChronicRegistryEnrollments domain, see REQ168; P2-13 shipped as recordTestResult -- the phase tracker's own "results inbox" framing was itself superseded by a more fundamental missing-mutation finding, see REQ184)
last_completed: REQ184           # P2-13 (recordTestResult -- the real missing test-result completion path) closed 2026-09-03. Also: the 5-slice ad-hoc IPD detour (REQ179-REQ183, a deliberate PRD-scope override, not tracked in this table) completed and pushed 2026-09-02 between REQ168 and REQ184.
blocked_on:     P1-08/09/10, P1-14/15   # ABDM (NHA credentials + certification) and the voice/WhatsApp AI agent (no telephony vendor or LLM provider in this codebase) — both skipped per explicit user decision, not silently dropped
phase_1_status: complete except the two blocked gates above — every other P1-01..P1-18 slice is done
```

**This block is the source of truth for resumption.** Update it at the end of
every slice — it is the only place a reader has to look to know where work
stopped.

---

## The `continue` protocol

When the instruction is bare `continue` (or "next", "carry on", "resume"),
execute exactly this, in order. Do not re-derive scope, do not re-survey the
codebase, do not start a new batch.

1. **Read `▶ CURRENT POSITION` above.** It names the phase doc and slice.
2. **Open that phase doc.** Find the slice tracker table. The next slice is the
   first row whose Status is not `done`.
3. **Read that slice's own row in full** — it names its backend track, its
   frontend track, its dependencies, and its exit criteria. Both tracks belong
   to the same slice; a slice is not done when only the backend ships.
4. **Verify the slice is still real** before writing code. This codebase has a
   documented history of plan docs going stale — `analysis/07`'s own header
   admits it drifted twice, and a batch-13 slice turned out already-closed by
   earlier work. Grep the real code for the thing the slice says is missing. If
   it already exists, mark the row `already-closed`, record why, and move to the
   next row.
5. **Follow `CLAUDE.md`'s working loop** for the slice itself: classify → write
   the `REQ###` → plan mode + read real code → `PLAN###` → implement → test →
   `TP###`/`TR###` → context bundle → update all five root indexes → commit.
6. **Update `▶ CURRENT POSITION`** and the slice's Status cell in the same
   change that ships the slice. A tracker that lags the code is worse than no
   tracker.

### When the instruction is *not* bare `continue`

If a specific requirement, phase, bug or feature is named, work that instead —
but still record it in the relevant phase doc's tracker so the spine stays
honest about what actually happened.

---

## Phase index

| Doc | Phase | Theme | Status |
|---|---|---|---|
| [`00-implementation-status.md`](./00-implementation-status.md) | — | **Measured** front-end + back-end state, per module. Read before planning anything | living |
| [`01-phase1-close-the-gates.md`](./01-phase1-close-the-gates.md) | **1** | Close the two gates that block selling: ABDM and AI | **← current** |
| [`02-phase2-win-the-midmarket.md`](./02-phase2-win-the-midmarket.md) | 2 | Depth that wins the 2–15 branch chain | not started |
| [`03-phase3-depth-and-moat.md`](./03-phase3-depth-and-moat.md) | 3 | Vertical packs, schemes, platform | not started |

Phases derive from **`PRD-v2-CareOS.md` §9**. Where v2 and the older
`analysis/06-execution-plan.md` / `analysis/07-prd-gap-analysis-and-roadmap.md`
disagree, **v2 and these docs win** — the older two are point-in-time and both
predate roughly 60 shipped slices.

---

## The parallel-track rule

Every slice in every phase doc has **two tracks that ship together**:

| Track | Owns | Rules that bind it |
|---|---|---|
| **BE** | Prisma model, migration, service, resolver/controller, unit + integration tests | `CLAUDE.md` hard rules 1–4, 6, 7, 9, 10 · `technical-plans/05-cross-cutting-conventions.md` · skills `medibook-tenant-scoping`, `medibook-prisma-migrations`, `medibook-graphql-contracts` |
| **FE** | Page/component, GraphQL wiring, the five states, responsive tier, a11y, tests | `FRONTEND_RULES.md` (all ~190 rules) · `technical-plans/06-frontend-architecture-and-mobile.md` · `technical-plans/07-frontend-rules-compliance.md` · skills `medibook-frontend-rules`, `medibook-frontend-data-wiring`, `medibook-design-system`, `medibook-responsive-mobile` |

**Why this is a rule and not a preference.** This codebase has shipped
backend-only batches twice (Phase G+2 and G+3, 8 slices each) and both required
a dedicated catch-up frontend pass afterwards. Those passes then found real
bugs that only existed *because* the two halves shipped apart — a mutation
whose argument shape was wrong from the day it shipped and was therefore never
once functional, a route gated to a role its own resolver allowed, a button made
unreachable by its own success handler. **A backend-only slice is not "done, UI
pending"; it is unverified.**

Permitted exception, stated explicitly per slice: a slice may be BE-only when it
has **no user-facing surface at all** (a cron sweep, an internal helper, a
migration). Say so in the slice row. "We'll do the UI later" is not that
exception.

### Slice-level Definition of Done (both tracks)

```
BE  [ ] Tenant-scoped via orgScope/orgScopeVia/orgIdForWrite — never a ternary
BE  [ ] Cross-tenant rejection test exists and would fail against wrong code
BE  [ ] Every new @InputType field has >=1 class-validator decorator
BE  [ ] Hand-written migration read end-to-end against the schema diff
BE  [ ] Indexes derived from the real where/orderBy, selective column first
BE  [ ] Unit tests green; integration suite green; tsc + eslint clean
FE  [ ] Surface tier declared; verified at that tier's widths
FE  [ ] All five states: loading / empty / error / stale / success
FE  [ ] Contract checked verbatim against src/graphql/*.js — ARCH-15
FE  [ ] Route role gate matches backend @Auth — SEC-18
FE  [ ] Mutation invalidates its list — DATA-9
FE  [ ] No mock fallback on an empty result — DATA-13
FE  [ ] Theme tokens only; no hex literals — UI-2
FE  [ ] Icon-only buttons have aria-label — A11Y-5
FE  [ ] Lint ratchet not increased; unit tests; build green
BOTH[ ] REQ/PLAN/TP/TR written; context bundle; five root indexes updated
BOTH[ ] Committed as code-then-docs, conventional message
```

---

## What lives where in `project-plans/`

```
project-plans/
├── README.md              navigation
├── phase-plans/           ← WHAT to build, in order, FE+BE parallel  (you are here)
├── technical-plans/       ← HOW to build it: schema, conventions, FE architecture, rules
└── analysis/              ← WHY: point-in-time audits, findings, competitive, slice history
```

`analysis/` is **historical**. Its numbered docs were accurate when written and
several have drifted; each carries its own staleness note. Cite it for
provenance ("why is F-01 a thing"), never for current state. Current state is
`phase-plans/00-implementation-status.md`.
