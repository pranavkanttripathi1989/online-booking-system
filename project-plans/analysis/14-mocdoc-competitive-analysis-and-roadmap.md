---
id: PP014
type: analysis
feature: project-plans
created: 2026-08-30
updated: 2026-08-30
status: active
parent: PP000
related: [PP005, PP007, REQ157]
---

# 14 — MocDoc competitive analysis, gap-derived roadmap, and technical implementation notes

## 0. How to read this

Requested directly by the user, who named MocDoc specifically (it is one of
three vendors — Practo, MocDoc, HealthPlix — already named in this repo's
own `REQ157` migration-importer scope as a real Indian clinic-management
rival). `05-competitive-analysis.md` covers Practo/Eka Care/Bajaj Finserv
Health/HealthPlix in depth but never analysed MocDoc; this document closes
that specific gap rather than duplicating it.

**Research method and its limits, stated up front.** MocDoc is a small,
bootstrapped, low-public-visibility vendor — the honest finding of this
research is that *little independently verifiable detail exists*. No G2
listing, no confirmed client/city count, all Capterra reviews positive
(0% negative, a common sign of a curated set for a small vendor), pricing
beyond two headline numbers is "contact vendor." Where a claim below has
only MocDoc's own marketing as its source, it is marked as such — treat it
as a positioning claim to verify, not an established fact, exactly as
`05-competitive-analysis.md` itself already cautions for its own comparator
set.

**The headline conclusion, stated honestly before the detail below**: this
research did not surface major *new* gaps. It validates and reprioritises
work this repo's own phase-plan already has sequenced (`P2-13`'s lab loop,
Phase 3's native mobile shell, the Phase-1 ABDM gate), surfaces the single
sharpest concrete differentiator this product already has and MocDoc
verifiably does not (a real, working ambient AI scribe), and turns up
exactly one genuinely new, narrow, buildable item (billing-report
granularity by service category). A document that stretched three thin
findings into ten roadmap items would be less useful than saying so
plainly.

## 1. MocDoc profile

| | |
|---|---|
| Founded | 2012, Chennai (legal entity YRO Systems Private Limited) |
| Funding | ~$136K total across 4 seed rounds (2014–2018) — bootstrapped, not VC-scaled |
| Scale | 56 employees (Apr 2025); revenue <₹10 Cr (~$1.2M, FY ending Mar 2025); Tracxn rank 142/3,082 in its category |
| Pricing | Clinic tier: ₹15,000 (+GST) flat, "Buy Now Pay Later" option. Hospital tier: ₹3,50,000, "pricing on request" beyond. No transparent scaling-by-clinic-count/user-count pricing published |
| Target market | Small clinics through multi-branch hospital chains, labs, pharmacy chains (Capterra: 95% small-business, 81% "Hospital & Health Care" industry) |
| Review presence | Capterra only (44 reviews, 4.9/5, 0% negative shown); no G2 listing found at all |

Sources: Tracxn company profile, Techjockey product listings, Capterra
product page — see the research fork's own report for exact URLs per
claim; not re-cited individually here per this repo's own convention of
citing provenance in the analysis, not reproducing a bibliography.

## 2. Feature-by-feature comparison

