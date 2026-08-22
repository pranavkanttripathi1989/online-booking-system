# Product Requirements Document
## Multi-Tenant Healthcare Booking & Clinic Operations SaaS (India)

**Working product name:** *CareOS* (placeholder)
**Document version:** 1.0 (Draft for review)
**Date:** 22 August 2026
**Owner:** Product Management
**Status:** For stakeholder sign-off
**Reviewers:** Engineering, Design, Clinical Advisory, Compliance/Legal, Sales, Customer Success

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Indian Market Analysis](#2-indian-market-analysis)
3. [Competitive Landscape](#3-competitive-landscape)
4. [Positioning, Vision & Differentiation](#4-positioning-vision--differentiation)
5. [Personas & Jobs To Be Done](#5-personas--jobs-to-be-done)
6. [Product Scope & Release Phasing](#6-product-scope--release-phasing)
7. [System Architecture & Tenancy Model](#7-system-architecture--tenancy-model)
8. [RBAC & Permission Model](#8-rbac--permission-model)
9. [Functional Requirements by Module](#9-functional-requirements-by-module)
    - *(includes [M17 — Insurance, Claims & Payer Management](#m17--insurance-claims--payer-management))*
10. [Subscription, Plans & Pricing Engine (Super Admin)](#10-subscription-plans--pricing-engine-super-admin)
11. [Payments & Money Movement](#11-payments--money-movement)
12. [Regulatory & Compliance Requirements](#12-regulatory--compliance-requirements)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Data Model](#14-data-model)
15. [Analytics, KPIs & Success Metrics](#15-analytics-kpis--success-metrics)
16. [Go-To-Market Plan](#16-go-to-market-plan)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Roadmap](#18-roadmap)
19. [Open Questions](#19-open-questions)
20. [Appendices](#20-appendices)

---

## 1. Executive Summary

### 1.1 The product in one paragraph

CareOS is a multi-tenant, cloud-based booking and clinical operations platform for Indian healthcare providers. A single Super Admin (the SaaS operator) onboards **Organizations** (hospitals, clinic chains, standalone clinics, diagnostic centres). Each Organization runs one or more **Branches/Clinics**, each with **Rooms**, **Resources**, **Services**, **Products**, **Pharmacy** and **Clinicians**. Patients discover and book appointments online or by phone, check in via QR/kiosk, are queued, seen by a clinician who records a consultation and issues a digital prescription, then pay at the counter or online — with the pharmacy dispensing against that same prescription. Everything runs on role-based access control (Super Admin, Org Admin, Branch Manager, Clinician, Front Desk/Staff, Pharmacist, Accountant, Patient), and the Super Admin can compose commercial **Plans** from a catalogue of modules, quotas and metered services, price them, and bill tenants automatically.

### 1.2 Why now

- **ABDM has crossed the tipping point.** ABHA IDs are now ubiquitous; over 840 million have been created, and ABDM linkage is increasingly expected — effectively mandatory for facilities tied to government schemes such as AB-PMJAY. Software that is not ABDM-certified is becoming unsellable to any facility that wants scheme empanelment or DHIS incentives.
- **Claims are moving to rails.** NHCX went live in June 2024 and, as of mid-2026, roughly 12,600+ hospitals and 160 integrators are onboarded. Providers earn incentives under the Digital Health Incentive Scheme (reported at ₹500 per claim or 10% of claim value, whichever is lower) for claims routed digitally.
- **The DPDP clock is running.** The DPDP Rules were notified on 13 November 2025; penalties and Consent Manager registration activate around 13 November 2026, with full compliance due 13 May 2027. Health data is the most sensitive category — buyers will start asking vendors for DPDP artefacts during procurement in FY27.
- **Recurring billing just got easier.** Under RBI's consolidated *Digital Payments — E-mandate Framework, 2026* (effective 21 April 2026), recurring auto-debits up to ₹15,000 per transaction clear without a per-cycle OTP after a one-time mandate setup, with mandatory 24-hour pre-debit notice. Most Indian clinic SaaS subscriptions sit below ₹15,000/month — meaning UPI AutoPay can now carry SMB subscription revenue with far less involuntary churn.
- **The incumbent set is fragmented and polarised.** The market splits between cheap solo-doctor tools (limited multi-location depth) and expensive enterprise HIS. The mid-market — 3 to 40 doctors, 2 to 15 locations, OPD-heavy, pharmacy attached — is served badly.

### 1.3 The wedge

**Own multi-location OPD operations end to end, with pharmacy attached, at mid-market pricing, ABDM-certified from day one.**

Concretely, three things incumbents rarely combine:
1. A **calendar/availability engine** that models real Indian OPD reality — visiting consultants across branches, session-based OPD (not 15-min slots), token systems, overbooking, doctor-runs-late broadcasts.
2. A **prescription-to-pharmacy loop** inside one tenant: the Rx a clinician signs is the same object the in-house pharmacy dispenses, decrements stock against, and bills with GST.
3. A **Super Admin commercial layer** with a real plan builder (entitlements, quotas, metered add-ons, price books) so the business can sell modular plans without engineering involvement.
4. An **insurance layer built for outpatient reality** — policy capture, eligibility, OPD cashless/benefit-wallet adjudication at the counter, and a pre-auth/claims desk with regulatory turnaround clocks — where competitors have built only hospital IPD claims, if anything.

### 1.4 Success criteria (first 18 months post-GA)

| Metric | Target |
|---|---|
| Paying organizations | 400 |
| Active clinicians (billable seats) | 2,000 |
| Net revenue retention | ≥ 110% |
| Logo churn (monthly) | < 1.5% |
| Time-to-first-booking after signup | < 24 hours |
| Appointments processed / month | 1.2 million |
| ABDM M1–M3 certification | Achieved pre-GA |
| Gross margin | ≥ 72% |

---

## 2. Indian Market Analysis

### 2.1 Market sizing

| Layer | Estimate | Notes |
|---|---|---|
| Registered allopathic clinics + small hospitals in India | ~500,000+ establishments | Highly fragmented; majority 1–5 doctors |
| Facilities on the Health Facility Registry | 400,000+ | ABDM Digital Health Expo cited 420,000 facilities and 680,000 professionals |
| India digital health market | ~USD 8.8 Bn (2024), growing ~17% CAGR | Software + services |
| India practice management software segment | ~USD 0.43 Bn by 2026, cloud share ~75% | Fortune Business Insights, cited in industry comparisons |

**Serviceable segment for CareOS (SOM logic):**
- Target: clinics/small hospitals with 2–40 clinicians and 1–15 locations, urban and tier-2/3.
- Assume ~120,000 such establishments; assume 25% will pay for cloud software within 5 years = 30,000 buyers.
- Blended ARPA target ₹4,500/month → ₹162 Cr ARR at 10% share of that paying pool.

### 2.2 Buyer segments

| Segment | Size | Buying trigger | Willingness to pay | Notes |
|---|---|---|---|---|
| **S1. Solo practitioner** | 1 doctor, 1 location | Wants online booking + digital Rx; often price-shopping | ₹800–2,500/mo | High churn, low support tolerance. Acquire via self-serve. |
| **S2. Single multi-doctor clinic** | 2–8 doctors | Front-desk chaos, queue mismanagement, no-shows | ₹3,000–12,000/mo | **Primary ICP.** Decision by owner-doctor + practice manager. |
| **S3. Clinic chain** | 2–15 branches | Central visibility, doctor revenue-share, standardisation | ₹15,000–80,000/mo | **Primary ICP.** Longest LTV, needs org-level reporting. |
| **S4. Small hospital (20–150 beds)** | OPD + IPD + pharmacy + lab | ABDM/PMJAY compliance, claims | ₹40,000–2,00,000/mo | Phase 2/3. Requires IPD, lab, NHCX. |
| **S5. Speciality chains** (dental, derma, IVF, physio, eye, ayurveda) | Vertical workflows | Treatment plans, packages, multi-sitting | ₹8,000–50,000/mo | High-margin expansion via vertical templates. |
| **S6. Diagnostics/pharmacy-first** | Labs, standalone pharmacies | Booking + billing | Varies | Adjacent; not in initial scope. |

### 2.3 Structural market realities to design for

1. **Doctors don't run 15-minute grids.** Most Indian OPD runs on *sessions* (e.g., "Mon–Sat 6–9 PM") with token numbers, not fixed slots. Any product that forces a Western slot model gets abandoned at the front desk.
2. **Visiting consultants are the norm.** One doctor works at 3–4 unrelated clinics with different fees, different revenue-share percentages, and different schedules. Provider identity must be shareable across organizations without leaking clinical data.
3. **Cash and UPI dominate the counter.** Online prepay adoption is improving but the front desk still settles most bills. Billing must handle partial payments, cash, UPI QR, cards, and mixed tenders.
4. **WhatsApp is the patient channel.** SMS is deliverability-hostile (DLT templates) and email is nearly dead for patients. WhatsApp Business API is not optional.
5. **Pharmacy is a profit centre**, often the biggest one in a small clinic. Batch/expiry, GST, and Schedule H register handling are table stakes.
6. **Language matters.** Prescriptions in regional languages are a live differentiator — at least one competitor now markets prescriptions in 23+ Indian languages.
7. **Data migration is the #1 switching blocker.** Clinics stay on inferior software because their patient history is trapped. Free, fast migration is a growth lever, not a support cost.
8. **Marketplace lock-in cuts both ways.** Practo's demand marketplace is a genuine moat for patient acquisition; a non-marketplace product must compete on *owning the clinic's own demand* (white-label booking page, WhatsApp reactivation, recall campaigns).

---

## 3. Competitive Landscape

### 3.1 Competitor teardown

| Product | Positioning | Strengths | Weaknesses / gaps we exploit | Reported pricing |
|---|---|---|---|---|
| **Practo Ray** (+ Practo Insta for enterprise) | Clinic practice management with attached patient marketplace | Brand recall; appointment + EMR + billing + e-Rx; demand from Practo marketplace; broad specialty fit; hosted on AWS with stated security posture | Clinic-centric with limited IPD; Practo-branded (not white-label) patient experience; opaque pricing; commonly reported per-appointment/booking fees on top of subscription that scale badly with volume; weak multi-location chain administration | Reported ~₹1,000–4,000/mo for small plans; enterprise custom; third-party comparisons cite ₹2K–50K/mo range plus per-appointment fees |
| **HealthPlix** | AI-first EMR for individual doctors and specialists | Fastest prescription documentation; disease-specific templates; strong specialist adoption; ABDM depth (marketed to Milestone 3) | Doctor-centric, not organization-centric; thin front-desk/queue/multi-branch ops; limited pharmacy/inventory depth | ~₹3,000–40,000/mo per third-party comparisons |
| **Eka Care** | "Government-first" EMR + patient PHR app | Deep ABDM/ABHA integration incl. QR scan-and-share; large PHR user base; free/low-cost entry tier; WhatsApp connectivity | Consumer-app-led rather than clinic-ops-led; limited chain administration, pharmacy, and finance depth | Free basic tiers; paid tiers modest |
| **MocDoc** | Modular cloud HMS/CMS across clinics, hospitals, labs, pharmacy | Module flexibility; strong lab/pathology; IPD support; wide deployment | Dated UX in parts; module-by-module pricing gets expensive; multi-branch analytics limited | ~₹5,000–1,00,000/mo per third-party comparisons |
| **KareXpert** | AI-enabled cloud HMS for hospitals | Broad hospital footprint, multi-location support | Enterprise sales motion; heavier implementation; less suited to 2–10 doctor clinics | Enterprise custom |
| **Halemind / Cliniify / Pappyjoe / SoftClinic** | SMB & speciality (dental, ayurveda) | Speciality-specific workflows; low price | Narrow scope; weak platform extensibility, no meaningful API/marketplace | ~₹1,500–15,000/mo |
| **Regional HMS (Suvarna, Healthray, Cliniqwise, Insta, Adrine, Healthixio, etc.)** | 10–300 bed hospitals | Local support, ABDM readiness marketing, on-prem options | Fragmented, service-heavy, weak self-serve; low product velocity | ₹15K–2L/mo |
| **US/global enterprise (Epic, Cerner/Oracle Health, Athenahealth, eClinicalWorks, Salesforce Health Cloud)** | Large hospital systems | Depth, ecosystem | 10–30× the cost, not ABDM-native, insurance-model mismatch for India | ₹1L–10L/mo plus large implementation |

### 3.2 Where the market is under-served (our opportunity map)

| Gap | Evidence | CareOS response |
|---|---|---|
| **Per-appointment fee resentment** | Alternatives explicitly market "flat pricing, no per-appointment fees" against Practo Ray | Flat seat+location pricing. Metered charges only for genuinely variable costs (WhatsApp, SMS, storage, video minutes) — disclosed up front. |
| **Multi-branch administration** | Both the cheap SMB tools and the doctor-first EMRs are weak at chain-level control | Org → Branch hierarchy with inherited masters, branch-scoped RBAC, consolidated dashboards, doctor revenue-share by branch |
| **White-label patient experience** | Competitor patient apps are vendor-branded | White-label booking page, patient PWA, WhatsApp sender name, print letterhead per branch |
| **Prescription → pharmacy loop** | EMR vendors and pharmacy modules are usually different systems | One Rx object flows from consultation → dispense → GST invoice → stock ledger |
| **Migration friction** | Rivals win by offering free migration and 1-day go-live | Self-serve importer (CSV/Excel + Practo/MocDoc/HealthPlix export mappers) + assisted migration SLA of 2 business days |
| **OPD insurance is unserved** | Vendors build IPD/TPA desks; OPD benefit wallets and cashless OPD products are growing but get settled on paper at the clinic counter | Benefit-wallet adjudication built into the billing screen: automatic payer/patient split, co-pay collection, auto-attached supporting documents |
| **Session/token reality** | Slot-only calendars break in Indian OPD | Dual-mode scheduling: slot mode *and* session+token mode, switchable per doctor |
| **ABDM claims vs. certification** | Industry commentary flags vendors marketing "ABDM-ready" without milestone certification | Publish certification status per milestone; show live ABHA creation, record linking, and consent fetch in demos |
| **Regional language Rx** | Being actively marketed by challengers | Rx print/share in 12+ Indian languages at GA, extensible |

### 3.3 Pricing benchmark (what we must price against)

| Tier | Market band (₹/month) | CareOS intended position |
|---|---|---|
| Solo doctor | 800 – 4,000 | ₹999 (Starter) |
| Small clinic (2–8 doctors) | 3,000 – 15,000 | ₹2,999 – ₹8,999 (Clinic / Clinic Pro) |
| Chain (2–15 branches) | 15,000 – 80,000 | ₹14,999 – ₹49,999 (Multi-Clinic) |
| Small hospital | 40,000 – 2,00,000 | Custom (Enterprise), from ₹59,999 |

Positioning rule: **be at or slightly under the mid-market band on subscription, and unambiguously cheaper than Practo Ray at >600 appointments/month** because we do not charge per booking.

---

## 4. Positioning, Vision & Differentiation

### 4.1 Vision
Make every Indian clinic and small hospital run its outpatient day — booking to prescription to payment to pharmacy — on one system that a receptionist can learn in an afternoon and a chain owner can trust for reporting.

### 4.2 Positioning statement
> For multi-doctor clinics and clinic chains in India who have outgrown appointment-book software but cannot absorb hospital ERP cost or complexity, CareOS is a cloud practice operations platform that unifies scheduling, check-in, consultation, prescriptions, pharmacy and payments across branches. Unlike marketplace-tied practice tools that charge per booking and brand the patient experience as their own, CareOS is flat-priced, white-label, ABDM-certified, and built for multi-location control.

### 4.3 Five differentiators (must be defensible, not slogans)

1. **Dual-mode scheduling engine** (slot + session/token) with visiting-consultant support across branches.
2. **Closed-loop Rx → Pharmacy → GST invoice → stock ledger** inside a single tenant.
3. **Composable Super Admin plan builder** — sell any combination of modules/quotas without a code change.
4. **ABDM/NHCX native**, with milestone certification published, not claimed.
5. **White-label patient layer** — booking page, PWA, WhatsApp, print, all under the provider's brand.
6. **Insurance desk with clocks and evidence** — OPD cashless adjudication at the counter, pre-auth and claim tracking against IRDAI turnaround times, disallowance analytics and payer scorecards.

---

## 5. Personas & Jobs To Be Done

### P1 — Super Admin (SaaS operator: our own ops team)
**Jobs:** onboard/suspend tenants, build & version pricing plans, monitor platform health, run tenant billing and dunning, handle support impersonation with audit, manage feature flags and rollouts.
**Pain:** every pricing experiment currently needs engineering.
**Key screens:** Tenant list, Plan builder, Subscription & invoice console, Platform health, Impersonation log, Feature flags.

### P2 — Organization Admin (hospital director / chain owner / owner-doctor)
**Jobs:** see all branches in one view, control who can do what, set fees and revenue-share, approve discounts, review P&L by branch/doctor/service.
**Pain:** no consolidated numbers; each branch does its own thing.
**Key screens:** Org dashboard, Branch management, Users & roles, Service/price master, Reports.

### P3 — Branch Manager / Practice Manager
**Jobs:** publish next month's doctor schedules, cover leave, manage counter cash and daily closing, manage staff shifts, resolve patient escalations, keep inventory in stock.
**Pain:** doctor schedule changes at the last minute and 40 patients need informing.
**Key screens:** Branch calendar, Queue board, Day-end cash reconciliation, Inventory alerts, Bulk-notify.

### P4 — Clinician (doctor / dentist / physio / consultant)
**Jobs:** see today's list on a phone, review patient history in <10 seconds, record the consult in under 2 minutes, prescribe accurately, order labs, mark follow-up.
**Pain:** typing kills throughput; existing EMRs take longer than paper.
**Key screens:** My day, Consultation workspace, Rx builder, Templates/favourites, Patient timeline.
**Hard requirement:** the median consult must be recordable in **≤ 90 seconds** using templates + favourites, or clinicians revert to paper.

### P5 — Front Desk / Staff (receptionist)
**Jobs:** book/reschedule fast (often while on the phone), register new patients, check patients in, manage the queue, collect payment, print receipts and prescriptions.
**Pain:** everything must be keyboard-driven and forgiving.
**Key screens:** Booking console, Patient search, Check-in, Billing counter, Queue.
**Hard requirement:** book an appointment for an existing patient in **≤ 4 interactions**.

### P6 — Pharmacist
**Jobs:** dispense against a prescription, substitute when out of stock, bill with GST, manage batches/expiry, raise purchase orders, maintain statutory registers.
**Key screens:** Dispense queue, POS, Stock, Purchase/GRN, Expiry & reorder.

### P7 — Accountant / Finance
**Jobs:** reconcile counter collections vs. gateway settlements, apply GST correctly, compute doctor payouts, close the month.
**Key screens:** Collections, Settlements, Doctor payouts, GST reports, Refunds & write-offs.

### P8 — Patient
**Jobs:** find the right doctor and a time that works, pay if needed, get a reminder, avoid waiting, get a readable prescription, refill medicines, ask a follow-up question.
**Key screens:** Booking page/PWA, My appointments, Records & prescriptions, Messages, Payments.

### P9 — Lab Technician / Radiographer *(Phase 2)*
**Jobs:** receive orders, record sample collection, upload reports against the visit.

---

## 6. Product Scope & Release Phasing

### 6.1 Phase 1 — MVP (Months 0–5): "Run the OPD day"
Tenancy & onboarding · RBAC · Facilities/rooms/services masters · Provider profiles & availability (dual-mode) · Online + counter booking · Reminders (WhatsApp/SMS) · Check-in & queue · Consultation notes + Rx builder + print/share · Patient records timeline · Basic billing & payments (UPI/card/cash) · Patient portal (PWA) · Core reports · Super Admin plan builder v1 · Audit log & consent capture.

### 6.2 Phase 2 — V1 GA (Months 6–10): "Sellable to chains"
Multi-branch administration & consolidated reporting · Pharmacy (inventory, batch/expiry, dispense, GST invoice) · Products & packages · Direct messaging (staff↔staff, patient↔clinic) · Telemedicine with TPG drug-list enforcement · ABDM M1–M3 (ABHA creation, care-context linking, consent-based fetch) · Doctor revenue-share & payouts · Advanced billing (deposits, refunds, discounts with approval) · Recurring subscription billing via UPI AutoPay/e-mandate · **Insurance: payer & tariff master, policy capture & eligibility, OPD cashless/benefit-wallet adjudication, patient reimbursement packs** · Public API & webhooks · Data migration tooling.

### 6.3 Phase 3 — V2 (Months 11–18): "Depth & moat"
Lab/diagnostics module · **Full cashless pre-authorisation, claim submission/tracking, settlement & disallowance reconciliation, insurance desk cockpit** · NHCX integration (eligibility, pre-auth, claim, payment notice; ABDM M4) · Government schemes (PMJAY/state/CGHS/ECHS/ESIC) · Payer scorecards & denial analytics · IPD-lite (beds, admissions, discharge summaries) · AI scribe & smart Rx suggestions · Speciality packs (dental charting, derma photo timeline, physio plans, IVF cycles, ayurveda) · Marketplace/UHI discovery integration · Patient recall/marketing automation · Reseller/partner portal & white-label resale · Advanced BI and cohort analytics.

### 6.4 Explicitly out of scope (V1)
Full IPD/ward management, OT scheduling, PACS/DICOM viewer, blood bank, HR/payroll, full ERP accounting (we integrate with Tally/Zoho Books instead), international/multi-country billing. **We do not underwrite, broker or sell insurance** — CareOS is provider-side software that processes claims against policies the patient already holds; any distribution play would require IRDAI intermediary licensing and is out of scope.

---

## 7. System Architecture & Tenancy Model

### 7.1 Entity hierarchy

```
PLATFORM (Super Admin)
  └── ORGANIZATION  (hospital / clinic chain / standalone clinic)   [= tenant]
        ├── SUBSCRIPTION (plan, add-ons, quotas, invoices)
        ├── BRANCH / CLINIC  (physical facility, HFR-registered)
        │     ├── DEPARTMENT  (Cardiology, Dental, Physio, Radiology…)
        │     ├── ROOM        (consultation room, procedure room, chair, bay)
        │     ├── RESOURCE    (equipment, chair, machine, bed-lite)
        │     ├── PHARMACY STORE (with its own stock ledger)
        │     ├── SERVICE     (consultation, procedure, package) + price list
        │     ├── PRODUCT     (drug, consumable, retail item) + price list
        │     └── PROVIDER ASSIGNMENT (clinician ↔ branch ↔ schedule ↔ fee ↔ share %)
        ├── USER (staff account, org-scoped, branch-scoped roles)
        └── PATIENT (org-scoped MRN; globally deduplicated by phone/ABHA with consent)
```

**Key decisions:**
- **Tenant = Organization.** A standalone clinic is simply an Organization with one Branch. This avoids two code paths.
- **Patient records are org-scoped.** Cross-organization access happens only through ABDM consent, never implicitly. This is both a legal requirement and a trust differentiator.
- **Clinician identity is platform-level, membership is org-level.** One doctor (verified once, ideally against HPR) can hold memberships in multiple organizations with independent fees, schedules and permissions. No clinical data crosses that boundary.
- **Masters cascade.** Services, products, templates and price lists can be defined at Org level and overridden at Branch level (`inherit | override | branch-only`).

### 7.2 Logical architecture

| Layer | Choice | Rationale |
|---|---|---|
| Client | React/Next.js web app; patient PWA; React Native app for clinicians (Phase 2) | Front desk needs desktop density; clinicians need mobile |
| API | REST + JSON (public, versioned `/v1`), GraphQL internal BFF optional; OpenAPI published | Partner/EMR integrations expect REST |
| Services | Modular monolith at launch → extract Scheduling, Billing, Pharmacy, Messaging, ABDM-gateway as services when load demands | Team size beats microservice purity at MVP |
| Data | PostgreSQL with `organization_id` on every row + Row Level Security; separate schema-per-tenant option for Enterprise | Isolation without operational explosion |
| Search | Postgres FTS at MVP → OpenSearch when patient volume > 5M | |
| Cache/queue | Redis; async jobs via a durable queue (SQS/RabbitMQ) | Reminders, prints, ABDM callbacks, billing runs |
| Files | S3-compatible object storage, India region, server-side encryption, signed URLs | DPDP + data residency expectations |
| Realtime | WebSockets for queue boards, chat, calendar live updates | |
| Interop | HL7 FHIR R4 with India profiles for ABDM/NHCX payloads | Required for ABDM M2/M3 and NHCX |
| Hosting | India region (Mumbai/Hyderabad), multi-AZ | Buyer expectation and regulatory prudence |

### 7.3 Isolation & key custody
- Every query carries tenant context; RLS policies enforce it at the DB level even if application code errs.
- Per-tenant encryption keys for documents; **key custody must remain assignable to the healthcare entity** for ABDM-aligned deployments — vendor-managed-only keys are flagged as an anti-pattern in ABDM guidance.
- Enterprise option: dedicated schema + dedicated storage bucket + optional private cloud deployment.

---

## 8. RBAC & Permission Model

### 8.1 Model design
- **Permissions** are atomic strings: `appointment.create`, `prescription.sign`, `inventory.adjust`, `billing.refund`, `report.org.view`.
- **Roles** are named bundles of permissions. System roles ship pre-built; Org Admins may clone them into **custom roles** (Phase 2).
- **Assignments** are `(user, role, scope)` where scope ∈ `{platform, organization, branch, department}`. A user may hold several assignments (e.g., Clinician at Branch A, Branch Manager at Branch B).
- **Data scoping** is separate from action permission: `patient.read` at Branch scope must not return another branch's patients unless the org enables `cross_branch_patient_access`.
- **Break-glass:** emergency access to a record outside scope is permitted with a mandatory reason, is time-boxed, and raises an audit alert to the Org Admin.

### 8.2 System roles and core capabilities

| Role | Scope | Can do | Cannot do |
|---|---|---|---|
| **Super Admin** | Platform | Manage tenants, plans/pricing, feature flags, platform billing, impersonate (with consent + audit) | Read patient clinical content without an approved, logged support-access grant |
| **Support Agent** (internal) | Platform | Read tenant config, metadata, tickets; time-boxed impersonation | Access clinical notes, export patient data |
| **Org Admin** | Organization | Branches, users & roles, services/products masters, fees, discounts policy, all reports, subscription management | Alter platform plans; sign prescriptions |
| **Branch Manager** | Branch | Schedules, staff, queue, billing oversight, branch reports, inventory approvals, refunds up to limit | Change org-wide masters; manage subscription |
| **Clinician** | Branch (+ own patients) | View own appointments & assigned patients, record consultations, sign prescriptions, order labs, message patients | Access unrelated patients' records; edit finance masters |
| **Junior Clinician / Resident** | Branch | Draft notes and prescriptions requiring counter-sign | Sign Rx independently |
| **Nurse** | Branch | Vitals, triage, procedure notes, dispense-assist | Sign Rx |
| **Front Desk / Staff** | Branch | Register patients, book/reschedule/cancel, check-in, collect payment, print | View clinical notes (configurable: metadata only by default) |
| **Pharmacist** | Branch/Store | Dispense against Rx, POS billing, stock, purchase, returns | Edit clinical notes; change Rx content (may record substitution with reason) |
| **Lab Technician** | Branch | Accept orders, record samples, upload reports | Prescribe |
| **Insurance / TPA Desk Executive** | Branch or Organization | Capture policies, run eligibility, raise and track pre-authorisations, handle payer queries, assemble and submit claims, post settlements and disallowances, run insurance reports | Edit clinical notes, sign prescriptions, alter tariffs without approval, approve write-offs above limit |
| **Accountant** | Organization | Collections, settlements, GST, payouts, refund approvals | View clinical notes |
| **Patient** | Self (+ linked family) | Book, pay, view own records/prescriptions/invoices, message clinic, manage consent | Anything else |

> **FR-RBAC-01** The system shall enforce permission checks server-side on every request; UI hiding is never the sole control.
> **FR-RBAC-02** Org Admin shall be able to create custom roles by cloning a system role and toggling individual permissions (Phase 2).
> **FR-RBAC-03** All role changes shall be written to an immutable audit log with actor, target, before/after, timestamp, IP.
> **FR-RBAC-04** Clinical-note visibility for non-clinical roles shall default to OFF and be toggled only by Org Admin, with the change audited.
> **FR-RBAC-05** Sessions shall support forced logout, device listing, and configurable idle timeout (default 30 min for clinical roles, 15 min for finance).

A full permission matrix is in [Appendix A](#appendix-a--permission-matrix).

---

## 9. Functional Requirements by Module

Requirement IDs are stable and traceable to test cases. Priority: **P0** = MVP blocker, **P1** = V1 GA, **P2** = V2.

---

### M1 — Tenant Onboarding & Organization Management

| ID | Requirement | Pri |
|---|---|---|
| FR-ORG-01 | Self-serve signup: org name, type (hospital/clinic/chain/diagnostic), contact, city, specialty; creates a 14-day trial tenant with a demo dataset that can be wiped in one click | P0 |
| FR-ORG-02 | Guided onboarding wizard: add branch → add doctors → set availability → set services & fees → publish booking page. Progress persists; completion tracked as an activation metric | P0 |
| FR-ORG-03 | Org profile: legal name, GSTIN, PAN, registration/licence numbers, HFR facility IDs, logos, letterheads per branch, working days, holidays | P0 |
| FR-ORG-04 | Branch CRUD with geo-coordinates, address, phone, timezone (IST default), operating hours, holiday calendar, and branch-level branding | P0 |
| FR-ORG-05 | Department CRUD; departments map to services and to clinicians | P0 |
| FR-ORG-06 | Room & resource CRUD: type (consultation/procedure/chair/bay/equipment), capacity, availability calendar, and whether booking requires the resource | P0 |
| FR-ORG-07 | Data import: patients, appointments history, services, drug master, stock — CSV/XLSX with column mapping UI, validation preview, dry-run, and rollback | P1 |
| FR-ORG-08 | Vendor-specific import mappers for common competitor exports | P1 |
| FR-ORG-09 | Org suspension/reactivation states driven by subscription status, with a read-only grace mode that never destroys data | P0 |
| FR-ORG-10 | Tenant data export (full, machine-readable) on request — DPDP portability and anti-lock-in commitment | P1 |

---

### M2 — Identity, Authentication & Security

| ID | Requirement | Pri |
|---|---|---|
| FR-AUTH-01 | Staff login via email/phone + password; mandatory OTP for first device; optional TOTP MFA (mandatory for Org Admin and Accountant) | P0 |
| FR-AUTH-02 | Patient login via phone OTP; optional email; no password required | P0 |
| FR-AUTH-03 | Password policy, lockout after N failures, breach-password rejection | P0 |
| FR-AUTH-04 | SSO (Google Workspace, Microsoft Entra, SAML) for Enterprise plans | P2 |
| FR-AUTH-05 | Clinician verification: registration number + council, optionally validated against HPR; verified badge displayed on booking page | P1 |
| FR-AUTH-06 | Support impersonation requires an org-approved, time-boxed grant; banner shown; every action tagged as impersonated in audit | P0 |
| FR-AUTH-07 | API keys and OAuth2 client credentials per organization, scoped, rotatable, revocable | P1 |

---

### M3 — Master Data: Services, Products & Catalogues

| ID | Requirement | Pri |
|---|---|---|
| FR-CAT-01 | **Service** entity: name, code, department, type (consultation / follow-up / procedure / diagnostic / teleconsult / home visit), duration, buffer, price, GST/exempt flag, resources required, room type required, prerequisites, patient instructions | P0 |
| FR-CAT-02 | Service pricing by branch, by clinician, by patient category (general/corporate/staff/camp), and by channel (online/walk-in) | P0 |
| FR-CAT-03 | **Package**: bundle of services with N sittings, validity window, package price, consumption tracking, and per-sitting scheduling | P1 |
| FR-CAT-04 | **Product** entity: drugs (with composition, strength, form, schedule class, HSN, GST %, manufacturer), consumables, retail items | P1 |
| FR-CAT-05 | Drug master seeded from a licensed Indian drug database, with tenant-level custom additions and a favourites list per clinician | P1 |
| FR-CAT-06 | Price lists with effective-from dates, bulk edit, and audit of price changes | P1 |
| FR-CAT-07 | Consultation-fee rules: free follow-up within X days of a paid consult, per clinician/branch configurable | P0 |
| FR-CAT-08 | Tax configuration: healthcare services generally exempt vs. taxable retail/pharmacy items; per-item GST with HSN/SAC; place-of-supply handling | P1 |

---

### M4 — Provider Profiles, Availability & Calendar Engine

This is the heart of the product. Failure here is unrecoverable.

**Scheduling modes (per clinician, per branch):**
1. **Slot mode** — fixed-duration slots with buffers (e.g., 15 min + 5 min buffer).
2. **Session/token mode** — a session window with a capacity (e.g., 6–9 PM, 40 tokens); patients receive token numbers and an estimated time computed from live throughput.
3. **Hybrid** — a reserved band of pre-booked slots plus a walk-in token pool.

| ID | Requirement | Pri |
|---|---|---|
| FR-CAL-01 | Clinician profile: name, qualifications, registration no., specialities, languages, bio, photo, consultation types offered, fees, HPR ID | P0 |
| FR-CAL-02 | Recurring weekly availability templates per clinician per branch, with effective date ranges and multiple sessions per day | P0 |
| FR-CAL-03 | Date-specific overrides: extra clinic, early close, leave (full/half day), holiday inheritance from branch calendar | P0 |
| FR-CAL-04 | Slot generation respecting duration, buffer, lead time (min notice), booking horizon (max days ahead), and per-session capacity | P0 |
| FR-CAL-05 | Multi-resource booking: an appointment may require clinician + room + equipment; the engine books the intersection of all free resources and prevents double-booking of any of them | P0 |
| FR-CAL-06 | Overbooking policy: allow N over capacity per session, configurable per clinician; visually flagged | P0 |
| FR-CAL-07 | Concurrency safety: slot reservation uses a short-lived hold (default 5 min) during checkout; race conditions must be impossible (DB-level unique constraint on resource+time) | P0 |
| FR-CAL-08 | Views: day/week/month; per-branch, per-clinician, per-room, and consolidated org view; drag-to-reschedule with confirmation | P0 |
| FR-CAL-09 | Blocked time (admin, surgery, meeting) with reason codes; not bookable but visible | P0 |
| FR-CAL-10 | **Delay broadcast:** when a session runs late, staff enter a delay (e.g., +30 min) and all affected upcoming patients are notified automatically with revised ETA | P1 |
| FR-CAL-11 | Bulk reschedule when a doctor cancels a session: propose alternatives, notify all affected patients, one-click accept via link | P1 |
| FR-CAL-12 | Waitlist: patients join a waitlist for a full session and are auto-offered released slots on a first-response basis with a time-limited claim link | P1 |
| FR-CAL-13 | Recurring appointments (physio/dialysis/chemo-style series) with skip and bulk-reschedule | P1 |
| FR-CAL-14 | Calendar sync (Google/Outlook, one-way ICS at minimum) for clinicians | P1 |
| FR-CAL-15 | Visiting-consultant support: a clinician's schedule at Org A never reveals details to Org B, but the system warns the clinician of personal cross-org conflicts | P1 |
| FR-CAL-16 | Timezone-correct handling with IST default; DST-safe storage in UTC with local rendering | P0 |

**Acceptance example (FR-CAL-05):** Given Dr. A requires Room 2 and the ECG machine for service "TMT", when Room 2 is booked at 11:00, the 11:00 TMT slot must not be offered even though Dr. A is free.

---

### M5 — Booking Engine

**Channels:** white-label public booking page, patient PWA/app, front-desk console, phone-in (staff-entered), WhatsApp deep link, QR code at reception, optional marketplace/UHI (Phase 3).

| ID | Requirement | Pri |
|---|---|---|
| FR-BOOK-01 | Public booking flow: choose branch → speciality/service → clinician (or "first available") → date/time → patient details → optional prepay → confirmation | P0 |
| FR-BOOK-02 | Patient identification and de-duplication by phone number + name + DOB; merge tooling for duplicates with a full audit trail | P0 |
| FR-BOOK-03 | Family/dependant booking: one phone number may manage multiple patient profiles with relationship labels | P0 |
| FR-BOOK-04 | Booking policies per service: prepayment required / optional / none; cancellation window; reschedule limit; no-show fee | P0 |
| FR-BOOK-05 | Appointment states: `requested → confirmed → checked_in → in_consultation → completed`, plus `cancelled`, `no_show`, `rescheduled`. All transitions logged with actor and reason | P0 |
| FR-BOOK-06 | Reschedule and cancel by patient (within policy) and by staff (always, with reason) | P0 |
| FR-BOOK-07 | Reminder ladder: confirmation immediately, T-24h, T-2h, and post-visit follow-up; channel priority WhatsApp → SMS → push → email; per-org configurable | P0 |
| FR-BOOK-08 | Booking for teleconsultation generates a secure, time-bound video link and enforces prepayment by default | P1 |
| FR-BOOK-09 | Walk-in registration issuing a token in session mode within 2 interactions | P0 |
| FR-BOOK-10 | Booking widget embeddable on the clinic's own website (iframe + JS snippet) and a shareable short link/QR | P0 |
| FR-BOOK-11 | Capture reason for visit, referral source, and custom intake fields (per service, configurable form builder) | P1 |
| FR-BOOK-12 | Group/camp bookings: bulk-create appointments for a corporate health camp | P2 |
| FR-BOOK-13 | No-show handling: auto-mark after configurable grace period, optional fee, and impact on the patient's future prepay requirement | P1 |

---

### M6 — Clinic Check-In & Queue Management

| ID | Requirement | Pri |
|---|---|---|
| FR-QUE-01 | Check-in methods: front-desk one-click, patient self check-in via QR at the clinic (geo/OTP validated), kiosk mode, and app check-in within a radius/time window | P0 |
| FR-QUE-02 | Token assignment on check-in, respecting appointment priority vs. walk-in interleaving rules (configurable ratio, e.g., 3 booked : 1 walk-in) | P0 |
| FR-QUE-03 | Live queue board per clinician/room, showing now-serving, next 5, and average wait; available as a TV/display view with large type | P0 |
| FR-QUE-04 | Patient-facing live queue status ("You are 4th, approx. 25 min") via link/PWA, updating in real time | P1 |
| FR-QUE-05 | Wait-time estimation from rolling median consult duration per clinician per service, recalculated continuously | P1 |
| FR-QUE-06 | Nurse/triage step: vitals capture between check-in and consultation, optional per service | P1 |
| FR-QUE-07 | Queue actions: call next, recall, skip/park (with auto-return after N patients), transfer to another clinician, mark arrived-late | P0 |
| FR-QUE-08 | Pre-consultation checklist gating: mandatory fields (consent, vitals, ID) can block "call next" if configured | P1 |
| FR-QUE-09 | Departure/checkout step that reconciles pending bills before the patient leaves; flags unbilled visits at day end | P0 |

---

### M7 — Consultation & Clinical Records (EMR)

| ID | Requirement | Pri |
|---|---|---|
| FR-EMR-01 | Consultation workspace with three panes: patient timeline (left), current encounter (centre), quick actions/Rx (right); loads in under 1.5 s | P0 |
| FR-EMR-02 | Structured note capture: chief complaints, history, examination, vitals, diagnosis, investigations, advice, follow-up (SOAP-aligned but re-labelable per specialty) | P0 |
| FR-EMR-03 | Coded diagnosis using ICD-10 (SNOMED CT mapping in Phase 3), with free-text fallback | P1 |
| FR-EMR-04 | Templates: per clinician, per specialty, per complaint; one-click apply; org-level shared template library; favourites for drugs, tests, advice | P0 |
| FR-EMR-05 | Vitals with unit handling, growth charts for paediatrics, BMI auto-calculation, trend graphs | P1 |
| FR-EMR-06 | Allergies, chronic conditions, current medications, family history as persistent patient-level banners visible in every encounter | P0 |
| FR-EMR-07 | Attachments: photos, PDFs, scanned reports; capture from phone camera; auto-compression; tagged to encounter | P0 |
| FR-EMR-08 | Investigation orders (lab/radiology) with printable order form; results attach back to the encounter | P1 |
| FR-EMR-09 | Amendments: notes lock after sign-off; corrections create a versioned addendum, never a silent edit | P0 |
| FR-EMR-10 | Referral out/in with a referral letter and referring-doctor attribution for analytics | P1 |
| FR-EMR-11 | Voice-to-text dictation (Indian-English + major Indian languages) and AI-assisted note drafting from the dictated transcript, always clinician-reviewed before sign | P2 |
| FR-EMR-12 | Clinical decision support: drug–drug interaction, drug–allergy, duplicate-therapy, dose-range and renal-dose alerts, with severity levels and override reason capture | P2 |
| FR-EMR-13 | Patient timeline: chronological visits, prescriptions, bills, labs, uploads, messages, with filters and full-text search | P0 |
| FR-EMR-14 | Specialty packs: dental odontogram & treatment plan, dermatology photo comparison, physiotherapy exercise plans, obstetrics ANC card, ophthalmology refraction chart | P2 |

**Sign-off rule (FR-EMR-09) detail:** a signed encounter is immutable. Addenda are appended with author, timestamp and reason. This is a medico-legal requirement and a common competitor weakness.

---

### M8 — Prescriptions: Creation, Printing & Sharing

| ID | Requirement | Pri |
|---|---|---|
| FR-RX-01 | Rx builder: drug search by brand or generic, auto-complete with strength/form; dose, frequency (BD/TDS/HS/SOS with regional shorthand), route, duration, quantity auto-calculated, food relation, custom instructions | P0 |
| FR-RX-02 | Favourites and drug-set templates ("URI adult set") applying multiple drugs in one click | P0 |
| FR-RX-03 | Generic substitution toggle and display of composition alongside brand | P1 |
| FR-RX-04 | Quantity → dispense mapping so the pharmacy receives an unambiguous dispensable quantity | P1 |
| FR-RX-05 | Rx print layout: branch letterhead, clinician name + qualifications + registration number, patient demographics, date, diagnosis, drug table, advice, follow-up date, signature (image or digital), page numbers, clinic footer with address/phone/timings | P0 |
| FR-RX-06 | Print formats: A4, A5, thermal-friendly summary; configurable margins for pre-printed letterheads; print preview must match output exactly | P0 |
| FR-RX-07 | Regional language rendering of instructions (minimum: Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu) with correct fonts embedded in the PDF | P1 |
| FR-RX-08 | Share to patient via WhatsApp/SMS link and to the patient portal; link is time-bound and OTP-gated | P0 |
| FR-RX-09 | Digital signature support (image signature at MVP; eSign/DSC-based signing in Phase 2) and a tamper-evident PDF hash | P1 |
| FR-RX-10 | Teleconsult prescriptions enforce Telemedicine Practice Guidelines drug lists: List O permitted on first consult, List A on video first-consult as applicable, List B on follow-up only, and prohibited-list drugs (including NDPS/Schedule X items) blocked outright, with the mode of consultation recorded | P1 |
| FR-RX-11 | Mandatory diagnosis before Rx issue in teleconsultation mode | P1 |
| FR-RX-12 | Rx history and reprint with a "duplicate" watermark; refill/repeat-Rx creation from a prior Rx in one click | P0 |
| FR-RX-13 | Push Rx to the in-house pharmacy dispense queue automatically when the branch has a pharmacy store | P1 |
| FR-RX-14 | ABDM: publish the prescription as a FHIR R4 document and link it as a care context to the patient's ABHA, subject to consent | P1 |


---

### M9 — Pharmacy & Inventory

| ID | Requirement | Pri |
|---|---|---|
| FR-PHR-01 | Multiple stores per branch (main pharmacy, sub-store, OT store) each with an independent stock ledger | P1 |
| FR-PHR-02 | Dispense queue fed by signed prescriptions; pharmacist sees drug, dose, quantity, and patient | P1 |
| FR-PHR-03 | Batch-wise stock: batch no., expiry, MRP, purchase rate, quantity; FEFO (first-expiry-first-out) suggestion at dispense | P1 |
| FR-PHR-04 | Substitution workflow: out-of-stock or generic swap requires reason capture and is visible on the invoice and to the clinician | P1 |
| FR-PHR-05 | Partial dispense and back-order with follow-up reminder to the patient when stock arrives | P1 |
| FR-PHR-06 | Retail (walk-in) sale without a linked prescription, with a Schedule H/H1 prompt requiring prescriber details capture | P1 |
| FR-PHR-07 | GST-compliant tax invoice: HSN, GST split (CGST/SGST/IGST), MRP vs. rate, discount, rounding; invoice numbering series per store per financial year | P1 |
| FR-PHR-08 | Purchase management: supplier master, purchase order, goods receipt note with batch/expiry capture, purchase return, credit notes | P1 |
| FR-PHR-09 | Stock transfer between stores/branches with in-transit state and acceptance | P1 |
| FR-PHR-10 | Expiry and reorder management: near-expiry report (configurable horizon), reorder-level alerts, dead-stock report, auto-suggested PO | P1 |
| FR-PHR-11 | Statutory registers: Schedule H/H1 dispensing register export, narcotics register (if licensed), and drug licence details on invoice footer | P1 |
| FR-PHR-12 | Physical stock audit: cycle count sheets, variance capture, adjustment with reason and approval | P1 |
| FR-PHR-13 | Sales returns with batch validation and re-stocking rules (no restock past expiry) | P1 |
| FR-PHR-14 | Pharmacy analytics: fast/slow movers, margin by molecule, expiry loss, dispense-vs-prescribe fulfilment rate | P2 |

---

### M10 — Billing, Invoicing & Patient Payments

| ID | Requirement | Pri |
|---|---|---|
| FR-BIL-01 | Bill composition from services rendered, products dispensed, packages consumed, and manual line items | P0 |
| FR-BIL-02 | Tender types: cash, UPI (dynamic QR), card (via PG or POS reference), netbanking, wallet, cheque, credit (to company/TPA), and split/mixed tenders on one bill | P0 |
| FR-BIL-03 | Advance/deposit collection at booking, auto-adjusted against the final bill; refundable balance tracking | P0 |
| FR-BIL-04 | Discounts: percentage or absolute, reason codes, approval thresholds by role, full audit | P0 |
| FR-BIL-05 | Refunds and cancellations with reason, approver, gateway-refund initiation, and settlement reconciliation | P0 |
| FR-BIL-06 | Tax handling: healthcare services exempt vs. taxable items on one invoice; correct HSN/SAC; place of supply; GSTR-1/GSTR-3B-ready exports | P1 |
| FR-BIL-07 | Invoice numbering: separate series per branch/store per FY, gapless, non-editable once issued; credit notes for corrections | P0 |
| FR-BIL-08 | Day-end closing: expected vs. actual cash by user, denomination sheet, variance capture, shift handover | P0 |
| FR-BIL-09 | Payment links sent over WhatsApp/SMS for pre-payment, pending dues, and telemedicine | P0 |
| FR-BIL-10 | Corporate/TPA credit billing: bill to organisation, statement generation, ageing report, receipts against statement | P1 |
| FR-BIL-11 | Doctor revenue share: per-service or per-consult, percentage or flat, computed per branch; payout statements with adjustments and TDS field | P1 |
| FR-BIL-12 | Reconciliation console: gateway settlement file vs. system payments, auto-match, exception queue | P1 |
| FR-BIL-13 | Accounting exports/integrations: Tally XML, Zoho Books, generic CSV | P2 |
| FR-BIL-14 | Insurance-aware billing: payer tariff application, payer-vs-patient bill split, sanctioned-amount enforcement, non-payable item separation — see [M17](#m17--insurance-claims--payer-management) | P1/P2 |

---

### M11 — Messaging & Notifications

Two distinct systems that share one delivery layer: **transactional notifications** (system → patient/staff) and **direct messaging** (human ↔ human).

| ID | Requirement | Pri |
|---|---|---|
| FR-MSG-01 | Notification catalogue with templates per event (booking confirmed, reminder, delay, cancellation, Rx ready, bill/receipt, refill due, report ready, payment link, birthday/recall) — see [Appendix C](#appendix-c--notification-catalogue) | P0 |
| FR-MSG-02 | Channels: WhatsApp Business API (via BSP), SMS with DLT-registered templates, email, web/app push; per-event channel priority and fallback | P0 |
| FR-MSG-03 | Per-organization sender identity: WhatsApp display name, SMS sender ID, email from-domain (DKIM/SPF), so patients see the clinic, not us | P1 |
| FR-MSG-04 | Message credit wallet per tenant with balance, auto-recharge, low-balance alerts, and per-message cost visibility | P1 |
| FR-MSG-05 | Quiet hours and frequency caps; regulatory opt-out honoured and irreversible per channel | P0 |
| FR-MSG-06 | **Direct messaging — staff↔staff:** 1:1 and group threads scoped to branch/department, file attachments, read receipts, mentions, and the ability to link a message to a patient/appointment context | P1 |
| FR-MSG-07 | **Direct messaging — patient↔clinic:** patient can message the clinic; routed to a shared inbox with assignment, SLA timer, canned replies, and escalation to a clinician | P1 |
| FR-MSG-08 | Clinical safety guardrails: an automated notice that messaging is not for emergencies, with a visible emergency instruction; configurable clinical hours auto-responder | P1 |
| FR-MSG-09 | Messages involving clinical advice are attached to the patient record and are exportable as part of the medico-legal record | P1 |
| FR-MSG-10 | Broadcast/campaign tool: segment by last-visit date, condition tag, doctor, or branch; consent-filtered; throttled; unsubscribe honoured | P2 |
| FR-MSG-11 | Delivery analytics: sent/delivered/read/failed per template, with failure-reason drill-down | P1 |

---

### M12 — Telemedicine

| ID | Requirement | Pri |
|---|---|---|
| FR-TEL-01 | In-browser video consultation (WebRTC), no app install required for the patient; audio-only fallback on poor networks | P1 |
| FR-TEL-02 | Waiting room, join links valid only around the appointment window, and one-tap rejoin on disconnect | P1 |
| FR-TEL-03 | Explicit consent capture at the start; recording only with explicit informed consent, stored encrypted with retention policy | P1 |
| FR-TEL-04 | Identity verification of patient and display of the clinician's registration number, per Telemedicine Practice Guidelines | P1 |
| FR-TEL-05 | Mode-of-consultation logging (video/audio/text) because prescribing rights differ by mode | P1 |
| FR-TEL-06 | Consultation-fee receipt/invoice issued for every teleconsultation | P1 |
| FR-TEL-07 | Escalation prompt: a one-click "advise in-person visit" action that converts the encounter and books a physical appointment | P1 |
| FR-TEL-08 | Bandwidth-adaptive quality, screen share for report review, and in-call chat for sharing text | P2 |

---

### M13 — Patient Portal / App

| ID | Requirement | Pri |
|---|---|---|
| FR-PAT-01 | PWA with phone-OTP login; installable; works on low-end Android | P0 |
| FR-PAT-02 | Book, reschedule, cancel; view upcoming and past appointments; live queue position | P0 |
| FR-PAT-03 | Records: prescriptions, invoices/receipts, uploaded reports, visit summaries — downloadable as PDF | P0 |
| FR-PAT-04 | Payments: pay pending dues, view payment history, download GST invoice | P0 |
| FR-PAT-05 | Family profiles under one login with per-profile consent | P0 |
| FR-PAT-06 | ABHA: create or link ABHA, scan-and-share QR at the facility, view and manage consents, revoke access | P1 |
| FR-PAT-07 | Messaging with the clinic and refill requests | P1 |
| FR-PAT-08 | Multi-language UI (minimum English + Hindi + 4 regional at GA) | P1 |
| FR-PAT-09 | Feedback/NPS capture post-visit; positive responses optionally routed to a public review prompt | P2 |

---

### M14 — ABDM & Health Data Interoperability

Certification is a **go-to-market gate**, not a nice-to-have: facilities tied to government schemes increasingly require it, and buyers are being coached to reject "ABDM-ready" claims without milestone certification.

| ID | Requirement | Pri |
|---|---|---|
| FR-ABDM-01 | Sandbox integration and progressive milestone certification: **M1** ABHA creation/verification, **M2** care-context linking as HIP, **M3** consent-based record fetch as HIU, **M4** NHCX claims | P1 (M1–M3), P2 (M4) |
| FR-ABDM-02 | ABHA creation at registration via Aadhaar OTP or mobile OTP, with demographic fallback; ABHA address handling | P1 |
| FR-ABDM-03 | Scan-and-share: facility QR provisioned from the HFR ID; patient scan pushes profile + linking token; front desk gets a pre-filled registration | P1 |
| FR-ABDM-04 | Care-context creation for every OPD visit, prescription, lab report and discharge summary, with FHIR R4 bundles using India profiles | P1 |
| FR-ABDM-05 | Linking-token storage and propagation across internal modules (OPD, pharmacy, lab) so all care contexts attach to the same ABHA | P1 |
| FR-ABDM-06 | HFR facility registration assist and HPR professional linkage in onboarding | P1 |
| FR-ABDM-07 | Consent artefact handling: request, grant, expiry, revocation; consent-gated fetch; consent ledger visible to Org Admin and patient | P1 |
| FR-ABDM-08 | Key custody model that allows the healthcare entity to hold encryption keys | P1 |
| FR-ABDM-09 | Milestone certification status displayed in-product and on the marketing site, per product, with dates | P1 |
| FR-ABDM-10 | DHIS incentive tracking: count eligible digitised transactions and claims routed via NHCX, and report claimable incentive value to the Org Admin | P2 |

---

### M15 — Reports & Analytics

| Report group | Contents | Pri |
|---|---|---|
| **Operational** | Appointments by status/channel/doctor/branch, no-show rate, cancellation reasons, walk-in vs. booked mix, average wait time, average consult duration, queue throughput | P0 |
| **Clinical** | Diagnosis frequency, top prescribed molecules, investigation ordering patterns, follow-up compliance, teleconsult vs. in-person mix | P1 |
| **Financial** | Daily collections by tender and user, revenue by service/doctor/branch, discounts given, outstanding dues ageing, refunds, GST summary, doctor payout statements | P0 |
| **Pharmacy** | Sales, margin, stock value, near-expiry, dead stock, fill rate | P1 |
| **Insurance** | Pre-auth pipeline & approval rate, TAT compliance vs. 1-hour/3-hour expectations, claims by ageing bucket, disallowance rate & reasons, payer scorecards, revenue at risk, cashless vs. reimbursement vs. self-pay mix, DHIS incentive eligibility | P2 |
| **Patient** | New vs. repeat, acquisition source, retention cohorts, lapsed-patient list for recall, NPS | P1 |
| **Platform (Super Admin)** | MRR/ARR, churn, plan mix, feature adoption, quota consumption, tenant health score | P0 |

| ID | Requirement | Pri |
|---|---|---|
| FR-RPT-01 | Every report filterable by date range, branch, doctor, department, service; exportable to CSV/XLSX/PDF | P0 |
| FR-RPT-02 | Scheduled email/WhatsApp delivery of chosen reports (daily/weekly/monthly) | P1 |
| FR-RPT-03 | Role-scoped access: branch managers see their branch, Org Admin sees all, clinicians see their own performance only | P0 |
| FR-RPT-04 | Custom dashboard builder with drag-and-drop widgets | P2 |

---

### M16 — Integrations & Extensibility

| ID | Requirement | Pri |
|---|---|---|
| FR-INT-01 | Public REST API v1 with OpenAPI spec, sandbox keys, rate limits, and idempotency keys on writes | P1 |
| FR-INT-02 | Webhooks for appointment, payment, prescription, and inventory events with signed payloads and retry with exponential backoff | P1 |
| FR-INT-03 | Payment gateway integrations (at least two: primary + failover) supporting UPI, cards, netbanking, wallets, payment links, subscriptions/e-mandates, and split settlement | P0 |
| FR-INT-04 | WhatsApp BSP and DLT-registered SMS provider integrations, provider-agnostic behind an abstraction | P0 |
| FR-INT-05 | Lab equipment/LIS interface (HL7 v2 / vendor APIs) | P2 |
| FR-INT-06 | Accounting (Tally, Zoho Books) and Google/Outlook calendar | P2 |
| FR-INT-07 | Zapier/Make connector and embeddable widgets | P2 |

---

### M17 — Insurance, Claims & Payer Management

This module turns the "insurance desk" — today a room full of printed pre-authorisation forms, WhatsApp groups with TPA coordinators, and a spreadsheet of unpaid claims — into a tracked, timed, auditable workflow inside the same system that already holds the appointment, the encounter and the bill.

#### Why it matters commercially

- **Regulation has put hard clocks on payers.** IRDAI's Master Circular on Health Insurance Business (IRDAI/HLT/CIR/PRO/84/5/2024, dated 29 May 2024) consolidated 55 earlier circulars and set binding turnaround times: cashless pre-authorisation decision **within 1 hour** of a complete request, and final discharge authorisation **within 3 hours** of the hospital's discharge request — with delay costs borne by the insurer's shareholders' funds rather than the patient's sum insured. Hospitals that cannot evidence *when* they submitted lose the argument. Our timestamps become the hospital's leverage.
- **Cashless Everywhere** (IRDAI circular, 23 January 2024) extended cashless treatment beyond network hospitals, which means even small non-empanelled clinics and nursing homes now field cashless requests they have no process for.
- **Claims are moving onto public rails.** NHCX went live in June 2024 as a FHIR-based router for eligibility, pre-auth, claim, adjudication and payment; as of May 2026 roughly 12,600+ hospitals and 160 integrators were onboarded, and the Digital Health Incentive Scheme pays providers for digitally routed claims (reported at ₹500 per claim or 10% of claim value, whichever is lower).
- **OPD is the uninsured majority, and that is changing.** Outpatient spend is the larger share of Indian healthcare expenditure but has historically been almost entirely out-of-pocket. Cashless OPD products, corporate OPD wallets and network-clinic tie-ups are growing fast — and an OPD-first platform is exactly where those benefits get consumed. **This is our differentiated angle: every competitor builds IPD claims; almost nobody builds OPD benefit adjudication at the clinic counter.**
- **Cash-flow pain is the buying trigger.** Days-in-AR and disallowance leakage are the numbers a hospital owner feels monthly. A module that shortens AR by even 10 days sells itself.

#### 17.1 Scope split

| Sub-module | Phase | Applies to |
|---|---|---|
| Payer & tariff master | P1 | All |
| Patient policy capture & eligibility | P1 | All |
| **OPD cashless / benefit wallet adjudication** | P1 | Clinics (our ICP) |
| Reimbursement claim support (document pack for patient) | P1 | All |
| Cashless pre-authorisation workflow (IPD/day-care) | P2 | Hospitals, day-care clinics |
| Claim submission, tracking, query handling | P2 | Hospitals |
| Settlement, deduction & AR reconciliation | P2 | Hospitals |
| NHCX integration (eligibility, pre-auth, claim, payment notice) | P2 | All |
| Government schemes (PMJAY/state/CGHS/ECHS/ESIC) | P3 | Empanelled facilities |
| Denial analytics & payer scorecards | P3 | Chains, hospitals |

---

#### 17.2 Payer, scheme & tariff master

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-01 | **Payer master:** insurers, TPAs, corporates, government schemes, and cash-equivalent "self-pay" — with type, IRDAI/registration number, portal URL, API/NHCX participant ID, escalation contacts, working hours, and empanelment status per branch | P1 |
| FR-INS-02 | **Empanelment record** per payer per branch: empanelment ID, start/end dates, renewal reminder, rate-contract document, blacklist/de-empanelment flag with effective date | P1 |
| FR-INS-03 | **Tariff / rate contract:** payer-specific price list for services, packages, room categories, consumables and drugs; effective-dated; supports percentage discount off standard tariff, absolute rates, or package rates | P1 |
| FR-INS-04 | **Package master** (procedure bundles) with inclusions, exclusions, length-of-stay assumption and implant/consumable carve-outs | P2 |
| FR-INS-05 | **Non-payable items master** per payer (toiletries, admin charges, attendant food, etc.) so the system separates payer-payable from patient-payable *before* billing, not after a deduction | P2 |
| FR-INS-06 | Payer rules configuration: co-payment %, deductible, room-rent capping (with proportionate-deduction logic), sub-limits by procedure, pre/post-hospitalisation windows, document checklists, and TAT expectations | P2 |
| FR-INS-07 | Credit terms per payer: expected settlement days, TDS applicability, and bank/UTR details for reconciliation | P2 |
| FR-INS-08 | Payer master shall be maintainable at Org level and overridable per branch, with all rate changes versioned and audited | P1 |

#### 17.3 Patient policy, eligibility & benefit checking

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-10 | **Policy capture** on the patient profile: payer, policy number, member/UHID, TPA card number, corporate name, employee ID, policy period, sum insured, relationship of patient to primary insured, and multiple concurrent policies with a priority order | P1 |
| FR-INS-11 | **Card/document scan with OCR** to pre-fill policy fields from a photo of the health card, plus ID proof and KYC document capture (PAN/address proof), since TPAs commonly require KYC on the cashless request and mandatorily above high-value thresholds | P1 |
| FR-INS-12 | **Eligibility check** at booking or registration: via NHCX coverage-eligibility request where supported, else a manual "verified by" record with a screenshot/reference number and timestamp | P1 |
| FR-INS-13 | Display of live benefit state where available: balance sum insured, applicable co-pay, room-rent limit, waiting-period/PED flags, and whether the moratorium period has been crossed | P2 |
| FR-INS-14 | **Coverage badge in the booking flow and on the front-desk screen** — front desk must see "Cashless OPD eligible · ₹500 co-pay" *before* the patient reaches the counter | P1 |
| FR-INS-15 | Policy expiry alerts and auto-flagging of stale policies at the next visit | P1 |
| FR-INS-16 | Corporate/employer linkage: patient tagged to a corporate account with its own tariff, credit terms and monthly statement | P1 |

#### 17.4 OPD cashless & benefit-wallet adjudication *(differentiator)*

The clinic-counter version of a claim. Must complete in seconds, not hours.

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-20 | **Benefit wallet** model: a patient's OPD entitlement expressed as annual/period limits by category (consultation, diagnostics, pharmacy, dental, physio, preventive check-up), with consumed and remaining balance | P1 |
| FR-INS-21 | At billing, the system shall automatically split the bill into **payer-payable** and **patient-payable** using wallet balance, category eligibility, co-pay and per-visit caps, and shall show the split to the patient before payment | P1 |
| FR-INS-22 | Real-time cashless OPD authorisation via payer/TPA API where available; graceful degradation to "provisional cashless" with a manual approval reference where not | P2 |
| FR-INS-23 | Voucher/e-authorisation redemption: scan a payer-issued voucher, QR or OTP code at the counter to consume the benefit | P2 |
| FR-INS-24 | Prescription and diagnostics generated in the encounter shall auto-attach as supporting documents for the OPD claim — no re-upload | P1 |
| FR-INS-25 | Per-payer OPD claim batching: generate a periodic batch (daily/weekly) of OPD claims with a consolidated summary and per-patient annexures | P2 |
| FR-INS-26 | Non-eligible items shall be clearly marked on the receipt so the patient sees exactly what insurance did not cover and why | P1 |

#### 17.5 Cashless pre-authorisation workflow (IPD / day-care)

**Actors:** Front desk (registration) → Insurance Desk Executive (assembly + submission) → Treating clinician (clinical justification) → Payer/TPA → Insurance Desk (tracking).

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-30 | **Pre-auth request creation** from an admission or day-care booking, pre-populated with patient demographics, policy data, provisional diagnosis (ICD-10), proposed line of treatment, package/procedure, estimated cost broken down by head, and estimated length of stay | P2 |
| FR-INS-31 | **Clinician section** routed to the treating doctor for completion and digital sign-off (clinical history, duration of symptoms, comorbidities, proposed procedure) — the doctor completes it from their own worklist, not on paper | P2 |
| FR-INS-32 | **Document checklist per payer**, auto-validated: missing mandatory documents block submission and are listed explicitly | P2 |
| FR-INS-33 | **Submission channels:** NHCX (preferred), payer portal (with guided manual submission and reference capture), email with generated PDF pack, or upload-to-portal assist. Channel per payer is configurable | P2 |
| FR-INS-34 | **TAT clock** starts at submission of a complete request and displays elapsed time against the regulatory expectation (1 hour for cashless authorisation, 3 hours for final discharge authorisation). Breach raises an escalation task with a pre-drafted escalation letter citing the applicable Master Circular clause | P2 |
| FR-INS-35 | **Query / shortfall management:** log payer queries against the request, assign to clinician or desk, capture the response with attachments, resubmit, and keep a full thread with timestamps | P2 |
| FR-INS-36 | **Authorisation Letter (AL) capture:** CCN/authorisation number, sanctioned amount, validity, co-pay and special remarks; the sanctioned amount is then enforced during billing | P2 |
| FR-INS-37 | **Enhancement requests** when the sanctioned amount is exhausted mid-stay, with cumulative-approval tracking | P2 |
| FR-INS-38 | **Emergency pathway:** treatment proceeds while authorisation is pending, with a visible "authorisation pending" state, a fallback deposit rule, and auto-conversion to reimbursement if declined | P2 |
| FR-INS-39 | **Denial handling:** structured denial reason codes, patient counselling script, conversion to self-pay or reimbursement, and appeal tracking | P2 |
| FR-INS-40 | Pre-auth statuses shall be visible to the patient in the portal in plain language ("Sent to insurer at 10:42 AM · awaiting approval") | P2 |

#### 17.6 Cashless billing, discharge & final authorisation

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-45 | Billing shall apply the **payer tariff automatically** when a bill is tagged to a payer, and shall show standard tariff vs. payer tariff side by side for the desk | P2 |
| FR-INS-46 | Bill split into payer-payable and patient-payable, computed from sanctioned amount, co-pay, deductible, room-rent proportionality, non-payable items and sub-limits, with an itemised explanation of every deduction | P2 |
| FR-INS-47 | **Estimate generation** at admission: expected total, expected payer share, expected patient out-of-pocket — printed, signed, and stored. This single artefact eliminates most discharge-counter disputes | P2 |
| FR-INS-48 | **Discharge readiness checklist:** final bill, discharge summary, investigation reports, implant stickers/invoices, signed claim form — all assembled and submitted as one pack | P2 |
| FR-INS-49 | **3-hour discharge clock** with visible countdown from final-authorisation request, automatic reminder to the payer at defined intervals, and an audit-quality record of every communication | P2 |
| FR-INS-50 | Patient-payable collection at discharge with the standard payment methods, plus refund of unused deposit | P2 |
| FR-INS-51 | Where discharge is delayed beyond the regulatory window, the system shall record the delay duration and generate a delay-cost note for the insurer, since such charges are not to be passed to the patient's sum insured | P2 |

#### 17.7 Claim submission, tracking & settlement

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-55 | **Claim file assembly** from existing system data — bills, encounter records, prescriptions, reports, pre-auth thread — with a per-payer document checklist and a single PDF/ZIP export | P2 |
| FR-INS-56 | Submission via NHCX where available; otherwise portal/courier with dispatch tracking (AWB, acknowledgement receipt, date sent) | P2 |
| FR-INS-57 | **Claim register** with status pipeline, ageing buckets (0–15, 16–30, 31–60, 60+ days), owner assignment, and follow-up reminders | P2 |
| FR-INS-58 | **Query/short-fall workflow** post-submission with SLA timers and templated responses | P2 |
| FR-INS-59 | **Settlement posting:** receipt against claim with UTR, settled amount, TDS deducted, and **itemised disallowances with reason codes** | P2 |
| FR-INS-60 | **Disallowance handling:** dispute/appeal workflow, write-off with approval and reason, and re-billing to patient where contractually permitted | P2 |
| FR-INS-61 | **Bank reconciliation:** match a single insurer remittance covering many claims against individual claim receipts; part-payment and excess-payment handling | P2 |
| FR-INS-62 | Grievance escalation ladder tracker (payer grievance officer → IRDAI Bima Bharosa → Ombudsman) with letter templates and deadline tracking | P3 |
| FR-INS-63 | **Reimbursement support for patients:** one-click generation of the complete claim pack (claim form, bills, receipts, prescriptions, reports, discharge summary) delivered to the patient's portal/WhatsApp | P1 |

#### 17.8 Government schemes

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-70 | **PMJAY workflow:** beneficiary search and verification (Aadhaar/OTP-based), card verification, Health Benefit Package selection, pre-authorisation raise, claim submission and status — aligned to the NHA Transaction Management System (TMS) provider flow | P3 |
| FR-INS-71 | Scheme rules engine: pre-hospitalisation (3 days) and post-hospitalisation (15 days) cashless benefit handling, package blocking rules, and zero-payment-to-beneficiary enforcement (no charging a scheme beneficiary for covered items) | P3 |
| FR-INS-72 | Support for state schemes, CGHS, ECHS and ESIC with their own tariffs, referral/entitlement documents and claim formats | P3 |
| FR-INS-73 | Scheme-wise dashboards: cases treated, pre-auth approval rate, claim value pending, and audit-query tracking | P3 |

#### 17.9 NHCX integration

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-80 | Onboard as an NHCX participant/integrator; register the facility's HFR ID as the provider identity | P2 |
| FR-INS-81 | Implement FHIR R4 exchanges for **coverage eligibility request/response, pre-authorisation request/response, claim submission, adjudication response, and payment notice** | P2 |
| FR-INS-82 | End-to-end encryption of clinical/financial payloads, with the exchange reading routing headers only | P2 |
| FR-INS-83 | Fall back cleanly to portal/manual workflow for payers not yet live on NHCX, with the same internal state machine so staff learn one process | P2 |
| FR-INS-84 | **DHIS incentive tracking:** count eligible digitally routed claims and report claimable incentive value per branch per month | P3 |
| FR-INS-85 | Sandbox-to-production certification tracked as a release gate, with certification status published in-product | P2 |

#### 17.10 Insurance desk cockpit, analytics & controls

| ID | Requirement | Pri |
|---|---|---|
| FR-INS-90 | **Insurance desk cockpit:** one screen showing pre-auths awaiting submission, awaiting payer response (with TAT countdown), queries pending reply, discharges blocked on authorisation, and claims overdue — sorted by money at risk | P2 |
| FR-INS-91 | **Payer scorecard:** approval rate, median approval TAT, median settlement days, disallowance rate, query rate — ranked, so the org can negotiate or de-empanel with evidence | P3 |
| FR-INS-92 | **Denial analytics:** top denial reasons by payer, by doctor, by procedure; and a "preventable denial" view (missing document, tariff mismatch, expired policy) | P3 |
| FR-INS-93 | **Revenue-at-risk report:** claims pending by ageing bucket, expected vs. received, and cumulative leakage from disallowances | P2 |
| FR-INS-94 | **Controls:** tariff cannot be edited on a live claim without approval; duplicate-claim detection (same patient/payer/date/procedure); every submission, resubmission and settlement entry is immutably audit-logged with actor and timestamp | P2 |
| FR-INS-95 | Insurance data shall follow the same RBAC and DPDP consent rules as clinical data; sharing records with a payer requires a recorded patient authorisation | P1 |

#### 17.11 Claim state machine

```
draft
  → eligibility_checked
  → preauth_submitted        (TAT clock starts)
      ├→ preauth_query        → preauth_resubmitted → …
      ├→ preauth_approved     (AL: CCN + sanctioned amount)
      └→ preauth_denied       → converted_to_self_pay | converted_to_reimbursement | appealed
  → treatment_in_progress
      └→ enhancement_requested → enhancement_approved | enhancement_denied
  → final_auth_requested      (3-hour clock starts)
  → discharged
  → claim_submitted
      ├→ claim_query          → claim_resubmitted → …
      ├→ claim_approved       → settled_full | settled_part(disallowance)
      └→ claim_rejected       → appealed → (settled | written_off)
```

Every transition records actor, timestamp, channel, reference number, and attached documents. The timestamps are the hospital's evidence when arguing a TAT breach.

#### 17.12 New role: Insurance / TPA Desk Executive

| Scope | Can do | Cannot do |
|---|---|---|
| Branch (or Org, for centralised desks in chains) | Create and submit pre-auths, manage queries, capture ALs, assemble and submit claims, post settlements, run insurance reports, view clinical documents *needed for the claim* | Edit clinical notes, sign prescriptions, change tariffs without approval, approve write-offs above limit |

#### 17.13 Acceptance criteria (illustrative)

- **FR-INS-21:** Given a patient with a corporate OPD wallet holding ₹2,000 remaining and a 20% co-pay on consultations, when a ₹800 consultation is billed, the system shall show ₹640 payer-payable and ₹160 patient-payable, collect ₹160, and reduce the wallet to ₹1,360 — with no manual calculation by the receptionist.
- **FR-INS-34:** Given a pre-auth submitted at 10:00 with no response, when the clock passes 11:00 the request shall move to a red "TAT breached" state, create an escalation task, and offer a pre-filled escalation email citing the 1-hour authorisation requirement.
- **FR-INS-46:** Given a sanctioned amount of ₹80,000 against a final bill of ₹95,500 containing ₹4,200 of non-payable items and a 10% co-pay, the system shall itemise every rupee of the ₹15,500 patient-payable amount on the discharge statement.

---

## 10. Subscription, Plans & Pricing Engine (Super Admin)

This module is what makes the business sellable. It must let a non-engineer create, price, package and version plans.

### 10.1 Entitlement model

Every commercial capability is expressed as one of three primitives:

| Primitive | Example | Behaviour when limit hit |
|---|---|---|
| **Feature flag** (boolean) | `pharmacy`, `telemedicine`, `abdm`, `custom_roles`, `api_access`, `white_label` | Module hidden/locked with an upgrade prompt |
| **Quota** (numeric, resets per cycle or absolute) | `max_branches`, `max_clinician_seats`, `max_staff_seats`, `storage_gb`, `appointments_per_month`, `templates` | Soft block + upgrade CTA; configurable grace and overage |
| **Metered service** (pay-per-use) | WhatsApp messages, SMS, video minutes, storage overage, ABHA transactions | Drawn from a prepaid wallet or billed in arrears |

> **FR-PLAN-01** Plans shall be composed by selecting features, setting quota values, and attaching metered items with unit prices — with no code deployment.
> **FR-PLAN-02** Plans shall be **versioned**. Editing a live plan creates a new version; existing subscribers stay grandfathered on their version until explicitly migrated.
> **FR-PLAN-03** The system shall support price books by currency and geography, and per-tenant negotiated pricing (contract override) with an expiry date.
> **FR-PLAN-04** Billing periods: monthly, quarterly, annual, and multi-year, with configurable discount per period (e.g., annual = 2 months free).
> **FR-PLAN-05** Trials: length, features included, credit-card-not-required flag, auto-convert or auto-expire behaviour, and one-click extension by Super Admin with a reason.
> **FR-PLAN-06** Add-ons purchasable independently of the plan (extra branch, extra seat, pharmacy module, telemedicine, AI scribe, priority support).
> **FR-PLAN-07** Proration on upgrade/downgrade/seat change, mid-cycle, computed to the day.
> **FR-PLAN-08** Coupons and promotions: percentage/absolute, first-N-months, redemption caps, expiry, per-plan eligibility.
> **FR-PLAN-09** Reseller/partner accounts with margin, sub-tenant provisioning, and consolidated invoicing (Phase 3).
> **FR-PLAN-10** Usage metering pipeline with daily aggregation, tenant-visible usage dashboard, and threshold alerts at 80%/100%.
> **FR-PLAN-11** Dunning: retry schedule on failed collection, escalating notifications, read-only mode after grace, suspension after N days, data retained for 90 days before deletion policy applies.
> **FR-PLAN-12** GST-compliant SaaS invoices to tenants (18% on SaaS subscription), with GSTIN capture, place-of-supply logic, credit notes, and downloadable invoice history.
> **FR-PLAN-13** Super Admin can suspend, resume, cancel, refund, and migrate any subscription, with reason capture and full audit.
> **FR-PLAN-14** Revenue reporting: MRR, ARR, expansion/contraction, churn, LTV, plan mix, cohort retention.

### 10.2 Proposed plan matrix (launch)

| | **Starter** | **Clinic** | **Clinic Pro** | **Multi-Clinic** | **Enterprise** |
|---|---|---|---|---|---|
| **Price (₹/month, billed annually)** | 999 | 2,999 | 8,999 | 14,999 + 4,999/extra branch | Custom (from 59,999) |
| Target | Solo doctor | 2–4 doctors | 5–10 doctors | 2–15 branches | Hospital / large chain |
| Clinician seats included | 1 | 3 | 8 | 15 | Custom |
| Staff seats included | 2 | 6 | 20 | 50 | Unlimited |
| Branches | 1 | 1 | 2 | 5 | Custom |
| Appointments/month | 400 | 2,000 | Unlimited | Unlimited | Unlimited |
| Online booking page | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar & availability | ✅ | ✅ | ✅ | ✅ | ✅ |
| Check-in & queue | Basic | ✅ | ✅ + TV board | ✅ | ✅ |
| EMR & templates | Basic | ✅ | ✅ | ✅ | ✅ |
| Prescriptions & print | ✅ | ✅ | ✅ + regional languages | ✅ | ✅ |
| Billing & payments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pharmacy & inventory | — | Add-on | ✅ | ✅ | ✅ |
| Telemedicine | Add-on | Add-on | ✅ | ✅ | ✅ |
| Direct messaging | — | Staff only | ✅ | ✅ | ✅ |
| Multi-branch reporting | — | — | Limited | ✅ | ✅ |
| Doctor revenue share | — | — | ✅ | ✅ | ✅ |
| Insurance: policy capture & OPD cashless | — | Add-on | ✅ | ✅ | ✅ |
| Insurance: pre-auth, claims & settlement desk | — | — | Add-on | ✅ | ✅ |
| Government schemes (PMJAY/state) | — | — | — | Add-on | ✅ |
| ABDM/ABHA | ✅ (M1) | ✅ | ✅ | ✅ | ✅ + NHCX |
| Custom roles | — | — | — | ✅ | ✅ |
| API & webhooks | — | — | Read-only | ✅ | ✅ |
| White-label (domain, sender ID) | — | — | Partial | ✅ | ✅ + app |
| Storage | 5 GB | 25 GB | 100 GB | 500 GB | Custom |
| Support | Email | Email + chat | Priority chat | Dedicated CSM | CSM + SLA |
| Onboarding & migration | Self-serve | Guided | Assisted | Full-service | Full-service |

**Metered add-ons (all plans):** WhatsApp ₹0.90/conversation (pass-through + margin) · SMS ₹0.20/msg · Video ₹0.50/min beyond 500 min · Storage ₹15/GB/month overage · Extra clinician seat ₹499/mo · Extra staff seat ₹149/mo · Extra branch ₹4,999/mo · AI scribe ₹999/clinician/mo (Phase 3) · **Insurance & Claims Desk module ₹3,999/branch/mo (included in Multi-Clinic and Enterprise)** · **Government scheme pack ₹2,999/branch/mo**.

**Pricing principles:**
1. **Never charge per appointment.** This is the explicit wedge against per-booking-fee incumbents.
2. Charge for *capacity* (seats, branches) and *variable cost* (messages, storage, minutes) only.
3. Annual billing discounted ~17% to improve cash and reduce churn.
4. Keep monthly SMB invoices **below ₹15,000** wherever possible so UPI AutoPay collects without per-cycle OTP friction.

---

## 11. Payments & Money Movement

### 11.1 Two distinct money flows

| Flow | Payer → Payee | Instruments | Notes |
|---|---|---|---|
| **A. Patient → Provider** | Patient pays the clinic | UPI (intent/QR/collect), cards, netbanking, wallets, cash, payment links | Money must settle to the **provider's** account. We are not the merchant of record for clinical services. |
| **B. Provider → CareOS** | Tenant pays subscription | UPI AutoPay, card e-mandate, eNACH, netbanking, manual bank transfer for Enterprise | Recurring; governed by RBI e-mandate framework |

> **FR-PAY-01** Flow A shall use a payment aggregator with **route/split settlement** so funds settle to the organization's bank account, with an optional platform fee split where contractually agreed.
> **FR-PAY-02** Provider KYC/onboarding (bank account, PAN, GSTIN, licence) shall be collected in-product and submitted to the aggregator; booking prepayment is disabled until KYC clears.
> **FR-PAY-03** Payment status shall be reconciled by webhook **and** by a scheduled poll; no booking is confirmed on client-side callback alone.
> **FR-PAY-04** Refunds shall be initiated from the bill, tracked to the gateway refund ID, and reconciled against settlement.
> **FR-PAY-05** Dynamic UPI QR at the counter shall auto-detect payment and close the bill without manual entry.
> **FR-PAY-06** Idempotency keys shall protect against double charges on retry.
> **FR-PAY-07** No card data shall ever touch our servers; tokenised, PCI-DSS-compliant gateway flows only.

### 11.2 Recurring subscription collection (Flow B) — compliance rules

Per RBI's *Digital Payments — E-mandate Framework, 2026* (effective 21 April 2026):

> **FR-PAY-08** A one-time mandate shall be registered with Additional Factor Authentication (OTP/UPI PIN); subsequent debits **up to ₹15,000** per transaction shall not require per-cycle AFA.
> **FR-PAY-09** A **pre-debit notification shall be sent at least 24 hours before every debit**, stating amount, date and merchant, with an option to opt out of that debit or cancel the mandate.
> **FR-PAY-10** A post-debit confirmation shall be sent after every collection.
> **FR-PAY-11** Customers shall be able to view, modify, pause, revoke or cancel mandates at any time (AFA-authenticated), and mandate validity shall be disclosed at registration.
> **FR-PAY-12** **No charge shall be levied on the tenant for using the e-mandate facility.**
> **FR-PAY-13** Where an invoice exceeds ₹15,000, the system shall either (a) split collection, (b) fall back to a payment link with AFA, or (c) use eNACH — chosen automatically and disclosed to the tenant.
> **FR-PAY-14** Failed-debit dunning shall follow FR-PLAN-11 with retries and a one-tap UPI fallback link.

*(Both the payment aggregator and the merchant carry responsibility for e-mandate compliance — this must be covered in the aggregator contract and in our own notification logic.)*

---

## 12. Regulatory & Compliance Requirements

### 12.1 DPDP Act 2023 + DPDP Rules 2025

Timeline that drives our roadmap: Rules notified **13 Nov 2025**; enforcement/penalty provisions and Consent Manager registration from **13 Nov 2026**; full compliance by **13 May 2027**.

| ID | Requirement | Pri |
|---|---|---|
| FR-DPDP-01 | We act as **Data Processor** for tenant patient data; tenants are Data Fiduciaries. A Data Processing Agreement shall be part of the standard contract | P0 |
| FR-DPDP-02 | Standalone, itemised privacy notice in plain language, separate from Terms — for both patients and tenant users | P0 |
| FR-DPDP-03 | Granular, purpose-specific consent capture (treatment, communications, marketing, record sharing) — no pre-ticked boxes, no bundled consent — with versioned consent records and withdrawal | P0 |
| FR-DPDP-04 | Data-principal rights workflows: access, correction, erasure, grievance, and nomination — with SLA timers and audit | P1 |
| FR-DPDP-05 | Reasonable security safeguards: encryption at rest and in transit, access control, access logging, monitoring, backups — extended contractually to sub-processors | P0 |
| FR-DPDP-06 | Breach detection, notification to the Board and affected individuals, and a follow-up report within statutory timelines; runbook and templates maintained | P0 |
| FR-DPDP-07 | Retention schedule per data class with automated purge and legal-hold override; medical-record retention defaults configurable per tenant | P1 |
| FR-DPDP-08 | Children's data: verifiable parental consent path for patients under 18 and no behavioural advertising/tracking of minors | P1 |
| FR-DPDP-09 | Interoperability path for DPDP Consent Managers once the framework is operational | P2 |

### 12.2 Clinical & sectoral

| ID | Requirement |
|---|---|
| FR-REG-01 | Telemedicine Practice Guidelines 2020: RMP-only teleconsultation, registration number display, consent (implied when patient-initiated; explicit for tele-counselling/recording), drug List O/A/B enforcement, prohibited-list blocking, record retention equal to in-person, and a signed fee receipt |
| FR-REG-02 | EHR Standards (India) and HL7 FHIR R4 India profiles for all exchanged clinical documents |
| FR-REG-03 | Pharmacy: drug licence display, Schedule H/H1 register, expiry controls, prescriber capture for prescription-only medicines |
| FR-REG-04 | GST: correct treatment of exempt healthcare services vs. taxable goods/retail; e-invoicing readiness if a tenant crosses the turnover threshold |
| FR-REG-07a | Insurance operations shall respect IRDAI service expectations: pre-authorisation decisions within 1 hour and final discharge authorisation within 3 hours are **payer** obligations, but the system shall timestamp every provider-side submission so breaches are evidenced; delay charges beyond the window are recorded as insurer-borne, not patient-borne |
| FR-REG-07b | Claim documents shared with any payer, TPA or scheme administrator shall require a recorded patient authorisation, with a disclosure log of what was shared, to whom, and when |
| FR-REG-05 | Medico-legal record integrity: immutable signed encounters, versioned addenda, exportable case sheet, and retention aligned to applicable state/NMC guidance |
| FR-REG-06 | Data residency in India for all patient data, including backups and logs |
| FR-REG-07 | Certifications roadmap: ISO 27001 (Year 1), SOC 2 Type II (Year 2), NABH digital-health-friendly documentation support |


---

## 13. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Booking page first contentful paint < 2.0 s on 4G; slot availability API p95 < 400 ms; consultation workspace load p95 < 1.5 s; queue board update latency < 2 s |
| **Scale (Year 2 target)** | 5,000 tenants · 50,000 concurrent staff sessions at peak (9–11 AM, 6–9 PM IST) · 5 M appointments/month · 50 M patient records |
| **Availability** | 99.9% monthly for core booking/consultation; 99.5% for reporting; published status page; planned maintenance only 01:00–04:00 IST Sunday |
| **Offline resilience** | Front desk must be able to continue check-in and record vitals for ≥15 min of connectivity loss and sync on recovery; prescriptions must be printable from local cache |
| **Low-bandwidth mode** | A lightweight UI mode under 300 KB initial payload for tier-3 connectivity |
| **Data durability** | RPO ≤ 15 min, RTO ≤ 2 h; point-in-time recovery for 35 days; quarterly restore drills |
| **Security** | OWASP ASVS L2, annual third-party pen test, dependency scanning in CI, secrets management, least-privilege IAM, WAF, rate limiting, bot protection on public booking |
| **Auditability** | Immutable append-only audit log of every read/write to clinical and financial data, retained ≥ 7 years, searchable by Org Admin for their tenant |
| **Accessibility** | WCAG 2.1 AA for patient-facing surfaces; minimum 16 px base type; high-contrast queue displays |
| **Localisation** | UI in English + Hindi + 6 regional languages at GA; INR formatting; Indian date formats; regional-language PDF rendering with embedded fonts |
| **Browser/device** | Chrome/Edge/Safari current-2; Android 9+; low-end device budget (2 GB RAM) for the patient PWA |
| **Observability** | Structured logs, distributed tracing, per-tenant error budgets, business-metric alerting (bookings dropping to zero for a live tenant pages on-call) |
| **Deployability** | Trunk-based development, CI/CD, feature flags for progressive rollout, zero-downtime migrations, per-tenant canary |

---

## 14. Data Model

### 14.1 Core entities (abridged)

```
Organization(id, name, type, gstin, pan, status, plan_version_id, created_at)
Branch(id, org_id, name, hfr_id, address, geo, timezone, hours_json, letterhead_id)
Department(id, branch_id, name)
Room(id, branch_id, name, type, capacity)
Resource(id, branch_id, name, type, is_bookable)
User(id, phone, email, password_hash, mfa, status)
Membership(id, user_id, org_id, role_id, scope_type, scope_id, status)
Role(id, org_id|null, name, is_system, permissions[])
Clinician(id, user_id, reg_no, council, hpr_id, qualifications, specialities[], languages[])
ClinicianBranch(id, clinician_id, branch_id, fee, share_type, share_value, mode)
AvailabilityTemplate(id, clinician_branch_id, weekday, start, end, mode, slot_min, buffer_min, capacity, effective_from, effective_to)
AvailabilityException(id, clinician_branch_id, date, type, start, end, reason)
Slot(virtual — generated; persisted only when held/booked)
Patient(id, org_id, mrn, name, dob, gender, phone, abha_number, abha_address, tags[], allergies[])
PatientRelation(id, patient_id, related_patient_id, relation)
Appointment(id, org_id, branch_id, patient_id, clinician_id, service_id, room_id, resource_ids[],
            start, end, mode, channel, status, token_no, payment_status, source, notes)
AppointmentEvent(id, appointment_id, from_status, to_status, actor_id, reason, at)
Encounter(id, appointment_id, patient_id, clinician_id, status, signed_at, signed_by, locked)
EncounterNote(id, encounter_id, section, content_json, version)
Vital(id, encounter_id, code, value, unit, recorded_by, at)
Diagnosis(id, encounter_id, icd10_code, text, type)
Prescription(id, encounter_id, patient_id, clinician_id, mode, issued_at, signature_id, pdf_hash, language)
PrescriptionItem(id, prescription_id, drug_id, dose, frequency, route, duration, qty, instructions, substitutable)
Service(id, org_id, branch_id|null, name, code, type, duration, price, gst_rate, room_type, resource_ids[])
Package(id, org_id, name, services_json, sittings, validity_days, price)
Product(id, org_id, name, composition, form, strength, schedule_class, hsn, gst_rate, manufacturer)
Store(id, branch_id, name, licence_no)
Batch(id, store_id, product_id, batch_no, expiry, qty, mrp, purchase_rate)
StockLedger(id, store_id, product_id, batch_id, txn_type, qty_delta, ref_type, ref_id, at)
Dispense(id, prescription_id|null, store_id, patient_id, items_json, invoice_id, dispensed_by)
Invoice(id, org_id, branch_id, series, number, patient_id, lines_json, subtotal, tax_json, total, status)
Payment(id, invoice_id|null, org_id, amount, tender, gateway_ref, status, settled_at)
Refund(id, payment_id, amount, reason, approved_by, gateway_ref, status)
Payer(id, org_id, name, type, irdai_no, nhcx_participant_id, portal_url, contacts_json, status)
Empanelment(id, payer_id, branch_id, empanelment_no, valid_from, valid_to, status)
Tariff(id, payer_id, branch_id|null, item_type, item_id, rate, discount_pct, effective_from, effective_to)
NonPayableItem(id, payer_id, product_id|service_id, reason)
PayerRule(id, payer_id, copay_pct, deductible, room_rent_cap, sublimits_json, doc_checklist_json, tat_minutes)
PatientPolicy(id, patient_id, payer_id, policy_no, member_id, corporate_id, sum_insured,
              valid_from, valid_to, priority, kyc_docs[], verified_at, verified_by)
BenefitWallet(id, patient_policy_id, category, limit_amount, consumed_amount, period_start, period_end)
EligibilityCheck(id, patient_policy_id, appointment_id|null, channel, request_ref, response_json, at)
PreAuth(id, org_id, branch_id, patient_id, patient_policy_id, encounter_id|null, ccn, status,
        diagnosis_icd10, procedure_code, estimated_amount, sanctioned_amount, submitted_at,
        responded_at, tat_breached, channel, clinician_signed_by)
PreAuthEvent(id, preauth_id, from_status, to_status, actor_id, channel, reference_no, note, docs[], at)
Claim(id, org_id, branch_id, patient_id, preauth_id|null, invoice_ids[], payer_id, claim_no,
      claimed_amount, approved_amount, disallowed_amount, tds_amount, status, submitted_at, settled_at)
ClaimDeduction(id, claim_id, line_ref, amount, reason_code, disputed, resolution)
ClaimDocument(id, claim_id|preauth_id, doc_type, file_ref, mandatory, uploaded_by, at)
Remittance(id, payer_id, utr, amount, received_at, allocations_json)
SchemeCase(id, scheme_code, beneficiary_id, package_code, preauth_id, claim_id, status)
Consent(id, patient_id, purpose, scope, granted_at, expires_at, revoked_at, artefact_ref)
CareContext(id, patient_id, abha_number, encounter_id, type, linked_at, hip_id)
MessageThread(id, org_id, type, participants[], patient_id|null, assigned_to)
Message(id, thread_id, sender_id, body, attachments[], channel, delivery_status)
NotificationLog(id, org_id, template, channel, to, status, cost, at)
Subscription(id, org_id, plan_version_id, period, seats_json, addons_json, status, current_period_end)
PlanVersion(id, plan_id, version, features_json, quotas_json, metered_json, price_json, active)
UsageRecord(id, org_id, metric, qty, period, at)
PlatformInvoice(id, org_id, number, lines_json, gst_json, total, status, due_at)
AuditLog(id, org_id, actor_id, action, entity_type, entity_id, before, after, ip, at)
```

### 14.2 Critical constraints
- Unique index on `(clinician_id, start)` and `(room_id, start)` for booked appointments — double-booking must be impossible at the database layer, not just in application logic.
- `organization_id` present on every tenant-owned table, enforced by RLS.
- Invoice numbers gapless per `(branch_id, series, financial_year)` via a sequence table with row-level locking.
- Signed `Encounter` rows are write-protected by trigger; changes must go through the addendum table.
- `Tariff` rows are effective-dated and immutable once referenced by a submitted claim; corrections create a new version.
- Unique constraint on `(payer_id, patient_id, admission_date, procedure_code)` for claims, to catch duplicate submissions.

### 14.3 Key state machines

**Appointment:** `requested → confirmed → checked_in → in_consultation → completed`; branches to `cancelled` (with reason), `no_show` (auto after grace), `rescheduled` (spawns new appointment, links to old).

**Prescription:** `draft → signed → shared → dispensed(partial|full)`; `signed` is terminal for content edits.

**Subscription:** `trial → active → past_due → grace(read_only) → suspended → cancelled`; recovery from `past_due`/`grace` on successful collection.

**Claim:** see the full state machine in [M17 §17.11](#1711-claim-state-machine). Every transition stores actor, timestamp, channel and reference number, because those timestamps are the provider's evidence in a turnaround-time dispute.

---

## 15. Analytics, KPIs & Success Metrics

### 15.1 Product KPIs (per tenant)
- **Activation:** % of tenants publishing a booking page and completing 10 appointments within 7 days (target 60%).
- **Depth:** modules used per tenant (target ≥ 4 of 8 by day 60).
- **Clinician adoption:** % of appointments with a completed digital encounter (target ≥ 80% by day 45) — the single strongest churn predictor.
- **Online-booking share:** % of appointments arriving through patient self-service (target 35% by month 6).
- **Median consult documentation time** (target ≤ 90 s).
- **No-show rate delta** vs. tenant baseline (target −30% after reminders).

### 15.1b Insurance module KPIs (per tenant)
- **Days in AR** for insurance receivables (target: −10 days within 90 days of adoption).
- **Pre-auth approval rate** and **median approval TAT** vs. the 1-hour regulatory expectation.
- **Discharge-authorisation TAT** vs. the 3-hour expectation, and count of breaches evidenced.
- **Disallowance rate** (disallowed ÷ claimed) and **preventable-denial share** (missing document, tariff mismatch, expired policy).
- **Claim first-pass acceptance rate** (no query raised).
- **OPD cashless attach rate** — % of eligible visits where the wallet/benefit was actually applied at the counter.

### 15.2 Business KPIs
MRR/ARR · net revenue retention (target ≥110%) · logo churn (<1.5%/mo) · CAC payback (<9 months) · gross margin (≥72%) · support tickets per tenant per month (<1.5) · time-to-value (<24 h).

### 15.3 Instrumentation requirements
> **FR-ANL-01** Every product event shall carry `org_id`, `branch_id`, `role`, `plan_version`, and a session ID, and land in a warehouse within 15 minutes.
> **FR-ANL-02** A **tenant health score** shall combine usage depth, clinician adoption, support volume and payment status; scores below threshold shall create a CSM task.
> **FR-ANL-03** Feature-flag exposure shall be logged so A/B results are attributable.

---

## 16. Go-To-Market Plan

### 16.1 Motion by segment
| Segment | Motion | Notes |
|---|---|---|
| Solo & small clinic | Product-led self-serve + inside sales follow-up | Free 14-day trial, credit card not required, WhatsApp onboarding nudges |
| Chains | Field/inside sales, 20-minute demo, free migration, 1-day go-live promise | Mirror the strongest challenger play in the market |
| Small hospitals | Enterprise sales with an implementation partner network | ABDM certification + NHCX as the door-opener |

### 16.2 Acquisition channels
1. **SEO/comparison content** — the category is dominated by "X vs Y" and "pricing" queries; own "Practo Ray alternative", "clinic management software pricing India", "ABDM compliant HMS".
2. **Migration offer** — free assisted migration, 2-business-day SLA, published.
3. **ABDM/DHIS angle** — help facilities register on HFR/HPR and claim digital-health incentives; a compliance consultation is a low-friction first touch.
4. **Medical associations & speciality bodies**, CME sponsorships, state IMA chapters.
5. **Pharma and diagnostics partnerships** for co-distribution.
6. **Reseller network** in tier-2/3 cities (Phase 3), with margin and a partner portal.

### 16.3 Competitive plays
- **Against Practo Ray:** flat pricing (no per-appointment fees), white-label patient experience, real multi-branch control, free migration.
- **Against HealthPlix/Eka Care:** we are the *clinic operating system*, not a doctor's notepad — front desk, queue, pharmacy, finance, chain reporting.
- **Against MocDoc/regional HMS:** modern UX, self-serve onboarding, published API, faster release cadence.
- **Against enterprise HIS:** 10–30× lower cost, ABDM-native, live in a day.

### 16.4 Pricing/packaging experiments to run
Annual-prepay discount depth · pharmacy as included vs. add-on in Clinic Pro · seat-based vs. flat branch pricing for chains · WhatsApp credits bundled vs. metered.

---

## 17. Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Clinicians abandon the EMR and revert to paper | Fatal to retention | High | Ruthless focus on ≤90 s documentation; templates/favourites in onboarding; measure and intervene on clinician adoption weekly |
| R2 | ABDM milestone certification slips past GA | Blocks scheme-linked and hospital deals | Medium | Start sandbox work in month 1, treat M1–M3 as a release gate, budget for an empanelled implementation partner |
| R3 | DPDP enforcement arrives before we are audit-ready | Deal blocker in enterprise procurement; penalty exposure for tenants | Medium | Ship consent/notice/rights workflows in Phase 1–2; ISO 27001 in Year 1; standard DPA in the contract |
| R4 | Subscription collection failures (mandate churn) | Revenue leakage | Medium | UPI AutoPay-first, keep invoices under ₹15,000, compliant pre-debit notices, aggressive dunning with UPI fallback |
| R5 | Data migration quality problems | Churn during onboarding, reputational | High | Dry-run + preview + rollback; dedicated migration engineers; publish a quality checklist |
| R6 | Incumbent price war / marketplace demand advantage | Slower growth | Medium | Compete on total cost at volume and on owning the clinic's own demand (recall, WhatsApp reactivation) |
| R7 | WhatsApp policy or pricing changes | Cost and channel disruption | Medium | Provider-agnostic messaging abstraction; SMS/push fallback; pass-through pricing |
| R8 | Multi-tenant data leakage incident | Existential | Low | RLS + tenant-context middleware + automated cross-tenant tests in CI + pen testing + bug bounty |
| R9 | Scope creep into full IPD/lab too early | Delayed GA | High | Phase gates in this PRD; IPD-lite deferred to V2, full IPD explicitly out of scope |
| R11 | Payer/TPA integration fragmentation — most insurers and TPAs still work through bespoke portals and email, so "integration" degrades to manual submission | Insurance module under-delivers on its promise | High | Design the workflow to be valuable *without* APIs (assembly, checklists, TAT clocks, tracking, evidence); treat NHCX as the strategic rail and portal-assist as the day-one reality |
| R12 | Regulatory TAT claims create expectations we cannot control — the payer, not us, decides speed | Customer disappointment, possible mis-selling perception | Medium | Market the module as *evidence and control*, never as guaranteed approvals; every screen distinguishes what we timestamp from what the payer decides |
| R13 | Handling claim data expands our exposure under DPDP and creates payer-sharing obligations | Compliance and trust risk | Medium | Explicit patient authorisation before any payer disclosure; minimum-necessary document sharing; full disclosure log in the consent ledger |
| R10 | Support load in tier-2/3 without local presence | Margin erosion | Medium | In-product guidance, WhatsApp support, regional-language help centre, partner-led implementation |

---

## 18. Roadmap

| Quarter | Milestone | Exit criteria |
|---|---|---|
| **Q1 (M0–M3)** | Foundations: tenancy, RBAC, masters, calendar engine, booking, check-in/queue | 10 design-partner clinics running live daily OPD |
| **Q2 (M4–M5)** | EMR, Rx, print/share, billing & payments, patient PWA, Super Admin plan builder v1 | MVP GA to design partners; first paid conversions |
| **Q3 (M6–M8)** | Pharmacy, multi-branch admin & reporting, messaging, telemedicine, ABDM M1–M2, insurance policy capture & OPD cashless wallets | 50 paying tenants; ABDM M1–M2 certified; OPD cashless live at 5 clinics |
| **Q4 (M9–M10)** | ABDM M3, revenue share & payouts, subscription billing/e-mandate, API & webhooks, migration tooling | **V1 GA**; 150 paying tenants; NRR baseline set |
| **Q5 (M11–M13)** | Lab module, full insurance desk (pre-auth, claims, settlement, cockpit), NHCX certification (ABDM M4), IPD-lite | First hospital logos; claims flowing through NHCX; measurable AR reduction at 3 reference accounts |
| **Q6 (M14–M18)** | AI scribe & CDS, speciality packs, recall automation, reseller portal, white-label app | 400 paying tenants; ISO 27001 certified |

---

## 19. Open Questions

1. **Marketplace or not?** Do we eventually build patient-side discovery (which competes with Practo's core moat and changes our unit economics), or stay strictly white-label B2B? *Recommendation: stay white-label through V1; revisit with UHI/ONDC in Phase 3, where discovery is a public rail rather than a private marketplace.*
2. **Merchant of record.** Do we ever take custody of patient payments, or always route to the provider? *Recommendation: always route; revisit only if we launch financing/BNPL.*
3. **On-premise/private-cloud option** for hospitals that demand it — do we support it, and at what price floor?
4. **Drug database licensing** — build vs. license; what is the annual cost and update cadence?
5. **Clinical liability posture** for CDS alerts — what disclaimers, and what does our insurance require?
6. **Free tier?** Competitors offer usable free tiers. Does a permanently free single-doctor tier accelerate the funnel enough to justify the support cost?
7. **Lab strategy** — build LIS or integrate with existing LIS vendors first?
8. **Regional-language coverage at GA** — which 6, based on target-city sales priority?
9. **Consent Manager interop** — do we register as a DPDP Consent Manager, or only integrate with third-party ones?
10. **Insurance module build order** — do we ship OPD cashless first (our ICP, differentiated, less integration-dependent) or IPD pre-auth first (higher revenue per account, but requires hospital customers we do not yet have)? *Recommendation: OPD first.*
11. **Payer partnerships** — do we pursue direct API agreements with a handful of large insurers/TPAs and OPD-benefit administrators as a wedge, or wait for NHCX coverage to mature? Direct deals are faster to demo but create maintenance debt.
12. **Claims-as-a-service** — is there a revenue model in charging per successfully settled claim (aligned incentives) rather than a flat module fee? This would need careful framing to avoid looking like fee-splitting.
13. **Retention/deletion defaults** for tenants who churn — 90 days is proposed; legal review needed against medical-record retention expectations.

---

## 20. Appendices

### Appendix A — Permission Matrix

Legend: **F** = full, **R** = read-only, **O** = own records only, **A** = requires approval, **—** = no access.

*(The Insurance/TPA Desk Executive role is omitted from the columns below for width; it holds full rights on all `insurance.*` permissions except `insurance.tariff.manage` (approval required), read-only on clinical documents attached to a claim, and no access to `encounter.write`, `prescription.sign`, `service.manage` or `subscription.manage`.)*

| Permission | Super Admin | Org Admin | Branch Mgr | Clinician | Front Desk | Pharmacist | Accountant | Patient |
|---|---|---|---|---|---|---|---|---|
| `org.manage` | F | F | — | — | — | — | — | — |
| `branch.manage` | F | F | R | — | — | — | — | — |
| `user.invite` / `role.assign` | F | F | Branch only | — | — | — | — | — |
| `service.manage` | F | F | R | — | — | — | — | — |
| `product.manage` | F | F | A | — | — | F (store) | — | — |
| `schedule.manage` | F | F | F | Own | R | — | — | — |
| `appointment.create` | F | F | F | Own | F | — | — | Own |
| `appointment.cancel` | F | F | F | Own | F | — | — | Own (policy) |
| `patient.read` | — (grant only) | F | Branch | Assigned | Demographics | Demographics | Billing only | Own |
| `encounter.write` | — | — | — | Own | — | — | — | — |
| `encounter.sign` | — | — | — | F | — | — | — | — |
| `prescription.sign` | — | — | — | F | — | — | — | — |
| `prescription.dispense` | — | — | R | R | — | F | — | — |
| `inventory.adjust` | — | F | A | — | — | F | — | — |
| `invoice.create` | — | F | F | — | F | F | F | — |
| `discount.apply` | — | F | Up to limit | — | Up to limit | Up to limit | F | — |
| `payment.refund` | F | F | A | — | A | A | F | — |
| `report.branch.view` | F | F | F | Own metrics | — | Store only | F | — |
| `report.org.view` | F | F | — | — | — | — | F | — |
| `message.patient` | — | F | F | F | F | — | — | F |
| `insurance.policy.manage` | — | F | F | R | F | — | F | Own |
| `insurance.preauth.submit` | — | F | F | Clinical section only | — | — | — | — |
| `insurance.claim.submit` | — | F | F | — | — | — | F | — |
| `insurance.settlement.post` | — | F | A | — | — | — | F | — |
| `insurance.tariff.manage` | — | F | A | — | — | — | R | — |
| `subscription.manage` | F | F | — | — | — | — | R | — |
| `plan.manage` (platform) | F | — | — | — | — | — | — | — |
| `audit.view` | F | F (own tenant) | Branch | — | — | — | R | — |
| `abdm.consent.manage` | — | F | F | R | F | — | — | F (own) |

### Appendix B — Appointment Status Definitions

| Status | Meaning | Set by | Side effects |
|---|---|---|---|
| `requested` | Booking submitted, awaiting confirmation or payment | Patient/staff | Slot held for N minutes |
| `confirmed` | Slot secured | System on payment/staff | Confirmation + reminder ladder scheduled |
| `checked_in` | Patient physically present or joined tele waiting room | Front desk/patient | Token issued, enters queue, wait estimate starts |
| `in_consultation` | Clinician has called the patient | Clinician | Encounter created; consult timer starts |
| `completed` | Consultation finished | Clinician | Rx/bill finalisation prompts; follow-up scheduling; feedback request |
| `cancelled` | Cancelled by either side | Either (reason mandatory) | Slot released; refund per policy; waitlist offered |
| `no_show` | Grace period elapsed after start | System | Optional fee; affects future prepay requirement |
| `rescheduled` | Moved to a new appointment | Either | Links old→new; original slot released |

### Appendix C — Notification Catalogue

| Event | Channel priority | Timing | Recipient |
|---|---|---|---|
| Booking confirmed | WhatsApp → SMS | Immediate | Patient |
| Payment receipt | WhatsApp → email | Immediate | Patient |
| Reminder 1 | WhatsApp → SMS | T-24 h | Patient |
| Reminder 2 | WhatsApp → push | T-2 h | Patient |
| Doctor delay | WhatsApp → SMS | On trigger | Affected patients |
| Session cancelled | WhatsApp + call task | On trigger | Affected patients + front desk |
| Your turn is near (token) | Push → WhatsApp | 2 patients ahead | Patient |
| Prescription ready | WhatsApp | On sign | Patient |
| Bill/invoice | WhatsApp → email | On issue | Patient |
| Pending dues | WhatsApp | T+1 day, T+7 days | Patient |
| Medicine refill due | WhatsApp | Course end −2 days | Patient |
| Follow-up due | WhatsApp | On follow-up date −1 day | Patient |
| Lab report ready | WhatsApp | On upload | Patient + clinician |
| Pre-auth submitted | In-app + email | Immediate | Insurance desk, patient |
| Pre-auth approved / denied | WhatsApp + in-app | On payer response | Patient, insurance desk, treating clinician |
| Pre-auth TAT breach | In-app + SMS escalation | At 60 min | Insurance desk, Branch Mgr |
| Discharge authorisation pending | In-app countdown | Every 30 min from request | Insurance desk, Branch Mgr |
| Claim query received | In-app + email | On receipt | Insurance desk (assigned owner) |
| Claim settled / disallowed | In-app + email | On posting | Insurance desk, Accountant |
| Policy expiring | WhatsApp | 30 days before | Patient |
| Low stock / near expiry | In-app + email | Daily digest | Pharmacist, Branch Mgr |
| Day-end variance | In-app + email | Day close | Branch Mgr, Accountant |
| Subscription pre-debit notice | Email + WhatsApp | **T-24 h (mandatory)** | Tenant billing contact |
| Debit success/failure | Email + WhatsApp | Immediate | Tenant billing contact |
| Quota at 80% / 100% | In-app + email | On threshold | Org Admin |

### Appendix D — Print Templates

| Template | Sizes | Configurable elements |
|---|---|---|
| Prescription | A4, A5, thermal summary | Letterhead on/off, margins, language, signature, QR to digital copy, footer with clinic details and licence |
| Invoice / receipt | A4, A5, 80 mm thermal | GST breakup, HSN, discount, payment mode, duplicate watermark |
| Pharmacy tax invoice | A4, 80 mm | Batch, expiry, MRP, GST split, drug licence no. |
| Lab order form | A4 | Tests, clinical notes, fasting instructions |
| Referral letter | A4 | Clinical summary, referring & receiving doctor |
| Appointment card / token slip | 80 mm | Token no., estimated time, doctor, room |
| Discharge/visit summary | A4 | Diagnosis, treatment, advice, follow-up |
| Pre-authorisation request pack | A4 | Payer form layout, clinical section, cost estimate, document index |
| Treatment cost estimate | A4 | Expected total, payer share, patient out-of-pocket, patient signature block |
| Cashless discharge statement | A4 | Sanctioned amount, itemised deductions, co-pay, patient-payable |
| Patient reimbursement claim pack | A4 (multi-doc PDF) | Claim form, bills, receipts, prescriptions, reports, discharge summary |
| Doctor payout statement | A4 | Consults, revenue share, deductions, TDS |

### Appendix E — Glossary

**ABDM** Ayushman Bharat Digital Mission · **ABHA** Ayushman Bharat Health Account (14-digit health ID + @handle) · **HFR** Health Facility Registry · **HPR** Healthcare Professionals Registry · **HIP/HIU** Health Information Provider / User · **HIE-CM** Health Information Exchange & Consent Manager · **Care context** a linkable clinical event (visit, report, prescription) · **NHCX** National Health Claims Exchange · **DHIS** Digital Health Incentive Scheme · **FHIR R4** HL7 interoperability standard used by ABDM · **DPDP** Digital Personal Data Protection Act 2023 + Rules 2025 · **TPG** Telemedicine Practice Guidelines 2020 · **AFA** Additional Factor of Authentication · **e-mandate / UPI AutoPay** recurring debit authorisation · **DLT** TRAI's registration regime for commercial SMS · **TPA** Third Party Administrator · **RAL/Pre-auth** Request for Authorisation Letter · **AL** Authorisation Letter · **CCN** Claim Control Number (TPA's reference for a cashless case) · **TAT** Turnaround Time · **Cashless Everywhere** IRDAI initiative extending cashless treatment beyond network hospitals · **PED** Pre-Existing Disease · **Moratorium** period after which most claims cannot be contested for non-disclosure · **Sub-limit** cap on a named procedure irrespective of sum insured · **Disallowance** amount deducted by the payer from a claimed bill · **Days in AR** average age of outstanding receivables · **HBP** Health Benefit Package (PMJAY) · **TMS** Transaction Management System (NHA's PMJAY provider portal) · **CGHS/ECHS/ESIC** government employee and worker health schemes · **RMP** Registered Medical Practitioner · **MRN** Medical Record Number · **FEFO** First Expiry First Out.

### Appendix F — Sources Consulted (market & regulatory)

Competitive pricing and positioning drawn from public 2026 comparison sources including Ichelon Consulting's Indian CMS/PMS cost comparisons, Cufront's Practo Ray pricing analysis, Capterra and Technology Counter listings, ring2doc's independent comparison, and Cliniqwise/Doccure/Healthixio buyer guides. Regulatory positions drawn from NHA/ABDM milestone documentation summarised by ABDM integration guides, the DPDP Rules 2025 gazette notification (G.S.R. 846(E), 13 November 2025) and published compliance timelines, RBI's Digital Payments — E-mandate Framework 2026 (Circular RBI/DPSS/2026-27/396, 21 April 2026), the Telemedicine Practice Guidelines 2020, the IRDAI Master Circular on Health Insurance Business (IRDAI/HLT/CIR/PRO/84/5/2024, 29 May 2024) and the IRDAI 'Cashless Everywhere' circular (23 January 2024) as summarised by published policyholder guides, NHA operational manuals for AB PM-JAY and the TMS provider application, and NHA/IRDAI material on NHCX. **Pricing figures are third-party reported and should be re-validated before use in sales collateral.**

---

*End of document. Version 1.0 — circulate for comment; all sections marked P0 require sign-off from Engineering and Clinical Advisory before sprint planning.*
