---
id: TECH004
type: technical-plan
feature: technical-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: TECH000
related: [TECH003, TECH006]
---

# 03 — Phase 3 / V2: "Depth & moat"

**PRD reference:** §6.3, roadmap Q5–Q6. **Exit criterion:** 400 paying tenants; ISO 27001 certified; claims flowing through NHCX; measurable AR reduction at 3 reference accounts.
**Prerequisite:** Phase 2 complete and validated against real usage.

## A deliberate difference in this document's detail level

Phases F, 1 and 2 are specified at schema-and-constraint level because they are
near-term and their dependencies are known. **Phase 3 is specified at
decision-and-interface level only**, on purpose.

Three of its largest items (full insurance desk, NHCX, speciality packs) should
be designed against **real usage data from Phase 2**, not speculatively now.
`REQ031` says this explicitly about its own P2/P3 scope, and the PRD's own risk
register (R9, scope creep) is about exactly this failure mode. Writing detailed
DDL now for a claims desk nobody has used yet would produce confident-looking
guesses that later slices would have to unpick.

Each item below therefore gets: what it is, what it depends on, the decisions
that must be made before coding, and the known traps. The `PLAN###` document
written at implementation time supplies the rest.

---

## 1. Insurance: the P2/P3 follow-on (largest item)

**Write this as new requirement documents** (`REQ0XX`, numbered when planning
begins) — `REQ031` deliberately scoped only the P1/OPD slice and says so.

### Scope

| Sub-module | PRD ref | Depends on |
|---|---|---|
| Cashless pre-authorisation (IPD/day-care) | §17.5 | Phase 2's payer master, `REQ020` diagnosis fields |
| Cashless billing, discharge, final authorisation | §17.6 | pre-auth; IPD-lite (§4 below) |
| Claim submission, tracking, settlement, disallowance | §17.7 | pre-auth |
| NHCX integration (ABDM M4) | §17.9 | ABDM M1–M3 certified |
| Government schemes (PMJAY/state/CGHS/ECHS/ESIC) | §17.8 | claims pipeline |
| Denial analytics & payer scorecards | §17.10 | ≥1 quarter of real claim data |

### Decisions required before coding

1. **The 20-state claim state machine (§17.11)** — implement as an explicit state table with transition guards, or as status + event log? The codebase precedent is `AppointmentStatusLogs` (status column + append-only event log), which already works and staff already understand. Prefer consistency unless the claim machine's branching genuinely demands more.
2. **TAT clocks** (1-hour pre-auth, 3-hour discharge authorisation) — these are *payer* obligations; our job is timestamping our own submissions so a breach is evidenced. Decide where the clock lives (derived at read time from event timestamps, vs. a materialised countdown) and how escalation tasks are raised.
3. **Submission channel abstraction** — NHCX where available, portal-assist/email otherwise, with **the same internal state machine either way** so staff learn one process (PRD `FR-INS-83`). This abstraction shape is the single most important design decision in the module.

### Known traps

- **PRD risk R11**: most payers are still portals and email. A module that only works with APIs under-delivers. The manual path must be first-class.
- **PRD risk R12**: never market or phrase this as guaranteed approvals. Every screen must distinguish what we timestamp from what the payer decides.
- **PRD risk R13 / `FR-REG-07b`**: claim documents shared with any payer require recorded patient authorisation plus a disclosure log — depends on `REQ034`'s consent model, not a new one.
- `Tariff` rows become **immutable once referenced by a submitted claim** (PRD §14.2). Phase 2 built effective-dating; this phase adds the lock.
- Duplicate-claim detection: unique on `(payer_id, patient_id, admission_date, procedure_code)`.

---

## 2. Lab / diagnostics module

Depends on `REQ020` (investigation orders are `FR-EMR-08`, deferred from Phase 1).

**Decision required:** build a LIS or integrate with existing LIS vendors first?
PRD §19.7 is explicitly open. The integration path (HL7 v2 / vendor APIs,
`FR-INT-05`) reaches more customers sooner; the build path controls the
experience. Do not start either until this is answered.