| Capability | MocDoc (claimed/found) | MediBook/CareOS today | Verdict |
|---|---|---|---|
| Appointment scheduling | Standard scheduling/management | Session/token dual-mode, multi-resource, real EXCLUDE-constraint conflict prevention, recurring series (`REQ017`/`REQ163`) | **MediBook ahead** — this was already this codebase's own strongest area |
| EMR / clinical records | Charting, physician management | Structured notes, diagnoses (ICD-10-assisted), vitals, referrals, investigation orders, allergy banner, DB-trigger-enforced sign-off immutability (`REQ020` and its P1 residue) | **MediBook ahead** |
| **Ambient AI scribe** | **None found** — a *third-party* vendor (ScribeHealth AI) sells a bolt-on integration; MocDoc has not built this natively as of 2026 | **Real, native**: audio capture with logged consent, structured notes/diagnoses/vitals, voice-to-Rx, pre-consult AI summary (`REQ151`, "highest leverage in the whole plan" per this repo's own phase-plan) | **MediBook's single sharpest differentiator against this specific competitor** |
| ABDM/ABHA | **Real, marketed integration** — ABHA creation/verification/linking in patient registration, consent-based ABDM record sharing. Heavy 2026 content-marketing push framing ABDM as "essential for Indian clinics in 2026" | **Blocked** — needs real NHA sandbox credentials and literal government certification, unverifiable in this environment; skipped per explicit user decision (`P1-08`/`09`/`10`) | **MocDoc ahead** — the one gap this analysis reinforces rather than discovers; already correctly gated as Phase 1's own blocker, not a new finding |
| Lab / LIMS | **Real depth** — barcode support, collection-center workflows, lab-machine integration (own "MocDoc vs KareXpert" comparison names this as a strength) | Investigation orders exist and write real `TestResults` rows (`REQ127`, plus this session's own `patient_id` exposure); **no results-inbox worklist, no instrument/barcode integration** | **MocDoc ahead on depth** — see §4, this reinforces `P2-13`, doesn't invent it |
| Native mobile apps | Real iOS/Android patient app + separate staff app — but "mobile app functions slightly limited compared to desktop" (Capterra), a crash complaint on Google Play, and the main app has "not received enough ratings" on the Apple App Store (a real low-usage signal) | **None** — web SPA only; a Capacitor shell is explicitly Phase 3, deliberately after PWA (`P2-19`), per this repo's own "measure whether native is still needed" note | **MocDoc ahead on existence, unclear on quality** — a mediocre app still beats no app; reinforces Phase 3 priority, doesn't change its sequencing |
| WhatsApp / SMS | Listed as a supported integration, no depth shown | Real channel-priority dispatch (WhatsApp → SMS fallback), quiet hours, daily frequency caps, per-org provider registry (`REQ025`/`REQ048`) | **MediBook likely ahead** on depth, though MocDoc's own implementation depth is unverified either way |
| Regional-language UI | **None found** in any source | **6 languages shipped** (Tamil, Bengali, Marathi, Telugu, Kannada, Gujarati) plus Hindi (`REQ161`) | **MediBook ahead**, and this is a confirmed absence on MocDoc's side, not just an unknown |
| Insurance / TPA / claims | Listed as "Medical Claims" feature name only — no payer-integration, pre-auth, or empanelment depth shown | Payer master + empanelment + tariffs (`REQ031`/`REQ062`/`REQ068`), plus an **agentic** claim lifecycle — AI coding assist, denial classification, drafted appeals (`REQ155`/`REQ156`) | **MediBook likely ahead** on demonstrated depth |
| Doctor revenue-share / payouts | Not found in any source | Real rate-resolution hierarchy (clinician > clinic > org default), monthly payout computation with an approval step (`REQ158`) | **MediBook has a feature MocDoc shows no evidence of at all** |
| Chronic-disease registries / population health | Not found | Just shipped — diabetes/HTN registries, ICD-10-suggested enrollment, recall sweep (`REQ168`, this session) | **MediBook has a feature MocDoc shows no evidence of at all** |
| Billing-report granularity | **A real, specific customer complaint**: "separate billing reports for consultations versus procedures" wanted | Not confirmed either way — see §5 | **Genuinely new, narrow, actionable finding** |
| Data-migration / switching cost | No evidence of an inbound importer *from* other systems | Real, AI-assisted CSV importer with a structuring wedge for free-text notes (`REQ157`) — built specifically to make switching *off* MocDoc/Practo/HealthPlix easy | **MediBook has the exact tool this vendor doesn't appear to offer** |

## 3. What MocDoc's own complaints reveal (real customer signal, not speculation)

From Capterra's own quoted review text (even a curated positive set still
surfaces real friction in its "cons" fields) and Techjockey feedback:

1. "Initial training required for new staff to fully utilize all
   features" and mixed reports on mobile-app quality — a UX-maturity
   signal, not something this document can act on directly, but worth
   noting as a go-to-market angle: `REQ045`'s own self-serve onboarding
   wizard is a real, already-shipped counter-positioning point if this
   product's own onboarding friction is genuinely lower.
2. "Some advanced reports could be more customizable," sharpened by a
   specific ask: separate billing reports for consultations vs.
   procedures. This is the one concrete, buildable gap — see §5.
3. "Higher cost for add-on" compliance/security features, plus an opaque
   "contact vendor" pricing model beyond two headline numbers — a
   transparency angle only, not a product gap this document can size.

## 4. Reinforced (not new) priorities

**`P2-13` ("Investigation orders + results inbox (lab loop)") is
partially stale as currently phrased in
`02-phase2-win-the-midmarket.md` — verified before writing this, not
assumed.** `orderInvestigation()` (`backend/src/encounters/encounters
.service.ts`) already exists and already writes a real `TestResults` row
from within an encounter (`REQ127`, 2026-08-26) — the "investigation
orders" half of that slice's own title is done. What genuinely remains,
and what MocDoc's own confirmed LIMS depth (barcode support, collection-
center workflows, lab-instrument integration) argues for prioritising:

