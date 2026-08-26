# Product Requirements Document — v2.0

## CareOS — Multi-Tenant Healthcare Operations Platform (India)

**Document version:** 2.0
**Date:** 27 August 2026
**Supersedes:** `PRD-Healthcare-Booking-SaaS-India.md` (v1.0, 22 Aug 2026)
**Owner:** Product Management
**Status:** For stakeholder decision — contains 7 decisions that require sign-off (§13)

---

## 0. How to read this document

v1.0 was a greenfield PRD written when the codebase was a booking tool. It is
still directionally right about the market and the wedge, and **most of its
architecture and module design survives unchanged.** Do not discard it — v2
references it rather than repeating it.

What v2 exists to do:

1. **Correct v1 where the market moved.** Three of v1's assumptions are now
   wrong, and one of them is existential (§3). This is the most important part
   of this document.
2. **Re-baseline against what is actually built.** v1 assumed ~nothing existed.
   53 backend domain modules and 100 database tables later, that framing is
   obsolete and causes real planning errors (§4).
3. **Add the features v1 does not contain at all** — 54 candidate capabilities,
   scored and sequenced (§6–§8).
4. **Re-phase and re-price** against live competitor data rather than the
   estimates v1 used (§9, §10).

**Evidence standard used here.** Every claim is tagged:
`[measured]` = I ran it against this repo today · `[verified]` = live web source,
cited · `[estimate]` = judgement, flagged as such. v1's competitive section
carried an explicit disclaimer that its competitor data was *not* verified
against live sources. That gap is closed in this version.

---

## Table of Contents

