---
id: PP-PHASE3
type: phase-plan
feature: project-plans
created: 2026-08-27
updated: 2026-08-27
status: not-started
parent: PRD-v2-CareOS.md §9
---

# Phase 3 — Depth and moat

**Theme: become expensive to leave.**

Phases 1 and 2 made the product sellable and preferred. Phase 3 builds the
things that make a chain's operations *shaped around* CareOS: vertical
workflows it cannot get generically, government-scheme rails, and a platform
other people build on.

**Exit criteria**

- NHCX live — a digital claim clears end-to-end under a government scheme
- Two speciality packs shipped and sold at a higher ARPA than the base plan
- A third party has built something real against the public API
- ARPA up measurably against the Phase 2 baseline

---

## Slice tracker

| # | Slice | Track | Status | Depends on | Notes |
|---|---|---|:--:|---|---|
| **P3-01** | NHCX / ABDM M4 — eligibility, pre-auth, claim, payment notice | BE+FE | not started | P2-01 | Already mandatory for PMJAY-empanelled facilities |
| **P3-02** | Government schemes — PMJAY / CGHS / ECHS / ESIC | BE+FE | not started | P3-01 | Unlocks segment S4 (small hospitals) |
| **P3-03** | Speciality pack — **dental** (charting, treatment plans) | BE+FE | not started | P2-10 | Best multi-sitting fit with shipped `packages` (PRD v2 D6) |
| **P3-04** | Speciality pack — **physio** (ROM tracking, exercise plans) | BE+FE | not started | P2-10 | Second pick per D6 |
| **P3-05** | Speciality pack — derma photo timeline | BE+FE | not started | P3-03 | Needs image storage policy (`DATA-10`) |
| **P3-06** | Speciality pack — IVF cycles | BE+FE | not started | P3-03 | Highest complexity, highest ARPA |
| **P3-07** | Speciality pack — ayurveda (prakriti, therapy courses) | BE+FE | not started | P3-03 | |
| **P3-08** | TPA portal-assist (form-fill automation) | BE+FE | not started | P2-03 | Pragmatic answer to risk R11: TPAs stay portal-bound |
| **P3-09** | Lab / diagnostics module | BE+FE | not started | P2-13 | Extends the lab loop into a real domain |
| **P3-10** | IPD-lite (beds, admissions, discharge summaries) | BE+FE | not started | — | Segment S4 requirement |
| **P3-11** | Capacitor mobile shell + `src/platform/` wrapper | FE | not started | P2-19 | **Activates the 18 🔜 `WV-*` rules.** Do not start until PWA has proven the offline model |
| **P3-12** | Native app store presence (clinician + patient) | FE | not started | P3-11 | Only if PWA measurably falls short |
| **P3-13** | Partner app marketplace | BE+FE | not started | — | Public API + webhooks already shipped |
| **P3-14** | Reseller / white-label partner portal | BE+FE | not started | P2-20 | Needs `UI-2` closed — white-label is inert while colours are hardcoded |
| **P3-15** | UHI participation (demand without a marketplace) | BE+FE | not started | P2-01 | Answers Practo's marketplace moat without building one |
| **P3-16** | Smart recall — AI picks who to contact and when | BE+FE | not started | P2-12 | |
| **P3-17** | Inventory demand forecasting | BE+FE | not started | — | Pharmacy stock ledger already built |
| **P3-18** | Corporate / employer health packages (B2B2C) | BE+FE | not started | P2-06 | New revenue channel |
| **P3-19** | Care pathways / protocols with auto-scheduled follow-up | BE+FE | not started | P2-10 | |
| **P3-20** | Cash-flow forecast for the owner | BE+FE | not started | P2-06 | |

---

## Slice detail — the two that carry the phase

### P3-03 / P3-04 — speciality packs *(the ARPA lever)*

PRD v1 §2.2 segment S5 prices speciality chains at ₹8,000–50,000/mo. This is
the single largest ARPA move available, and it is defensible because a generic
EMR cannot express a dental chart or an IVF cycle.

**The architectural requirement that makes this a pack and not a fork:** a
speciality pack must be **configuration plus a small module**, never a parallel
copy of the EMR. Concretely — a pack contributes:

- extra `EncounterNotes` section types (declared, not hardcoded)
- a bespoke clinical widget (tooth chart, ROM diagram, photo timeline)
- a treatment-plan template feeding P2-10's series scheduling
- pack-specific report definitions

If a pack needs to change core booking, billing or Rx behaviour, the pack is
wrong — fix the core instead. **This is the rule that stops five packs becoming
five products.**

- **BE** — pack registry + per-org enablement gated by P1-04's entitlement guard
  (a pack is a paid module — this is exactly what the plan builder exists for).
- **FE** — the widget lives in the tablet-first `EncounterWorkspace`; lazy-loaded
  per `PERF-12` so a dental clinic never downloads the IVF bundle.
- **Exit:** a dental clinic runs a full multi-sitting treatment plan; a physio
  clinic tracks ROM across a course; neither pack touched core booking code.

### P3-11 — Capacitor shell

**This slice is what converts 18 conditional 🔜 rules in `FRONTEND_RULES.md` §6
into live, enforced rules.** Read that section in full before starting — every
rule there derives from a real failure mode, and most are invisible in a browser.

- **FE** — `src/platform/` wrapper (`BASE-2`) with a web fallback for every
  native call, so the browser build never crashes. Then, in this order because
  each is a launch blocker on its own: safe areas (`WV-1`), hardware back button
  on every screen (`WV-2`), keyboard/focus behaviour (`WV-4`), **the UPI
  app-switch as an interruption not a navigation** (`WV-8`), app-resume handler
  (`WV-9`), deep links (`WV-10`), forced-update check (`WV-15`).
- **`WV-7` interacts with P1-02:** by this point tokens are already out of
  `localStorage`; the native path must route them to secure native storage, not
  reintroduce web storage.
- **Prerequisite:** P2-19's PWA must have proven the offline model first.
  Shipping a shell over an app with no designed offline behaviour just makes the
  failure native.
- **Exit:** `CI-14` and `CI-18` (payment app-switch, back button walk) pass on a
  real low-end Android device on real mobile data.

---

## Deliberately still not in scope

Unchanged from PRD v1 §6.4 and reaffirmed in v2 §9: full IPD/ward management,
OT scheduling, PACS/DICOM viewer, blood bank, HR/payroll, full ERP accounting
(integrate with Tally/Zoho instead), international/multi-country billing. **We do
not underwrite, broker or sell insurance.** **We do not train foundation speech
or language models** — we buy inference and own the structuring, schema and
workflow.

`ARCH-1`'s wholesale feature-folder reorganisation of the existing 170 files
remains a documented deviation, not a planned project. New features comply.