Order → sample collection → result upload → attach to encounter → notify patient
and clinician. Results attach to the same `Encounters` record Phase 1 created.

---

## 3. AI scribe and clinical decision support

`FR-EMR-11` (voice-to-text + AI note drafting) and `FR-EMR-12` (drug–drug,
drug–allergy, duplicate-therapy, dose-range, renal-dose alerts).

**Blocked on a non-engineering decision:** PRD §19.5 — clinical liability posture
for CDS alerts, what disclaimers, and what the insurance requires. Do not ship
CDS without that resolved.

Design notes that are safe to fix now:
- Every AI-drafted note is **clinician-reviewed before sign** — never auto-signed. The Phase 1 immutability trigger already makes signing the meaningful boundary.
- CDS alert overrides need a captured reason, attached to the encounter. Phase 1's addendum/audit design should already accommodate this (it was written anticipating it).
- Indian-English + major Indian language dictation is a materially harder ASR problem than English-only; budget accordingly or scope to English first.

---

## 4. IPD-lite

Beds, admissions, discharge summaries. Explicitly **not** full IPD/ward
management (PRD §6.4 puts that out of scope entirely).

Primary purpose in this phase is enabling the insurance module's IPD
pre-authorisation and discharge flows — scope it to what those need, not to what
a hospital information system would want.

---

## 5. Speciality packs

Dental odontogram + treatment plan, dermatology photo comparison, physiotherapy
exercise plans, obstetrics ANC card, ophthalmology refraction chart.

**Architectural decision:** these are per-specialty *extensions* to the encounter,
not new encounter types. Design one extension mechanism (a typed JSON payload on
`EncounterNotes` with a specialty-specific schema + renderer) rather than five
bespoke tables — otherwise every new specialty is a schema migration.

`REQ016`'s `Packages` (multi-sitting) is a prerequisite for physio/dental
treatment plans.

---

## 6. Marketplace / UHI discovery

PRD §19.1 recommends staying white-label through V1 and revisiting with UHI in
Phase 3, where discovery is a public rail rather than a private marketplace.

This is a **strategic decision, not a build task** — it changes unit economics
and the competitive relationship with Practo. `05-competitive-analysis.md` §2.1
lays out the two positions. Resolve before scoping.

---

## 7. Platform maturity (continuous, not a discrete step)

Carried from `REQ035` and `project-plans/analysis/06-execution-plan.md`:

- **Observability/SLOs**: structured logs, tracing, per-tenant error budgets, and the specific business-metric alert the PRD names (a live tenant's bookings dropping to zero pages on-call).
- **Feature flags + per-tenant canary** — distinct from `REQ032`'s plan-entitlement flags. Do not conflate a deployment-risk mechanism with a commercial-packaging one; they have different lifecycles and different owners.
- **Offline resilience** and **low-bandwidth mode** (<300 KB) — deferred from Phase 1/2, still unbuilt.
- **i18n** — English + Hindi + 6 regional at GA per PRD NFR. PRD §19.8 (which 6) is open and is a sales-priority decision.
- **ISO 27001** (Year 1) then **SOC 2 Type II** (Year 2) — external audits with long lead times; start the ISO work in Phase 2 if the Q6 target is real.
- **Accessibility**: WCAG 2.1 AA on patient-facing surfaces. Never audited. Phase F's lint fix surfaces 12 real `jsx-a11y` errors as a starting point, but a real audit is a separate exercise.

---

## Phase 3 Definition of Done

Deliberately expressed as outcomes rather than a checklist, because the scope
will legitimately change based on Phase 2 learnings:

- Claims flow end-to-end through NHCX for at least one live payer, with the manual/portal path working identically for payers who aren't on it.
- Three reference accounts show a measurable reduction in days-in-AR.
- The insurance desk cockpit surfaces money-at-risk in one screen, sorted by value.
- Speciality packs are added without a schema migration per specialty.
- Platform SLOs are measured, not aspirational — an incident is detected by monitoring before a support ticket.