1. [Executive summary of changes](#1-executive-summary-of-changes)
2. [Revised market and competitive analysis](#2-revised-market-and-competitive-analysis)
3. [The three strategic corrections](#3-the-three-strategic-corrections)
4. [Where the product actually is](#4-where-the-product-actually-is-measured)
5. [Positioning v2](#5-positioning-v2)
6. [New capability catalogue — 54 candidates](#6-new-capability-catalogue--54-candidates)
7. [New modules M18–M21](#7-new-modules-m18m21)
8. [Extensions to existing modules M1–M17](#8-extensions-to-existing-modules-m1m17)
9. [Revised phasing](#9-revised-phasing)
10. [Pricing and packaging v2](#10-pricing-and-packaging-v2)
11. [Non-functional and compliance deltas](#11-non-functional-and-compliance-deltas)
12. [Risks v2](#12-risks-v2)
13. [Decisions required](#13-decisions-required)
14. [Appendix — sources](#14-appendix--sources)

---

## 1. Executive summary of changes

| # | v1.0 said | v2.0 says | Why |
|---|---|---|---|
| 1 | AI scribe is a **Phase 3** feature (months 11–18) | AI ambient documentation is **table stakes now**; ship in Phase 1 or exit the clinical market | HealthPlix runs 150,000 consults/day with an ambient scribe in 11 languages; Eka Care ships EkaScribe. Both live today `[verified]` |
| 2 | ABDM is a **Phase 2 differentiator** ("certified, not claimed") | ABDM M1–M3 is a **license to sell**, and a Phase-1 blocker | "ABDM compliance is no longer optional; it's becoming the default baseline for all clinics" `[verified]`. We have **zero ABDM code** `[measured]` |
| 3 | Patient channel = WhatsApp + SMS templates | Patient channel = **AI agents** on voice + WhatsApp; templates are the fallback | Whole new competitive category since v1; India no-shows run 25–33%, AI voice agents reported cutting 32%→12% `[verified]` |
| 4 | Clinician bar: "consult recordable in ≤90s using templates + favourites" | Clinician bar: **≤30s with voice, zero mandatory typing** | v1's bar measures the wrong thing once competitors remove typing entirely |
| 5 | Competitor data unverified (own disclaimer) | Live-verified pricing and features for 5 competitors | §2 |
| 6 | 17 modules (M1–M17) | **21 modules** — adds AI Clinical Intelligence, AI Front Desk, Growth & Reputation, Interop Platform | §7 |
| 7 | "9 modules absent, nothing built" | **2 modules genuinely absent**; 14 partial-or-better; 53 domains shipped | §4 `[measured]` |
| 8 | Flat pricing vs Practo's per-booking fee (thesis) | Thesis **confirmed with a number**: per-appointment fees add ₹1,500–3,000/mo, real cost 50–100% over headline `[verified]` | §10 |

**The one-sentence version:** the engineering has outrun the PRD, but the market
has outrun both — and the gap is specifically **AI and ABDM**, where we have
nothing and competitors have shipped products.

---

## 2. Revised market and competitive analysis

### 2.1 Live competitor teardown `[verified]`

| Competitor | Scale / position | What they ship *now* that v1 didn't credit | Pricing (live) |
|---|---|---|---|
| **HealthPlix** | 14,000 doctors, **1.5 lakh OPD consults/day** — India's largest AI EMR | **HALO ambient scribe** on Sarvam AI speech-to-text: real-time transcription structured into vitals, complaints, diagnosis, medication, advice, plan. **11 languages**, handles mid-sentence code-switching, Indian brand names, specialty shorthand, noisy rooms. Plus Smart AI Analyzer, clinical summaries, decision insights from global literature | ~₹3,000–40,000/mo |
| **Eka Care** | Government-first EMR + large consumer PHR base | **EkaScribe** (standalone AI scribe product). **ABHA QR scan at reception** — patient scans, profile arrives, zero manual registration. Ambient AI drafting notes in English/Hindi. WhatsApp follow-ups from inside the EMR. HIPAA/ISO/**FHIR**/ABDM compliant, public ABDM Connect API | Doc Plus ₹16,999/yr · Doc Pro ₹18,749/yr · **Clinic Pro ₹1,00,000/yr** |
| **Practo Ray** | Marketplace + practice management | Core PM/EMR/e-Rx unchanged. Patient self-reschedule, turn-by-turn SMS, one-click collection | Base ~₹2,000+/mo, **but per-appointment marketplace fees add ₹1,500–3,000/mo for a busy clinic; real cost 50–100% above headline and rises with volume** |
| **VivaLyn** | New pure-play entrant | AI medical scribe only — evidence the scribe layer is now a standalone category worth competing in | n/d |
| **AI voice front desk** (ConnectAI, HuskyVoice, Voiceoc, Vocaldice, Caller Digital) | Category did not exist in v1 | 24/7 inbound call answering, booking, rescheduling, report-status queries, urgent routing. Hindi/English code-switched. Phone **and** WhatsApp. DPDP-aligned with Indian residency, consent capture, retention limits, documented DPIA | **₹800/mo (₹499 as suite add-on) + ₹4/minute** |

### 2.2 Regulatory reality, updated `[verified]`

**ABDM is now a gate, not a feature.**

- Four milestones: **M1** identity provider (ABHA create/verify, patient
  discovery) · **M2** Health Information Provider (share FHIR records on
  consent) · **M3** Health Information User (fetch records) · **M4** NHCX
  digital claims.
- Vendors "must support HIP/HIU APIs, **FHIR R4**, and **EHR Standards 2016**
  to achieve ABDM certification **and sell to certified facilities**."
- **M4/NHCX is already mandatory for PMJAY-empanelled hospitals** and expanding
  to state government schemes.

Consequence: any facility that wants scheme empanelment cannot buy
non-certified software. This converts ABDM from v1's "differentiator we publish
per milestone" into a **binary sales qualifier**. We currently fail it.

**WhatsApp economics are now precise — and about to change** `[verified]`:

| Template category | Rate (India, 2026) | Notes |
|---|---|---|
| Utility | **₹0.1150** | Appointment reminders, confirmations, receipts belong here |
| Authentication | ₹0.1150 | OTP |
| Marketing | **₹0.8631** | Up ~10% in 2026 (from ₹0.7846). **7.5× utility** |

**From 1 October 2026, utility/service messages inside the 24-hour service
window become chargeable at ₹0.1150** — they are free today. This has a direct
gross-margin effect on every conversational feature we ship, and it lands
mid-Phase-1.

Two hard product requirements fall out of this:
1. **Template-category routing is a margin feature, not plumbing.** A reminder
   mis-classified as marketing costs 7.5× what it should. The dispatcher must
   pin category per notification type and refuse to send a reminder as
   marketing.
2. **Conversation budgeting must be metered and visible per tenant** before
   October, or AI-agent conversations silently erode margin.

### 2.3 The opportunity map, revised

v1's nine gaps still hold. These are **new or materially changed**:

| Gap | Evidence | CareOS response |
|---|---|---|
| **AI is priced as premium, not bundled** | HealthPlix ₹3K–40K/mo spread; scribes sold standalone (VivaLyn, EkaScribe) | Bundle a usage-capped scribe into mid-tier so AI is not an upsell objection; meter beyond cap. Undercut standalone-scribe pricing |
| **Voice agents are sold per-minute by point solutions** | ₹800/mo + ₹4/min, no clinical system behind them | We own the calendar, the patient record and the queue. A booking agent with **write access to real availability** is categorically better than one integrating over an API — and we can price it as an add-on, not a second vendor |
| **Nobody joins AI to the money** | Category framing is documentation-first | Extend AI into **coding → claim → denial → appeal**. Agentic RCM is the 2026 platform trend `[verified]`; in India it is unclaimed at mid-market |
| **Migration is still the #1 switching blocker** (v1 §2.3.7, unchanged) | Rivals win on free migration + 1-day go-live | Importer with **Practo / MocDoc / HealthPlix export mappers**. Now sharper: those vendors' AI notes are unstructured text, so an AI-assisted importer that *structures* imported history is a genuine differentiator |
| **ABHA QR at reception is a UX standard we lack** | Eka Care ships it | Registration must have a scan path, not just a form |

---

## 3. The three strategic corrections

### Correction 1 — AI documentation is table stakes. Ship it in Phase 1.

**v1 position:** AI scribe in Phase 3, months 11–18. Persona P4 hard
requirement: median consult recordable in ≤90 seconds *using templates and
favourites*.

**Why that is now wrong.** A competitor with 14,000 doctors is doing 150,000
consults a day where the doctor **speaks and the note assembles itself** — in 11
languages, tolerating code-switching and Indian brand names `[verified]`. Our
`REQ020`/`REQ021` shipped exactly the templates-and-favourites model v1
specified. It works, it is well-built, and **it is now the losing side of a
demo.** A clinician comparing "type with good templates" against "just talk"
does not choose templates.

**Revised requirement.**

> **P4 hard requirement (v2):** a median consult must be recordable in **≤30
> seconds of clinician effort with no mandatory typing**. Voice is the primary
> input; templates and favourites become the correction and fallback path, not
> the primary path.

**What this does not mean.** It does not mean building a speech model. Sarvam AI
is an Indian speech-to-text provider already in production with HealthPlix
`[verified]` — meaning the capability is buyable. Our defensible layer is
**structuring** the transcript into *this* schema (`EncounterNotes`,
`Diagnoses`, `PrescriptionItems` against a real drug master with our
auto-quantity arithmetic, `Vitals`) and writing it through the sign-off
immutability trigger and tenancy boundary we already built. That is the part a
point-solution scribe cannot do.

Sequencing note: this is the **highest-leverage item in the document** because
it lands on top of finished infrastructure. `REQ020` gave us the structured note
schema, `REQ021` the drug master and quantity arithmetic, `REQ130` discrete
vitals. The scribe is a new input path into schemas that already exist and are
already tested.

### Correction 2 — ABDM is a sales gate. It blocks Phase 1, not Phase 2.

**Measured state:** `grep -rl "ABHA|ABDM|NHCX|FHIR" backend/src frontend/src`
returns **zero files** `[measured]`. Not partial. Absent.

**Verified market state:** ABDM certification is the baseline for selling to
certified facilities; M4/NHCX is already mandatory for PMJAY-empanelled
hospitals `[verified]`.

**Why this is worse than a missing feature.** Certification is an *external,
gated, long-lead process* — sandbox access, milestone testing, security review.
It cannot be compressed by adding engineers late. v1 understood this (it says
"certification paperwork starts on day one of Phase 2"); v2's correction is that
day one has passed and the phase assignment was already too late.

**Revised requirement.**

> **ABDM becomes a workstream with its own owner, starting immediately and
> running in parallel to all feature work.** M1 (ABHA create/verify + patient
> discovery) and M2 (HIP, FHIR R4 record sharing on consent) are **Phase 1
> exit criteria**. M3 (HIU fetch) closes Phase 2. M4/NHCX is the gate for the
> insurance module's Phase 3 scope.

Two dependencies worth stating explicitly, because they are cheap now and
expensive later:
- **FHIR R4 is a required output format, not an integration.** Every clinical
  write path we build from here should be shaped so a FHIR projection is a
  mapping, not a rewrite. `REQ020`'s note schema was not designed against FHIR.
  Assess the delta before the schema grows further.
- **EHR Standards 2016** compliance is named in the certification requirement
  and has not been assessed against our schema at all.

### Correction 3 — the patient channel is now agents, not templates.

**v1 position:** WhatsApp Business API + SMS fallback with DLT templates.
Correct, and shipped (`REQ025`, `REQ048`).

**What changed.** An entire category appeared: AI voice/chat agents that answer
the clinic phone 24/7, book and reschedule against the real calendar, answer
report-status queries, and route urgent calls — in code-switched Hindi/English,
on phone **and** WhatsApp, priced at ₹800/mo + ₹4/min `[verified]`.

**Why we should care more than the point solutions do.** Two hard numbers:
India no-shows run **25–33%**, and voice-agent deployments are reported cutting
them from **32% to 12%** `[verified]`. Note the second number is vendor-reported
and should be treated as an upper bound `[estimate]` — but even half of it is
the largest single revenue lever in this document, and it lands directly on the
scheduling engine that is already our strongest asset.

**Our structural advantage.** A point-solution agent integrates over someone
else's API and cannot see the queue, the doctor's real availability, the
patient's outstanding balance, or the prescription due for refill. Ours can
write directly to `availableSlots`, `QueueEntries` and `Waitlist` — inside the
tenancy boundary, with the audit trail already in place.

**Revised requirement:** the notification layer becomes a **conversation
layer**. Outbound templates remain; inbound handling becomes first-class.

---

## 4. Where the product actually is `[measured]`

Everything in this section was measured against the repo on 27 Aug 2026. It
supersedes `project-plans/07`'s state table, which its own header admits has
"drifted twice."

### 4.1 Scale

| Metric | Count |
|---|---|
| Backend domain modules | **53** |
| GraphQL resolvers | 51 |
| Prisma models | **100** |
| Applied migrations | **71** |
| Backend unit suites / tests | **93 / 1,565** |
| Integration suites / tests | 4 / 387 |
| Frontend pages / components | 93 / 44 |
| Playwright e2e specs | 45 |

### 4.2 Module state — 21 modules

| Module | State | Detail |
|---|---|---|
| M1 Org & tenancy | **Strong** | Org→branch→clinic, departments, resources, branch overrides, onboarding wired |
| M2 Identity & security | **Strong** | Global fail-closed guard chain, `PermissionsGuard` enforcing, break-glass + audited impersonation, API keys |
| M3 Master data | **Strong** | Services, products, packages, drug master, category/channel/branch pricing, price history |
| M4 Scheduling | **Strong** | Dual-mode slot + session/token, multi-resource, waitlist, bulk-reschedule, walk-in interleaving |
| M5 Booking | **Strong** | State machine, dedup+merge, family/dependants, prepayment policy, embeddable widget, no-show sweep |
| M6 Queue | **Built** | Live board, call-next/recall/skip/transfer, QR self-check-in, checklists |
| M7 EMR | **Built** | Structured notes, templates, allergy banner, diagnoses, vitals + growth charts, referrals w/ state machine, DB-trigger sign-off immutability |
| M8 Prescriptions | **Built** | Drug search + auto-quantity, favourite sets, print/PDF, repeat-with-watermark, OTP-gated WhatsApp share, tamper-evident hash + verify UI |
| M9 Pharmacy | **Built** | Batch/stock ledger, dispense-against-Rx, near-expiry + low-stock sweeps |
| M10 Billing | **Built** | Razorpay, mixed-tender counter, GST fields, day-end cash close, discount approval, packages |
| M11 Messaging & notifications | **Built** | Threads w/ SLA + dept scoping, WhatsApp-priority dispatch w/ SMS fallback, quiet hours, frequency caps, delivery analytics, auto-responder |
| **M12 Telemedicine** | **⚠ Stub** | 491-line page; WebRTC is *simulated* — code comment: "normally this would be handled by WebRTC RTCPeerConnection" `[measured]` |
| M13 Patient portal | **Built** | Family, documents/PDFs, consent, dependant-aware self-scoping |
| **M14 ABDM / interop** | **✗ Absent** | **Zero matching files** `[measured]` |
| M15 Reports | **Built** | True slot utilisation, patient cohorts, scheduled delivery |
| M16 Integrations | **Built** | Signed webhooks + delivery log, public REST API + API keys |
| M17 Insurance | **Built (OPD subset)** | Payer/tariff master, empanelment, policy capture, claim state machine, evidence auto-attach, reimbursement-pack PDF |
| S10 Plan engine | **Partial** | Plans/versions built; **entitlement guard absent** `[measured]` — tiers unmonetisable |
| S12 DPDP | **Partial** | Consent, rights requests, retention policies + purge for `test_results`/`consents` |
| **M18–M21 (new)** | **✗ Absent** | AI, agents, growth, interop platform — §7 |

**Honest read:** v1 said 9 modules absent. Today **2** are genuinely absent
(M12 stub, M14 zero) and both are on the critical path. The rest is a real
platform with real tests. **The problem is no longer breadth — it is that the
two remaining holes are the two the market now gates on.**

### 4.3 Confirmed-open platform gaps `[measured]`

| Gap | State | Consequence |
|---|---|---|
| ABDM/ABHA/NHCX/FHIR | 0 files | Cannot sell to certified facilities |
| Telemedicine | Simulated WebRTC | Cannot demo; TPG compliance impossible |
| Entitlement guard | Absent | Cannot monetise tiers |
| Observability | No OTel / Sentry / Prometheus | Cannot answer "was it down" |
| i18n framework | None in `package.json` | English-only UI caps tier-2/3 reach |
| **Review submission** | **No creation path** — 1 query, 2 mutations, none create | Reputation flywheel has no first step. *Flagged in the 2026-08-22 analysis and still open* |

---

## 5. Positioning v2

v1's positioning statement remains accurate but no longer sufficient — it does
not mention AI, and in 2026 that reads as absence.

> **For multi-doctor clinics and clinic chains in India who have outgrown
> appointment-book software but cannot absorb hospital-ERP cost, CareOS is the
> AI-operated practice platform: patients book and reschedule by talking to an
> agent on the phone or WhatsApp; doctors dictate and the record writes itself;
> claims code, submit and appeal themselves. Unlike scribe-only AI tools that
> document a visit no system acts on, and unlike marketplace-tied software that
> charges per booking and brands the patient experience as its own, CareOS is
> flat-priced, white-label, ABDM-certified, and runs the whole outpatient day —
> booking to prescription to pharmacy to payer.**

**Differentiators v2** (v1's six, re-ordered and extended):

1. **AI that closes loops, not just notes.** Voice → structured record →
   prescription → dispense → GST invoice → coded claim → denial appeal. Every
   competitor's AI stops at the note.
2. **Agents with write access to the real system of record** — not an
   integration over someone else's calendar.
3. **Dual-mode scheduling** (slot + session/token) with visiting consultants. *Shipped.*
4. **Closed-loop Rx → Pharmacy → GST → stock ledger.** *Shipped.*
5. **Composable plan builder** — sell any module/quota combination without a
   code change. *Schema shipped, enforcement pending.*
6. **ABDM/NHCX native**, milestone-published.
7. **White-label patient layer.**
8. **Insurance desk with clocks and evidence.** *OPD subset shipped.*

Note honestly: 3, 4 and 8 are now **shipped assets**, not promises. 1, 2 and 6
are the net-new bets. 5 is half-done and blocks revenue.

---

## 6. New capability catalogue — 54 candidates

Scored **Impact** (buyer-visible value), **Effort**, **India-fit**, and
**Leverage** (does it sit on infrastructure we already have?). Sorted by
priority band. All effort figures are `[estimate]`.

### Band A — ship first (high impact × high leverage)

| # | Capability | Impact | Effort | Leverage on existing code |
|---|---|---|---|---|
| A1 | **Ambient AI scribe** → structured `EncounterNotes` + `Diagnoses` + `Vitals`, multilingual, code-switching | Critical | L | `REQ020` schema, sign-off trigger, tenancy — all done |
| A2 | **Voice-to-Rx** — dictate prescription, structured against drug master, auto-quantity | Critical | M | `REQ021` drug master + quantity arithmetic done |
| A3 | **ABDM M1** — ABHA create/verify, patient discovery, **QR scan at reception** | Critical (gate) | M | New; `Patients` extension |
| A4 | **ABDM M2 (HIP)** — FHIR R4 record sharing on consent | Critical (gate) | L | Needs FHIR projection of `Encounters` |
| A5 | **AI voice front-desk agent** — inbound booking/reschedule/status, Hindi-English | Critical | L | Writes to `availableSlots`, `QueueEntries`, `Waitlist` — all done |
| A6 | **WhatsApp AI agent** — same brain, chat channel | High | M | `REQ025` dispatch + `REQ048` provider done |
| A7 | **Entitlement guard** — enforce plan limits | High (revenue) | M | `Plans`/`PlanVersions` done; guard-chain slot exists |
| A8 | **No-show risk score** → drives deposit / reminder intensity / overbooking | High | M | Prepayment policy + reminders + session overbook all done |
| A9 | **Review submission + request loop** | High | S | Read/moderate + public profile done; **creation path missing** |
| A10 | **Template-category routing + conversation metering** | High (margin) | S | Must land before 1 Oct 2026 WhatsApp change |
| A11 | **Real telemedicine** (WebRTC/vendor, consent, session records, TPG drug list) | High | M | Replaces simulated stub |
| A12 | **Observability** — OTel traces, error tracking, SLO dashboards | High | M | None exists |

### Band B — differentiate (the moat)

| # | Capability | Impact | Effort | Notes |
|---|---|---|---|---|
| B1 | **AI coding assist** — ICD-10 + procedure codes from the note | High | M | Feeds claims; ICD-10 was `REQ020` P1 |
| B2 | **Agentic claim lifecycle** — auto-code → submit → track → **draft appeal on denial** | High | L | Claim state machine + evidence attach done |
| B3 | **Denial analytics + payer scorecards** | Med-High | M | `Claims` data model done |
| B4 | **NHCX / ABDM M4** — digital claims | High (gate for schemes) | L | Depends A3/A4 |
| B5 | **Pre-consult AI summary** — patient in 5 bullets from timeline | High | S | `patientTimeline` done |
| B6 | **AI triage / symptom intake** pre-arrival | Med-High | M | `intake-fields` done |
| B7 | **AI-assisted migration importer** — Practo/MocDoc/HealthPlix mappers that *structure* unstructured notes | High (switching) | L | #1 switching blocker |
| B8 | **Drug interaction + allergy hard-stop** | High (safety) | M | Allergy banner + drug master done |
| B9 | **Speciality packs** — dental charting, derma photo timeline, physio ROM/plans, IVF cycles, ayurveda | High (ARPA) | L each | Vertical expansion; packages done |
| B10 | **Recurring/series appointments + treatment-plan scheduling** | High | M | Multi-sitting packages done, series scheduling absent |
| B11 | **Immunisation schedule tracker** | High (paeds) | M | Large India segment; recall infra done |
| B12 | **Chronic-disease registries** (diabetes/HTN) + recall | Med-High | M | Cohort reports done |
| B13 | **Doctor revenue-share & payouts engine** | High (chains) | M | Named ICP need; branch overrides done |
| B14 | **i18n framework** + Hindi & 3 regional languages | High (reach) | M | None exists |
| B15 | **Regional-language Rx print** | Med-High | S | `REQ021` P1; competitors market 23+ languages |

### Band C — parity and platform

| # | Capability | Impact | Effort |
|---|---|---|---|
| C1 | Investigation orders + results inbox (lab loop) | Med-High | M |
| C2 | Kiosk check-in mode (QR exists; kiosk UI doesn't) | Med | S |
| C3 | Digital intake → auto-populate EMR | Med-High | M |
| C4 | Self-serve reschedule link in every reminder | Med-High | S |
| C5 | Family/household booking in one flow | Med | S |
| C6 | Group / health-camp booking | Med | M |
| C7 | Corporate & employer health packages (B2B2C) | Med-High | M |
| C8 | GST e-invoicing (IRP) | Med (statutory) | M |
| C9 | Tally / Zoho Books sync | Med | M |
| C10 | UPI AutoPay for patient treatment EMI | Med-High | M |
| C11 | Cash-flow forecast for owner | Med | S |
| C12 | TPA portal-assist (RPA form-fill) — pragmatic answer to R11 | Med-High | L |
| C13 | Offline-first PWA (poor connectivity) | Med-High | L |
| C14 | Native mobile apps (clinician + patient) | Med-High | L |
| C15 | Care pathways / protocols with auto-scheduled follow-up | Med | M |
| C16 | Inventory demand forecasting | Med | M |
| C17 | Smart recall — AI picks who to contact and when | Med-High | M |
| C18 | Patient-language auto visit summary | Med | S |
| C19 | Reseller / white-label partner portal | Med | M |
| C20 | Partner app marketplace | Med | L |
| C21 | UHI participation (demand without a marketplace) | Med-High | L |
| C22 | Complete white-labelling (hex-literal sweep) | Med | M |
| C23 | IPD-lite (beds, admission, discharge summary) | Med | L |
| C24 | Lab/diagnostics module | Med | L |
| C25 | Government schemes (PMJAY/CGHS/ECHS/ESIC) | High for S4 | L |
| C26 | Data residency + DPIA artefacts pack | Med (procurement) | S |
| C27 | Consent Manager registration (DPDP) | Med (statutory) | M |

---

## 7. New modules M18–M21

### M18 — AI Clinical Intelligence

**Purpose:** remove typing from the clinical path and make the record
machine-readable enough to bill and code from.

| FR | Requirement | Priority |
|---|---|---|
| FR-AI-01 | Capture consultation audio with explicit, logged patient consent; refuse to record without it | P0 |
| FR-AI-02 | Real-time transcription supporting English, Hindi and ≥4 regional languages, tolerating mid-sentence code-switching | P0 |
| FR-AI-03 | Structure transcript into existing `EncounterNotes` sections (complaints/history/exam/diagnosis/advice/follow-up) — never a free-text blob | P0 |
| FR-AI-04 | Extract prescription items against the real drug master, resolving Indian brand names; reuse `REQ021` auto-quantity | P0 |
| FR-AI-05 | Extract discrete vitals into `Vitals`, not prose | P1 |
| FR-AI-06 | Every AI-derived field is visibly flagged, diff-able and clinician-editable **before** sign-off; sign-off remains a human act | P0 |
| FR-AI-07 | Audio is never persisted beyond transcription unless the org opts in; retention honours `RetentionPolicies` | P0 |
| FR-AI-08 | Suggest ICD-10 codes from the note; never auto-apply without confirmation | P1 |
| FR-AI-09 | Pre-consult summary — condense `patientTimeline` to ≤5 bullets | P1 |
| FR-AI-10 | Drug-interaction and allergy conflict check against active `Diagnoses` + allergy banner; hard-stop on severe | P1 |
| FR-AI-11 | Per-tenant AI usage metering exposed to the plan engine | P0 |
| FR-AI-12 | Model/provider is swappable per org (data-residency and cost control) | P1 |
| FR-AI-13 | AI never writes to a signed encounter (existing DB trigger must hold) | P0 |

**Non-negotiables.** Clinician sign-off stays human (FR-AI-06). Every AI write
passes the same `orgScope` boundary as a human write (FR-AI-13). Audio is the
most sensitive artefact this product has ever handled — FR-AI-07 is a DPDP
requirement, not a preference.

### M19 — AI Front Desk (Agents)

**Purpose:** answer every call and message, 24/7, and write to the real calendar.

| FR | Requirement | Priority |
|---|---|---|
| FR-AGENT-01 | Inbound voice agent answers, identifies the caller against `Patients`, and books/reschedules/cancels against **real** `availableSlots` | P0 |
| FR-AGENT-02 | Code-switched Hindi/English; per-org language config | P0 |
| FR-AGENT-03 | Same capability on WhatsApp via the existing dispatch layer | P0 |
| FR-AGENT-04 | Answer report-status and balance queries, scoped to the verified caller only | P1 |
| FR-AGENT-05 | Detect urgency and escalate to a human with full transcript context | P0 |
| FR-AGENT-06 | Never diagnose or advise clinically; hard refusal boundary with an escalation path | P0 |
| FR-AGENT-07 | Every action is audited and attributed to the agent, reversible by staff | P0 |
| FR-AGENT-08 | Metered per minute and per conversation, surfaced live to the tenant | P0 |
| FR-AGENT-09 | Outbound recall/reactivation campaigns with quiet hours + frequency caps honoured (`REQ025`) | P1 |
| FR-AGENT-10 | Waitlist auto-fill by agent — offer released slot, first confirm wins | P1 |
| FR-AGENT-11 | Caller identity verification before disclosing any PHI | P0 |
| FR-AGENT-12 | Full fallback to human queue when the agent is unavailable — never a dropped call | P0 |

### M20 — Growth & Reputation

| FR | Requirement | Priority |
|---|---|---|
| FR-GROW-01 | Review **submission** path (closes the confirmed gap) | P0 |
| FR-GROW-02 | Post-visit review request over WhatsApp, quiet-hours aware | P0 |
| FR-GROW-03 | Ratings on public doctor profile + booking page | P0 |
| FR-GROW-04 | No-show risk score per appointment, driving deposit/reminder/overbook policy | P1 |
| FR-GROW-05 | Lapsed-patient recall campaigns with measured recovery | P1 |
| FR-GROW-06 | Referral-source attribution → CAC by channel | P2 |
| FR-GROW-07 | Corporate/employer package booking | P2 |
| FR-GROW-08 | Health-camp / group booking | P2 |

### M21 — Interoperability Platform (ABDM + FHIR)

| FR | Requirement | Priority |
|---|---|---|
| FR-ABDM-11 | ABHA create/verify + **QR scan-and-share at reception** (M1) | P0 |
| FR-ABDM-12 | HFR facility + HPR professional registry entries | P0 |
| FR-ABDM-13 | FHIR R4 projection of `Encounters`/`Prescriptions`/`Diagnoses`/`TestResults` | P0 |
| FR-ABDM-14 | HIP: care-context linking + consent-gated record sharing (M2) | P0 |
| FR-ABDM-15 | HIU: consent-based fetch of external records (M3) | P1 |
| FR-ABDM-16 | Consent artefact storage and revocation honouring | P0 |
| FR-ABDM-17 | NHCX claims — eligibility, pre-auth, claim, payment notice (M4) | P2 |
| FR-ABDM-18 | EHR Standards 2016 conformance assessment + remediation | P0 |
| FR-ABDM-19 | Publish live per-milestone certification status | P1 |

---

## 8. Extensions to existing modules M1–M17

Only the deltas v1 does not already specify:

| Module | Extension | Priority |
|---|---|---|
| M4 Scheduling | Recurring/series appointments; treatment-plan-driven scheduling | P1 |
| M5 Booking | Self-serve reschedule link in every reminder; family/household flow | P1 |
| M6 Queue | Kiosk mode UI; AI triage at check-in | P1 |
| M7 EMR | Speciality packs; immunisation tracker; chronic registries; investigation orders + results inbox; care pathways | P1–P2 |
| M8 Rx | Regional-language print; digital signature; TPG drug-list enforcement | P1 |
| M9 Pharmacy | Demand forecasting; purchase orders/GRN; Schedule-H register | P1 |
| M10 Billing | GST e-invoicing (IRP); Tally/Zoho sync; UPI AutoPay patient EMI; doctor revenue-share payouts | P1 |
| M11 Messaging | Template-category routing (margin); conversation budget metering | **P0** |
| M13 Portal | Offline-first PWA; native apps; i18n | P1–P2 |
| M15 Reports | Cash-flow forecast; AI narrative summaries | P2 |
| M16 Integrations | Partner marketplace; reseller portal; UHI | P2 |
| M17 Insurance | Agentic claim lifecycle + appeal drafting; denial analytics; payer scorecards; TPA portal-assist; government schemes | P1–P2 |
| S10 Plans | **Entitlement guard** (blocks tier monetisation) | **P0** |
| S12 DPDP | Consent Manager registration; DPIA + residency artefacts; retention for `clinical_records`/`messages` (see `open-questions.md` #18) | P1 |

---

## 9. Revised phasing

v1's three phases assumed a greenfield build. Re-cut against measured state and
the two gates.

### Phase 1 — "Close the two gates" (0–4 months)

**Theme:** we already run the OPD day; we cannot currently *sell* it.

- **ABDM workstream (starts day 1, parallel, own owner):** M1 + M2 certification;
  FHIR R4 projection; EHR Standards 2016 assessment; HFR/HPR registration.
- **AI clinical:** A1 ambient scribe, A2 voice-to-Rx, B5 pre-consult summary.
- **AI front desk:** A5 voice agent, A6 WhatsApp agent (booking/reschedule/status).
- **Revenue unblock:** A7 entitlement guard, A10 template-category routing +
  conversation metering (**hard deadline: before 1 Oct 2026**).
- **Fix the stub:** A11 real telemedicine + TPG drug list.
- **Cheap wins:** A9 review loop, A8 no-show risk score.
- **Platform:** A12 observability.

**Exit criteria:** ABDM M1+M2 certified · median consult ≤30s clinician effort,
no mandatory typing · voice agent books against real availability in a live
clinic · plan tiers enforced · WhatsApp margin protected before the Oct pricing
change.

### Phase 2 — "Win the mid-market" (5–10 months)

- ABDM M3 (HIU fetch)
- B1 AI coding assist → B2 agentic claim lifecycle → B3 denial analytics
- B7 AI-assisted migration importer (attack the #1 switching blocker)
- B13 doctor revenue-share & payouts
- B14/B15 i18n + regional-language Rx
- B8 drug interaction/allergy hard-stops
- B10/B11/B12 series scheduling, immunisation, chronic registries
- C1 lab loop · C3 intake→EMR · C2 kiosk · C8 GST e-invoicing · C9 Tally/Zoho
- C13 offline-first PWA

### Phase 3 — "Depth and moat" (11–18 months)

- B4 NHCX / ABDM M4 · C25 government schemes
- B9 speciality packs (dental, derma, physio, IVF, ayurveda) — primary ARPA lever
- C12 TPA portal-assist · C23 IPD-lite · C24 lab module
- C14 native apps · C19/C20 reseller + marketplace · C21 UHI
- C17 smart recall · C16 demand forecasting · C7 corporate packages

### What v2 explicitly does **not** do

Unchanged from v1 §6.4 (no IPD/ward, OT scheduling, PACS/DICOM, blood bank,
HR/payroll, full ERP accounting, international billing; **we do not underwrite,
broker or sell insurance**). Added: **we do not train foundation speech or
language models** — we buy inference and own the structuring, schema and
workflow.

---

## 10. Pricing and packaging v2

### 10.1 What the live data changes

| Input | v1 assumption | Verified 2026 | Effect |
|---|---|---|---|
| Practo real cost | "reported per-appointment fees" | Base ~₹2,000 **+ ₹1,500–3,000/mo** fees; 50–100% over headline | Flat-price wedge is real and quantifiable |
| Eka Care Clinic Pro | not priced | **₹1,00,000/yr ≈ ₹8,333/mo** | Our Clinic Pro must land under this |
| HealthPlix | ~₹3K–40K/mo | Confirmed; AI included | AI cannot be a pure upsell |
| Voice agents | category absent | ₹800/mo + ₹4/min | Metered add-on precedent |
| WhatsApp utility | not modelled | ₹0.1150/msg (marketing ₹0.8631) | Meter with disclosed margin |

### 10.2 Plan matrix v2 `[estimate]`

| Plan | Price | AI included | Positioning |
|---|---|---|---|
| **Starter** | ₹999/mo | Voice-to-Rx only, 50 consults/mo | Solo doctor. Undercut everything |
| **Clinic** | ₹3,499/mo | Scribe 300 consults/mo | 2–8 doctors. Primary ICP |
| **Clinic Pro** | ₹7,999/mo | Scribe unlimited* + WhatsApp agent | **Under Eka Clinic Pro (₹8,333)** |
| **Multi-Clinic** | ₹17,999–49,999/mo | All AI + voice agent + insurance desk | Chains. Longest LTV |
| **Enterprise** | from ₹64,999/mo | All + NHCX + schemes + SLA | Small hospitals |

\* fair-use capped, disclosed.

**Metered add-ons** (only genuinely variable costs, disclosed up front — v1's
rule, retained):

| Add-on | Cost to us | Price | Notes |
|---|---|---|---|
| WhatsApp utility | ₹0.115 | ₹0.30/msg | Reminders/receipts |
| WhatsApp marketing | ₹0.863 | ₹1.50/msg | Campaigns |
| Voice agent minutes | market ₹4/min | ₹6/min | Bundle 200 min in Multi-Clinic |
| AI consults beyond cap | provider inference | ₹8/consult | |
| SMS / storage / video minutes | pass-through + margin | — | Unchanged from v1 |

**Positioning rule v2:** be at or under the mid-market band on subscription,
**include enough AI at every tier that "does it have AI" is never a
disqualifier**, and remain unambiguously cheaper than Practo Ray above ~600
appointments/month because we charge nothing per booking.

### 10.3 The margin risk to watch

The 1 October 2026 WhatsApp change (service-window messages become chargeable)
plus per-minute voice costs mean **gross margin is now usage-sensitive in a way
v1 never modelled.** v1 targeted ≥72% gross margin. That target is only
defensible with A10 (template routing) and FR-AGENT-08 (live metering) shipped
*before* volume scales. Treat these as revenue-protection work, not plumbing.

---

## 11. Non-functional and compliance deltas

Additions to v1 §13 / §12:

| Area | Requirement | Why new |
|---|---|---|
| AI latency | Transcription→structured draft **≤5s** after consult end | Slower than typing = unused |
| AI accuracy | Published per-language WER; drug-name precision ≥98% before a market goes live | Wrong drug is a safety event, not a bug |
| Voice agent latency | ≤700ms response | Above ~1s callers hang up `[estimate]` |
| Audio residency | Processed and stored in `ap-south-1`; never leaves India | DPDP + procurement |
| AI audit | Every AI-derived field traceable to its transcript segment | Clinical defensibility |
| FHIR R4 | Conformant projection of all clinical resources | ABDM certification |
| EHR Standards 2016 | Conformance assessed and remediated | Named certification requirement |
| Observability | Traces, error tracking, SLO dashboards, uptime evidence | Currently absent |
| Consent Manager | DPDP registration ahead of ~13 Nov 2026 activation | v1 §12.1 timeline |
| Conversation metering | Per-tenant, real-time, before 1 Oct 2026 | Margin protection |

---

## 12. Risks v2

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **ABDM certification slips and blocks all scheme-linked sales** | **Critical** | Start day 1, own owner, parallel track. Treat as compliance programme, not feature |
| R2 | **AI accuracy incident causes clinical harm** | **Critical** | Human sign-off mandatory (FR-AI-06); drug precision gate ≥98%; interaction hard-stops; per-field traceability |
| R3 | AI unit economics invert at scale | High | Cap by tier, meter beyond, per-org model swap (FR-AI-12) |
| R4 | WhatsApp Oct-2026 pricing erodes margin silently | High | A10 + FR-AGENT-08 before volume |
| R5 | Voice agent mishandles an emergency call | **Critical** | Urgency detection + human escalation (FR-AGENT-05); hard clinical refusal (FR-AGENT-06); never drop a call (FR-AGENT-12) |
| R6 | Competitors bundle AI free and commoditise it | High | Compete on the closed loop (Rx→pharmacy→claim), not the note |
| R7 | Speech quality fails in real noisy Indian OPD | High | Per-language WER gate before market launch; fallback to templates always available |
| R8 | Entitlement guard mis-gates every module at once | High | v1's own caution retained: build plan data model first, guard integration as its own reviewed step |
| R9 | Two absent modules (M12/M14) are both on the critical path | High | Phase 1 exit criteria; no new module work until closed |
| R10 | AI audio recording rejected by patients/regulators | Med-High | Explicit consent (FR-AI-01), no-retain default (FR-AI-07), text-only fallback |
| R11 | TPAs remain paper/portal-bound (v1's R11, unchanged) | Med-High | Design for value without APIs; C12 portal-assist |

---

## 13. Decisions required

These block Phase 1 planning and are **not** engineering calls.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| **D1** | Speech/LLM provider | Sarvam (India, proven at HealthPlix scale) · build · global vendor | **Sarvam or equivalent Indian provider** — data residency + Indian-language quality + proven at scale. Do not build |
| **D2** | ABDM: certify ourselves or via an integrator | Direct · integrator partner | **Direct**, but hire ABDM-experienced help. It is a permanent sales gate, not a one-off |
| **D3** | AI bundled or upsold | Bundled with caps · pure add-on | **Bundled with caps** (§10.2) — competitors include it; an upsell becomes a disqualifier |
| **D4** | Voice agent: build or partner | Build on provider APIs · white-label a vendor | **Build on provider APIs.** Our write access to the real calendar is the differentiator; renting it gives it away |
| **D5** | Telemedicine: fix or drop | Real WebRTC · vendor · drop from scope | **Vendor SDK.** It is table stakes, and a simulated stub in a demo is worse than an honest gap |
| **D6** | Speciality packs: which two first? | dental · derma · physio · IVF · ayurveda | **Dental + physio** `[estimate]` — highest multi-sitting fit with shipped `packages`; confirm against pipeline |
| **D7** | `messages` retention scoping | per-org · thread-owner · schema change first | Logged as `context/open-questions.md` #18. Needs a product call |

---

## 14. Appendix — sources

Live-verified, August 2026:

- [Practo Ray Pricing 2026: The Hidden Per-Booking Fees — Cufront](https://www.cufront.com/blog/practo-ray-pricing-india-worth-it-2026)
- [Ray by Practo — Features, Reviews & Pricing — SaaSworthy](https://www.saasworthy.com/product/ray-by-practo)
- [Eka Care — Pricing, Features — Software Finder](https://softwarefinder.com/emr-software/eka-care)
- [Ayushman Bharat Digital Mission (ABDM) — eka.care](https://www.eka.care/ayushman-bharat)
- [HealthPlix × Sarvam AI — customer story](https://www.sarvam.ai/stories/healthplix)
- [HealthPlix — AI-Powered Digital Clinic](https://www.healthplix.com/)
- [EkaScribe — AI Medical Scribe](https://ekascribe.ai/)
- [The Best AI Medical Scribe & EMR in India — VivaLyn](https://www.vivalynlabs.com/emr/compare/ai-medical-scribe-india-comparison)
- [ABDM M1 to M4 Milestones — Integration Guide 2026 — Nirmitee](https://nirmitee.io/blog/abdm-integration-milestones-m1-m2-m3-m4-multi-software-guide/)
- [ABDM Mandates Are Coming — Tatvacare](https://www.tatvacare.in/blog/abdm-mandates-are-coming-what-every-indian-clinic-needs-to-do-now/)
- [ABDM Compliance Guide 2026: HIP/HIU, FHIR — Ringsafe](https://ringsafe.in/abdm-health-data-guide/)
- [AI Voice Agent for Hospital Appointment Booking India 2026 — Caller Digital](https://caller.digital/blog/ai-voice-agent-hospital-appointment-booking-india)
- [Best AI Receptionist for Clinics in India 2026 — ConnectAI](https://www.connectai.care/learn/best-ai-receptionist-for-clinics-india)
- [AI Receptionist for Hospitals & Clinics in India 2026 — HuskyVoice](https://www.huskyvoice.ai/healthcare-voice-ai)
- [WhatsApp Business API Pricing in India 2026 — MyOperator](https://myoperator.com/blog/whatsapp-business-api-pricing-india-2026)
- [WhatsApp Business API Pricing 2026: What Changed — Blueticks](https://blueticks.co/blog/whatsapp-business-api-pricing-2026)
- [Why Agentic AI in Healthcare RCM Is the Next Big Leap for 2026 — AutomationEdge](https://community.automationedge.com/t/why-agentic-ai-in-healthcare-rcm-is-the-next-big-leap-for-2026/17450)
- [Healthcare RCM Trends to Watch in 2026 — Collectly](https://www.collectly.co/blog/rcm-trends)

Internal, measured 27 Aug 2026: `backend/src` (53 domains, 51 resolvers),
`backend/prisma/schema.prisma` (100 models), 71 migrations, 93 backend suites /
1,565 tests, 4 integration suites / 387 tests, 93 frontend pages, 45 e2e specs.

Superseded but still authoritative for unchanged detail: `PRD-Healthcare-Booking-SaaS-India.md`
(v1 §7 architecture, §8 RBAC, §9 M1–M17 FRs, §11 payments, §14 data model,
appendices A–F) · `project-plans/01`–`13` · `project-plans/technical-plans/00`–`06`.