- A **results inbox** — a worklist view (pending/incoming results across
  a clinician's or a lab's own patients), which does not exist today; the
  standalone `test-results/index.jsx` page is an all-results list, not a
  triaged inbox.
- Lab-instrument/barcode integration is real depth MocDoc has that this
  product doesn't attempt — correctly out of scope for a near-term slice
  (it needs a real instrument-integration partner, the same "no
  fabricated vendor fidelity" discipline `REQ157` already applied to
  per-vendor export mappers), but worth recording as the reason `P2-13`'s
  own title should be corrected to "results inbox" only when it's next
  picked up, not re-scoped to include "investigation orders" work that's
  already shipped.

**Phase 3's native mobile shell** is reinforced, not changed in priority,
by MocDoc having a real (if mediocre — mixed reviews, a crash complaint,
un-aggregated App Store ratings) app that this product still lacks
entirely. The existing sequencing (PWA first, `P2-19`, "measure whether
native is still needed") remains the right call — MocDoc's own low
apparent install base is a reason not to over-index on matching it
feature-for-feature before the PWA data exists.

**The Phase 1 ABDM gate** is reinforced by MocDoc's heavy, current
(2026) ABDM content-marketing push — this is genuinely the market's
current competitive angle, and this repo's own gate (real NHA sandbox
credentials, actual government certification) remains the correct,
already-identified blocker. Nothing new to add here beyond confirming
the market pressure is real, not hypothetical.

## 5. The one new item: billing reports by service category

**Design, not just a request.** MocDoc's own complaint names a fixed
binary (consultation vs. procedure). This schema doesn't have a fixed
"consultation/procedure" split on services — but `Products.category_id
-> ProductCategories.name` already exists as an **org-configurable**
category (a manager creates their own categories today for their own
catalog). A billing report split by *real, org-defined* category is a
strictly more flexible answer than MocDoc's own fixed two-bucket
request, and needs no new schema: group existing revenue-reporting
queries (`finances/index.jsx`'s backend counterpart, or `getPatientReportGroup`-adjacent analytics) by
`AppointmentPayments`/counter-billing rows joined through
`Appointments.product_id -> Products.category_id -> ProductCategories
.name`, alongside the existing per-clinic/per-date grouping already
there. A future slice, not scoped further here — this document is
analysis, not an implementation plan for a slice nobody has asked to
build yet; log it as a candidate the next time analytics-reporting work
is picked up.

## 6. What this document deliberately does not do

- **No new REQ/PLAN/TP/TR was written for this document.** It is pure
  analysis (the "why" layer), matching `05-competitive-analysis.md`'s
  own precedent — a roadmap item only gets a `REQ` when someone decides
  to build it, per `CLAUDE.md`'s own working loop.
- **No fabricated MocDoc technical depth.** Where the research found
  only a feature *name* (e.g. "Medical Claims") with no verifiable
  workflow detail, this document says so rather than assuming parity or
  superiority in either direction.
- **No pricing-strategy recommendation.** MocDoc's own pricing opacity
  is noted as a positioning fact, not translated into a specific pricing
  change for this product — that's a business decision outside this
  analysis's scope.
