---
id: PP-PHASE2
type: phase-plan
feature: project-plans
created: 2026-08-27
updated: 2026-08-27
status: not-started
parent: PRD-v2-CareOS.md §9
---

# Phase 2 — Win the mid-market

**Theme: be the obvious choice for a 2–15 branch chain.**

Phase 1 made the product sellable. Phase 2 makes it *preferred* — by joining AI
to the money (nobody in the Indian mid-market has), by attacking the #1
switching blocker, and by closing the depth gaps a chain actually evaluates.

**Do not start Phase 2 until Phase 1's exit criteria are met.** In particular:
ABDM M1+M2 certified, and the AI scribe hitting its ≤30 s / ≥98 % drug-precision
gates. Phase 2's claim work depends on both.

**Exit criteria**

- ABDM M3 (HIU) certified — records flow both directions
- A coded claim goes out and a denial comes back with a drafted appeal
- A clinic migrates off Practo/MocDoc/HealthPlix in ≤2 business days, self-serve
- Doctor revenue-share runs a real monthly payout
- Patient surface ships in Hindi + 3 regional languages
- Offline: a patient standing outside a clinic with no signal can see their booking

---

## Slice tracker

| # | Slice | Track | Status | Depends on | Notes |
|---|---|---|:--:|---|---|
| **P2-01** | ABDM M3 (HIU) — consent-based fetch of external records | BE+FE | not started | P1-10 | Completes the interop story |
| **P2-02** | AI coding assist — ICD-10 + procedure codes from the note | BE+FE | **done** (`REQ154`) | P1-11 | `REQ020` P1 named ICD-10; now AI-driven |
| **P2-03** | Agentic claim lifecycle — auto-code → submit → track → draft appeal | BE+FE | not started | P2-02 | The differentiator. Claim state machine + evidence attach already built |
| **P2-04** | Denial analytics + payer scorecards | BE+FE | not started | P2-03 | `Claims` data model already there |
| **P2-05** | AI-assisted migration importer (Practo / MocDoc / HealthPlix mappers) | BE+FE | not started | P1-11 | #1 switching blocker. AI *structures* imported free-text notes — rivals can't |
| **P2-06** | Doctor revenue-share & payouts engine | BE+FE | not started | — | Named chain-ICP need; branch overrides already built |
| **P2-07** | Drug interaction + allergy hard-stops | BE+FE | not started | P1-12 | Safety. Allergy banner + drug master already there |
| **P2-08** | Regional-language Rx print (i18n for documents) | BE+FE | not started | P1-07 | Rivals market 23+ languages |
| **P2-09** | i18n: 3 more regional languages | FE | not started | P1-07 | Prioritise by where clinics actually are |
| **P2-10** | Recurring/series appointments + treatment-plan scheduling | BE+FE | not started | — | Multi-sitting packages exist; series scheduling doesn't |
| **P2-11** | Immunisation schedule tracker | BE+FE | not started | — | Large paediatric segment in India; recall infra exists |
| **P2-12** | Chronic-disease registries (diabetes/HTN) + recall | BE+FE | not started | P2-11 | Cohort reports already built |
| **P2-13** | Investigation orders + results inbox (lab loop) | BE+FE | not started | — | `REQ020` P1 |
| **P2-14** | Digital intake → auto-populate EMR | BE+FE | not started | — | `intake-fields` built; the EMR write-through isn't |
| **P2-15** | Kiosk check-in mode | FE | not started | — | QR flow exists (`REQ107`); kiosk UI doesn't |
| **P2-16** | Self-serve reschedule link in every reminder | BE+FE | not started | P1-01 | Deflects front-desk calls cheaply |
| **P2-17** | GST e-invoicing (IRP) | BE+FE | not started | — | Statutory for registered providers |
| **P2-18** | Tally / Zoho Books sync | BE+FE | not started | P2-17 | PRD v1 §6.4: integrate, don't build accounting |
| **P2-19** | Offline-first PWA (DATA-8) | FE | not started | P1-03 | Cached upcoming bookings + address + booking ID |
| **P2-20** | `UI-2` colour sweep, round 2 → ratchet down | FE | not started | — | Unblocks per-tenant branding + dark mode |
| **P2-21** | `UI-14` file-size sweep — the 10 largest files | FE | not started | — | Start with `settings/index.jsx` (1,641 lines) |

---

## Slice detail — the three that carry the phase

### P2-03 — Agentic claim lifecycle *(the differentiator)*

Every competitor's AI stops at the note. This continues into the money, and the
2026 platform trend is exactly this (agentic RCM).

- **BE** — consume P2-02's codes; auto-populate and submit the claim; poll/track
  status; on denial, classify the reason and **draft an appeal** with the
  evidence already auto-attached (`REQ137` built the evidence linkage,
  `REQ138` the reimbursement pack). Respect the existing `CLAIM_TRANSITIONS`
  state machine — do not let an agent skip states. Every agent action audited
  and reversible.
- **FE** — claims desk gains an agent column: what the agent did, what it
  proposes, one-click accept/override. **Never auto-submit without a human
  decision point** for the first release — the same discipline `FR-AI-06` applies
  to clinical sign-off.
- ⚖️ Get sign-off before any automated submission to a payer.
- **Exit:** a denial produces a drafted appeal a human approves in one click.

### P2-05 — AI-assisted migration importer

`FRONTEND_RULES` §1 and PRD v1 §2.3.7 both name data migration as the #1
switching blocker. Rivals win on "free migration, 1-day go-live."

- **BE** — CSV/Excel importer plus per-vendor export mappers. The AI part is the
  wedge: competitor exports contain **unstructured free-text notes**, and the
  scribe pipeline (P1-11) can *structure* them into `EncounterNotes` sections on
  import. A rival's own export becomes better data inside our product than it
  was inside theirs.
- **FE** — upload → column mapping preview → dry-run diff → commit, with a
  clear per-row error report. Never a silent partial import.
- **Exit:** a real Practo export lands as structured patients, appointments and
  encounters in ≤2 business days, self-serve.

### P2-06 — Doctor revenue-share & payouts

- **BE** — per-clinician, per-branch share rules (visiting consultants have
  different rates at different branches — PRD v1 §2.3.2); monthly computation
  from real `AppointmentPayments`; payout records with an approval step.
- **FE** — manager surface: share rules editor, monthly payout run, per-doctor
  statement export (`SURF-8`: CSV export non-negotiable). `SURF-14`: persistent
  branch scope indicator.
- **Exit:** a real month closes and produces per-doctor statements.

---

## Deliberately not in Phase 2

| Item | Why | Where |
|---|---|---|
| NHCX / ABDM M4 | Needs M3 landed and certified first | Phase 3 |
| Speciality packs | Highest ARPA, but wants the lab loop + series scheduling underneath | Phase 3 |
| IPD-lite, lab module | Adjacent product surface, not mid-market-defining | Phase 3 |
| Native apps / Capacitor shell | PWA (P2-19) first; measure whether native is still needed | Phase 3 |
| Partner marketplace, reseller portal, UHI | Platform plays; need a stable public API story first | Phase 3 |
| `ARCH-1` wholesale reorganisation | Documented deviation | — |
