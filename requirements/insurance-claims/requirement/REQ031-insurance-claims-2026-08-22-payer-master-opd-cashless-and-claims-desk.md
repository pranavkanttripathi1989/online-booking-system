---
id: REQ031
type: requirement
feature: insurance-claims
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: null
related: [REQ023, REQ020, REQ028, REQ034, PLAN070, TP097, TR096]
---

## Status (2026-08-24)

**`US-INS-01` shipped, scoped down** (`PLAN070`/`TP097`/`TR096`): payer/
TPA master (`Payers`, global reference data like Languages) plus the
genuinely tenant-scoped half — per-branch empanelment (`PayerEmpanelments`)
and manual patient policy capture (`PatientInsurancePolicies`, minus
`US-INS-03`'s OCR pre-fill, which needs a document-scan integration this
slice doesn't add). See
`context/insurance-claims-2026-08-24-req031/manifest.md`.

**Deliberately NOT built**: payer-specific tariffs (`US-INS-02`), OCR
health-card scanning, pre-visit eligibility badges (`US-INS-04`), and the
entire benefit-wallet/bill-split adjudication engine (`US-INS-05`) — this
slice is pure master-data/CRUD with zero real payer/TPA API integration,
exactly the "valuable without any payer API existing" foundation the
requirement doc's own risk mitigation calls for, not the P1 claim-workflow
scope built on top of it.

# Insurance, claims & payer management: payer master, OPD cashless, pre-auth, and claims desk

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M17 — Insurance, Claims & Payer Management** in full (`FR-INS-01`–`95`, §17.1–17.13), the PRD's single largest and most detailed module, explicitly named as a core differentiator (§1.3 item 4, §4.3 item 6): *"every competitor builds IPD claims; almost nobody builds OPD benefit adjudication at the clinic counter."*

## Current state vs. PRD ambition

Nothing in this module exists in the codebase today — no payer, policy, benefit-wallet, pre-authorisation, or claim model of any kind. This is the largest single net-new module in the entire PRD, spanning 95 `FR-INS-*` requirements across 10 sub-modules and a 20-state claim state machine (`PRD §17.11`). It is scoped as one requirement document here (matching the PRD's own single-module framing) but should be **planned and implemented as a multi-slice programme**, not one implementation pass — the PRD's own scope split (`§17.1`) already phases it P1 → P2 → P3, and that phasing is load-bearing, not cosmetic: attempting pre-authorisation and NHCX integration before the payer master and OPD cashless flow exist would build the harder, IPD-oriented half first, against a customer base (the ICP is 2–15-branch clinic chains) that mostly doesn't have IPD at all.

The PRD's own Open Question 10 states this explicitly and gives a recommendation this requirement adopts: *"do we ship OPD cashless first (our ICP, differentiated, less integration-dependent) or IPD pre-auth first... Recommendation: OPD first."* This requirement document follows that recommendation and scopes **§17.2–17.4 (payer master, policy/eligibility, OPD cashless/benefit-wallet adjudication) plus §17.7's patient-reimbursement-pack sub-item** as the P1 deliverable. §17.5–17.6 (IPD/day-care pre-authorisation), the rest of §17.7 (hospital claim tracking/settlement), §17.9 (NHCX), and §17.10 (cockpit/analytics) are P2 and should be scoped as a **follow-on requirement** once P1 is live and the first design-partner clinics are using it — not built speculatively ahead of real usage. §17.8 (government schemes) is explicitly P3 in the PRD and out of scope here entirely.

This split is also why `project-plans` R11 (from its own risk register, restated in `PRD §17` R11) matters here specifically: *"most insurers and TPAs still work through bespoke portals and email, so 'integration' degrades to manual submission."* The P1 scope below is designed to be valuable **without** any payer API existing — manual "verified by" eligibility checks and portal-assist submission are first-class paths, not degraded fallbacks, matching the PRD's own risk mitigation for R11.

## Gap classification

- **Net-new, entirely.** No partial credit anywhere in the schema.

## Phase assignment

**This requirement (REQ031) scopes PRD Phase §17.1's P1 row only: payer & tariff master, patient policy capture & eligibility, OPD cashless/benefit-wallet adjudication, and reimbursement-pack generation.** The P2 scope (IPD pre-authorisation, hospital claim submission/tracking/settlement, NHCX integration, insurance desk cockpit/analytics) and P3 scope (government schemes, payer scorecards, denial analytics) should be written as separate follow-on requirement documents (`REQ0XX`, to be numbered when planning begins for them) once P1 has shipped and been validated against real clinic usage — do not treat the story list below as covering the full module; it deliberately does not.

## Dependencies

- **Requires:** `REQ023`'s bill-splitting mechanism (payer-payable vs. patient-payable) is the foundation the OPD cashless adjudication logic sits on — build the generic split once in billing, and have this module's benefit-wallet logic be one more source of a split, not a second parallel billing engine (this is stated in `REQ023`'s own dependencies section as the reverse relationship). `REQ020`'s encounter/diagnosis fields are needed for the reimbursement-pack's clinical documentation.
- **Blocks:** the P2 follow-on (pre-auth/claims/NHCX) depends on this P1 scope's payer master and consent model existing first.

## User stories

### Epic: Payer and tariff master

**US-INS-01** — As an Insurance Desk Executive, I want to maintain a master of insurers, TPAs, corporates, and government schemes with their empanelment status per branch, so that the org has one source of truth instead of a spreadsheet of contacts.
- PRD refs: FR-INS-01, FR-INS-02, FR-INS-08
- Priority: P1
- Acceptance criteria:
  - Given a payer with an empanelment record per branch, the empanelment's start/end dates and renewal reminder are visible, and a blacklisted/de-empanelled payer is flagged with its effective date so staff don't quote a rate that no longer applies.
  - Given a rate-contract change, the payer master is versioned and audited (matching the tenant-scoped audit pattern already established elsewhere in the codebase), maintainable at org level and overridable per branch.

**US-INS-02** — As an Insurance Desk Executive, I want a payer-specific tariff for services and packages, so that billing applies the contracted rate automatically instead of the standard price.
- PRD refs: FR-INS-03
- Priority: P1
- Acceptance criteria: given a payer's tariff is a 15% discount off standard rate for a service, billing that service to that payer applies the discounted rate, effective-dated correctly if the contract has changed over time.

### Epic: Patient policy and eligibility

**US-INS-03** — As front-desk staff registering a patient, I want to scan their health card and have policy fields pre-fill from OCR, so that manual entry errors on policy number/member ID don't cause a claim to fail later.
- PRD refs: FR-INS-10, FR-INS-11
- Priority: P1
- Acceptance criteria: given a photo of a health card, OCR pre-fills payer, policy number, member ID, and sum insured, with the original image retained against the policy record for later reference.

**US-INS-04** — As front-desk staff, I want to see a patient's cashless-OPD eligibility and applicable co-pay *before* they reach the billing counter, so that there are no surprises at checkout.
- PRD refs: FR-INS-12, FR-INS-14
- Priority: P1
- Acceptance criteria: given a patient with a verified policy, the booking flow and front-desk screen both show a coverage badge (e.g., "Cashless OPD eligible · ₹500 co-pay") before the visit is billed — matching the PRD's own explicit UX requirement that this be visible pre-counter, not discovered at billing.
  - Given no real-time payer API exists for this payer, a manual "verified by" record with a reference number, screenshot, and timestamp satisfies eligibility verification — the manual path is a first-class outcome here, not a degraded one, per this module's design principle above.

### Epic: OPD cashless / benefit-wallet adjudication *(the differentiator)*

**US-INS-05** — As front-desk staff billing a patient with a corporate OPD wallet, I want the bill automatically split into payer-payable and patient-payable using the wallet balance and co-pay rules, so that I never do this calculation by hand.
- PRD refs: FR-INS-20, FR-INS-21
- Priority: P1
- Acceptance criteria (the PRD's own illustrative acceptance example, restated as the test): given a patient with a corporate OPD wallet holding ₹2,000 remaining and a 20% co-pay on consultations, when a ₹800 consultation is billed, then the system shows ₹640 payer-payable and ₹160 patient-payable, collects ₹160 from the patient, and reduces the wallet to ₹1,360 — with no manual calculation by the receptionist, and the split shown to the patient before payment.

**US-INS-06** — As an Insurance Desk Executive, I want a prescription and any diagnostics from the same encounter to auto-attach as OPD-claim supporting documents, so that no one has to re-upload something the system already has.
- PRD refs: FR-INS-24
- Priority: P1
- Acceptance criteria: given a signed prescription (`REQ021`) exists on the encounter being billed, it is automatically attached to the OPD claim record with no separate upload step.

**US-INS-07** — As a patient, I want the receipt to clearly show which items insurance didn't cover and why, so that I'm not confused about an unexpected charge.
- PRD refs: FR-INS-26
- Priority: P1
- Acceptance criteria: every non-eligible line item is explicitly marked on the receipt with its reason (not covered category, exceeded sub-limit, etc.), not silently folded into the patient-payable total.

### Epic: Reimbursement support

**US-INS-08** — As a patient without cashless access, I want a one-click complete claim pack (claim form, bills, receipts, prescriptions, reports) generated and delivered to my portal/WhatsApp, so that I can submit my own reimbursement claim without chasing the clinic for documents.
- PRD refs: FR-INS-63
- Priority: P1
- Acceptance criteria: given a completed visit, the reimbursement pack assembles automatically from existing system records — no manual document-gathering by staff — and delivers via the patient's preferred channel per `REQ025`'s existing delivery infrastructure.

## Data model impact

Following `PRD §14.1`'s abridged model, scoped to this requirement's P1 boundary (tables needed for P2/P3 — `PreAuth`, `PreAuthEvent`, `Claim`, `ClaimDeduction`, `Remittance`, `SchemeCase` — are deliberately **not** included here and should be added when the follow-on P2/P3 requirement is written):

- `Payer`: `id`, `client_org_id`, `name`, `type`, `irdai_no`, `nhcx_participant_id`, `portal_url`, `contacts_json`, `status`.
- `Empanelment`: `id`, `payer_id`, `branch_id`, `empanelment_no`, `valid_from`, `valid_to`, `status`.
- `Tariff`: `id`, `payer_id`, `branch_id|null`, `item_type`, `item_id`, `rate`, `discount_pct`, `effective_from`, `effective_to`.
- `PatientPolicy`: `id`, `patient_id`, `payer_id`, `policy_no`, `member_id`, `corporate_id`, `sum_insured`, `valid_from`, `valid_to`, `priority`, `kyc_docs[]`, `verified_at`, `verified_by`.
- `BenefitWallet`: `id`, `patient_policy_id`, `category`, `limit_amount`, `consumed_amount`, `period_start`, `period_end`.
- `EligibilityCheck`: `id`, `patient_policy_id`, `appointment_id|null`, `channel`, `request_ref`, `response_json`, `at`.

Per `PRD §14.2`'s explicit constraint list: `Tariff` rows are effective-dated and must become immutable once referenced by a submitted claim (not yet applicable at P1 scope, since claim submission is P2, but the effective-dating discipline should be built correctly from the start so the P2 immutability rule has something correct to lock).

## Non-functional notes

- Every new tenant-scoped table here must use the corrected `orgScope()` pattern from `project-plans` F-01 — this module handles financial and, indirectly, clinical data (via attached prescriptions/diagnostics) and should not repeat the cross-tenant read finding in a domain the PRD itself calls out as commercially central.
- `FR-INS-95`: insurance data follows the same RBAC and DPDP consent rules as clinical data; sharing any record with a payer requires a recorded patient authorisation — this is a direct dependency on `REQ034`'s consent model and `REQ015`'s permission enforcement, not a separate access-control system.
- Per `PRD §17`'s own risk R12: market this module as *evidence and control*, never as guaranteed approvals — the payer, not this system, decides speed and outcome. This applies to product copy and support scripts, not just engineering, but the acceptance criteria above should never imply a guaranteed approval outcome in UI text.

## Open questions

- Carried from PRD §19.11/§19.12: whether to pursue direct payer API partnerships as a wedge versus waiting for NHCX maturity, and whether a per-successfully-settled-claim revenue model creates a fee-splitting appearance risk. Both are P2/P3-scope business decisions, logged here for the follow-on requirement's author, not resolved by this P1 scope.
- The Insurance/TPA Desk Executive role (`PRD Appendix A`) needs to exist as a real, enforced role before this module's staff-facing screens can be permission-gated correctly — depends on `REQ015`'s RBAC-enforcement work landing first.
