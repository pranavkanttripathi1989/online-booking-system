---
id: PP007
type: analysis
feature: project-plans
created: 2026-08-22
updated: 2026-08-25
status: active
parent: PP000
related: [PP006]
---

# 07 — PRD gap analysis and consolidated roadmap

`PRD-Healthcare-Booking-SaaS-India.md` describes a materially larger product ("CareOS") than what exists today. This document is the bridge between that PRD and the 22 detailed requirement documents (`REQ014`–`REQ035`) now filed under `requirements/`, each with user stories and acceptance criteria. Read this first for the shape of the gap and the sequencing; read the individual `REQ` documents for the engineering detail.

**This document is a point-in-time snapshot, not a living tracker — the "state today" table below has drifted twice since its own `updated:` date.** Two full backend-only batches have shipped against it since 2026-08-22, each closing several of the module rows' own remaining P1 scope: `context/machine-handoff-2026-08-24.md` (Phase G+2, 8 slices — `REQ018` residue, `REQ032`, `REQ034`, `REQ022`, `REQ030`, `REQ031`, `REQ015`, `REQ029` 2nd slice) and this session's own 8-slice pass (`REQ051`–`REQ058` — see `CLAUDE.md`'s own "Phase G+3" section for the full account: pre-consultation checklist gating call-next, auto-no-show sweep + configurable intake fields, break-glass access + impersonation, multi-sitting service packages, org→branch masters cascade, day-end cash close + discount approval, downloadable record PDFs, department/branch-scoped messaging threads). Read the table below for the shape of the gap as originally analysed, not as a claim of current state — cross-check `requirements/README.md`'s own per-feature status columns (also prone to drift, per this same session's own earlier finding) or, better, `grep` the real code before trusting either.

## 1. What the PRD asks for versus what exists

The PRD organizes the product into 17 functional modules (M1–M17) plus a Super Admin commercial layer, a payments layer, and a compliance section. Mapping every module against the codebase audited in `01`–`06` of this directory:

| PRD module | Feature slug | State today | REQ |
|---|---|---|---|
| M1 Tenant Onboarding & Org Mgmt | `organizations` | Partial — org/branch/clinic CRUD real; no Department/Resource, onboarding wizard is mock | REQ014 |
| M2 Identity, Auth & Security | `security` | Strong auth fundamentals real; RBAC enforcement is the known F-03 gap; SSO/API-keys/clinician-verification net-new | REQ015 |
| M3 Master Data Catalogues | `catalog-master-data` | Partial — services/products real; packages, drug master, tiered pricing net-new | REQ016 |
| M4 Scheduling/Calendar Engine | `scheduling-engine` | Partial — P0 shipped 2026-08-24 (session/token mode, multi-resource booking, mode-aware slot-integrity constraint, `PLAN055`); hybrid interleaving, waitlist, delay broadcast, bulk-reschedule, and the live-throughput ETA refinement remain P1 | REQ017 |
| M5 Booking Engine | `appointments` | Strong core — state machine already matches PRD; dedup+merge and family/dependant profiles shipped 2026-08-24 (`PLAN059`); per-service prepayment policy and the embeddable booking widget remain, both still P0 in the requirement's own phase assignment but deliberately deferred to a future slice | REQ018 |
| M6 Check-in & Queue | `queue-management` | Partial — P0 shipped 2026-08-24 (live queue board, call-next/recall/skip/transfer actions, unbilled-visits report, on top of the prior check-in slice `REQ042`, `PLAN058`); QR self-check-in, a predictive rolling-median ETA, mandatory pre-consultation checklists, and triage/vitals remain P1 | REQ019 |
| M7 Consultation & EMR | `clinical-records` | Partial — P0 shipped 2026-08-24 (structured notes, templates, allergy banner, sign-off immutability by DB trigger, patient timeline, `PLAN056`); ICD-10 coding, discrete vitals/growth charts, investigation orders, referrals remain P1/P2 | REQ020 |
| M8 Prescriptions | `prescriptions` | Partial — P0 shipped 2026-08-24 (drug search with auto-calculated quantity, favourite drug-sets, a single-rendering-path print view, repeat-from-history with reprint watermarking, `PLAN057`); WhatsApp sharing, TPG drug-list enforcement, regional-language rendering, digital signatures, and the pharmacy handoff remain P1 | REQ021 |
| M9 Pharmacy & Inventory | `pharmacy` | **Absent** — Products is retail-catalogue only, no batch/stock ledger | REQ022 |
| M10 Billing & Payments | `patient-payments` | Partial — real Razorpay integration; counter/mixed-tender, day-end, revenue-share net-new | REQ023 |
| M11 Messaging & Notifications | `messaging` + `notifications` | Partial — real threads and trigger pipeline exist; SLA inbox, WhatsApp, sender identity net-new | REQ024, REQ025 |
| M12 Telemedicine | `telemedicine` | **Absent** — routed page, zero implementation | REQ026 |
| M13 Patient Portal | `patient-portal` | Partial — pages exist but two are fabricated-data (`project-plans` F-18); family/ABHA/i18n net-new | REQ027 |
| M14 ABDM & Interop | `abdm-interop` | **Absent** | REQ028 |
| M15 Reports & Analytics | `analytics-reporting` | Partial — real dashboard/analytics; Patient report group, scheduled delivery, true-utilisation fix net-new | REQ029 |
| M16 Integrations & Extensibility | `platform-integrations` | **Absent** — GraphQL-internal only, no public API/webhooks | REQ030 |
| M17 Insurance, Claims & Payer Mgmt | `insurance-claims` | **Absent** — largest net-new module (95 FR items); scoped to PRD's own P1 slice only | REQ031 |
| §10 Super Admin Plan Builder | `subscription-plan-engine` | Schema only — `CLAUDE.md` already documents entitlement enforcement as "not built" | REQ032 |
| §11 Payments Flow B (e-mandate) | `platform-billing` | **Absent** | REQ033 |
| §12 DPDP Compliance | `compliance-dpdp` | Partial — encryption/audit exist; consent/rights/breach workflows net-new | REQ034 |
| §13 Non-Functional Requirements | `platform-nfr` | Partial — adopts `project-plans` F-13/14/15 as standing constraints; offline/i18n/observability net-new | REQ035 |

**Reading this table honestly (as originally analysed, 2026-08-22):** of the 20 rows, **9 modules are "Absent" with zero existing scaffolding** — queue-management, clinical-records, prescriptions, pharmacy, telemedicine, abdm-interop, platform-integrations, insurance-claims, and platform-billing. The remaining **11 are "Partial"** — a real, working foundation with a specific, named gap: organizations, security, catalog-master-data, scheduling-engine, appointments, patient-payments, messaging, notifications, patient-portal, analytics-reporting, compliance-dpdp, subscription-plan-engine, and platform-nfr (13 entries across 11 module rows, since M11 and the NFR/compliance sections each split across more than one feature slug). **No module is "fully satisfied" as the PRD describes it.** This PRD represents the next 12–18 months of the product's life, not a documentation exercise.

**Updated (2026-08-24):** `clinical-records` (M7), `prescriptions` (M8), and
`queue-management` (M6) all moved from Absent to Partial the same day
(`REQ020`/`REQ021`/`REQ019`'s P0 shipments) — **6 modules now Absent, 14
Partial.** `subscription-plan-engine` (§10) is the only Phase G module still
sitting at its original "schema only" state; see the M6/M7/M8 rows above
and `PLAN056`/`PLAN057`/`PLAN058` for what shipped versus what remains
P1/P2 in each.

The exact split matters less than the shape: the product's booking/scheduling/patient-management core is a genuine asset to build on; the clinical, pharmacy, insurance, and interoperability layers that would make it a full practice-management platform are almost entirely unbuilt.

## 2. The hard prerequisite: this PRD cannot be built on the current foundation as-is

`project-plans/02-findings-register.md` identified 3 ship-blocking findings (S1) before any of this PRD work was read: a live cross-tenant data-disclosure path (F-01), a client-side authentication bypass (F-02), and zero database indexes across all 41 models (F-13). Building 9 new net-new modules and extending 13 more on top of that foundation would not just leave those 3 findings unfixed — it would **replicate them at 20x the surface area**, since every new tenant-scoped table inherits the same risk pattern if the underlying `orgScope()` helper isn't fixed first.

This is not a hypothetical caution. `REQ020` (clinical records) explicitly calls out that its module "handles the most sensitive PHI in the entire product" and that the cross-tenant read `project-plans` found on the catalogue domain "would be materially worse if it recurred here." `REQ031` (insurance) makes the identical point about financial and clinical data. `REQ035` (platform NFRs) makes the point structurally: it requires every new table in `REQ014`–`034` to carry indexes from day one, specifically because retrofitting indexing across 20+ new modules would cost far more than building it in correctly now.

**Recommendation: `project-plans/06-execution-plan.md`'s P0 phase (secure and stabilise, ~2 weeks) and P1 phase (prove the tenancy boundary with a real integration test, ~1.5 weeks) must complete before implementation planning begins on any `REQ014`–`035` document.** This is a re-statement of an existing recommendation, not a new one — it is restated here because the scale of new work being proposed makes the cost of skipping it much higher than when it was first written.

## 3. Sequencing the 22 requirements into phases

The PRD's own three-phase structure (§6: Phase 1 MVP, Phase 2 V1 GA, Phase 3 V2) is sound and this roadmap follows it, layered on top of the `project-plans` P0/P1 foundation work.

### Phase F — Foundation (prerequisite, ~3.5 weeks)
`project-plans/06-execution-plan.md` P0 + P1, unchanged. Not re-scoped here.

### Phase G — PRD MVP core ("run the OPD day")
The PRD's own Q1–Q2 roadmap milestones. Sequencing within this phase follows the dependency chain each `REQ` document states explicitly:

1. **REQ014** (organizations: Department/Resource entities, real onboarding) — foundational, everything else's tenant hierarchy sits on it.
2. **REQ017** (scheduling engine: session/token mode) — the PRD's own "heart of the product," and a hard dependency for queue management.
3. **REQ018** (booking engine extensions) — builds on REQ017.
4. **REQ019** (queue management) — depends on REQ017's token concept.
5. **REQ016** (catalog master data: drug master specifically) — must land before prescriptions.
6. **REQ020** (clinical records / EMR) — depends on REQ019's check-in flow for its entry point.
7. **REQ021** (prescriptions) — depends on REQ020 and REQ016.
8. **REQ023** (billing depth) — extends the already-real payment integration; can run in parallel with 2–7.
9. **REQ032** (subscription plan engine v1) — the PRD names this an explicit MVP-GA exit criterion; can run in parallel with 2–8 since it has no dependency on the clinical stack.

**Status (2026-08-24) — five of six requirements in this pass shipped their
P0 scope; `REQ032` deliberately paused before starting.** The
6-requirement pass through this list's critical path
(`REQ017` → `REQ020` → `REQ021` → `REQ019` → `REQ018` → `REQ032`) closed
four items in one continuous session: `REQ017`, `REQ020` (both done
earlier the same day), `REQ021` (prescriptions — `PLAN057`/`TP084`/`TR083`,
`context/prescriptions-2026-08-24-req021/manifest.md`), `REQ019` (queue
management — `PLAN058`/`TP085`/`TR084`,
`context/queue-management-2026-08-24-req019/manifest.md`), and `REQ018`'s
own P0 **subset** (patient dedup+merge, family/dependant profiles —
`PLAN059`/`TP086`/`TR085`,
`context/appointments-2026-08-24-req018/manifest.md`; per-service
prepayment policy and the embeddable widget, both also P0 in `REQ018`'s
own phase assignment, were scoped out to keep the slice coherent and are
still open). `REQ016`'s catalog/drug-master piece was already done from an
earlier session, so it's not repeated in this pass; `REQ023`/`REQ014`'s
remaining scope is not part of this specific pass and stays open.

`REQ032` was scoped for this pass but **deliberately paused before any
code was written**, on review of its risk profile relative to the four
items above: those were additive, isolated new modules (`prescriptions/`,
`queue/`, extensions to `patients/`); `REQ032` requires a global
`EntitlementGuard` consulted on every feature-gated resolver call across
the whole app (structurally analogous to the existing `RolesGuard` already
in the shared `APP_GUARD` chain), plus Redis-backed per-tenant caching to
avoid an N+1-shaped latency cost on every gated call (`project-plans`
F-15's own warning, cited directly in `REQ032`'s non-functional notes).
Getting the guard-chain integration wrong doesn't fail one feature — it
can silently over- or under-gate every feature-flagged module in the
product at once. When picked up, start with the plan-builder data model
and versioning (`US-PLAN-01`/`02`, additive and lower-risk), and treat the
guard's integration into the shared chain as its own separately-reviewed
step, not bundled into the same slice.

Classifying `REQ020`'s new tenancy-matrix domain also surfaced
that `REQ017`'s own `resources` domain had shipped without ever being added
to `matrix-coverage.int-spec.ts` — closed in the same pass, alongside two
more pre-existing gaps (`drugs`, `organization-onboarding`) the same gate
found once exercised. `REQ018`'s own slice separately found and closed a
live, pre-existing gap unrelated to that gate: `createAppointment` never
validated a `'patient'`-role caller's `input.patient_id` against their own
identity at all — any authenticated patient could book under any other
patient_id. See `PLAN059` for the full account, including why family
profiles specifically was what surfaced it (the feature needed the
*opposite* of a blanket restriction, which required actually looking at
what validation existed before).

### Phase H — V1 GA ("sellable to chains")
The PRD's own Q3–Q4 roadmap milestones:

10. **REQ022** (pharmacy) — depends on REQ021.
11. **REQ024** (messaging extensions) and **REQ025** (WhatsApp/notifications) — REQ025 specifically should not wait for the rest of this phase; `project-plans/06` P5 Wave A already flags WhatsApp as the single highest-ROI item audited, and it has no dependency on anything else in Phase H.
12. **REQ026** (telemedicine) — hard-blocked on REQ021's TPG guardrails.
13. **REQ028** (ABDM M1–M3) — start the external certification process at the *beginning* of this phase regardless of when the corresponding build work lands, since certification lead time is outside engineering's control.
14. **REQ033** (platform billing / e-mandate).
15. **REQ030** (platform integrations: public API, webhooks, second gateway).
16. **REQ031** (insurance: P1 scope — payer master, OPD cashless) — this is the PRD's own recommended sequencing (Open Question 10: "OPD first").
17. **REQ027** (patient portal extensions).
18. **REQ034** (DPDP compliance) — should run throughout this phase rather than as a discrete step at the end, per the PRD's own reasoning that retrofitting consent capture is far more expensive than building it in from the start.
19. **REQ015** (RBAC/identity extensions) — should land early in this phase, not late, since `REQ031`'s Insurance/TPA Desk Executive role and every other new role this PRD introduces depend on real permission enforcement to be meaningful.

### Phase I — V2 ("depth & moat")
The PRD's own Q5–Q6 roadmap milestones:

20. **REQ031's P2/P3 follow-on** (IPD pre-authorisation, hospital claims/settlement, NHCX/M4, government schemes) — to be written as new requirement documents once Phase H's OPD-cashless scope has real usage data to design against, per REQ031's own explicit recommendation against building this speculatively.
21. **REQ029** (analytics-reporting: Clinical/Pharmacy/Insurance report groups) — each unlocks as its source module (REQ020/022/031) lands.
22. **REQ035**'s remaining items (offline resilience, i18n, observability/SLOs, feature-flag/canary deployment) — these should not wait until V2 by default; several (indexing discipline, pagination, N+1 avoidance) are load-bearing constraints on every phase above them and were written as standing rules for exactly that reason.

## 4. What this roadmap deliberately does not do

It does not attempt to schedule every one of the PRD's ~200 individual `FR-*` requirements against a calendar — that level of planning belongs in each `REQ` document's own future implementation-plan phase, once `CLAUDE.md`'s working loop reaches that step. It does not resolve any of the PRD's 13 open questions (§19) or this session's newly-logged ones (each `REQ` document's own "Open questions" section) — those need a human decision, not an engineering plan. And it does not re-litigate `project-plans/01`–`06`'s own findings and execution plan — this document assumes that work stands as written and builds forward from it.

## 5. Next step

Per `CLAUDE.md`'s working loop, none of `REQ014`–`035` should proceed to an implementation-plan document until: (a) `project-plans/06-execution-plan.md` P0–P1 is complete, and (b) each requirement's own genuine ambiguities (several are flagged explicitly in their "Open questions" sections — drug database licensing, regional-language priority, free-tier strategy, payer-partnership approach) are either resolved or explicitly accepted as deferred, logged in `context/open-questions.md` rather than guessed at.
