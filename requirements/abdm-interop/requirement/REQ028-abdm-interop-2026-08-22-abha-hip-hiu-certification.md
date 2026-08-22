---
id: REQ028
type: requirement
feature: abdm-interop
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: null
related: [REQ020, REQ021, REQ027, REQ034]
---

# ABDM/ABHA interoperability: milestone certification M1–M3

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M14 — ABDM & Health Data Interoperability** (`FR-ABDM-01`–`10`), which the PRD explicitly frames as *"a go-to-market gate, not a nice-to-have"* (§1.2, §4.3, §17). Cross-referenced against `project-plans/05-competitive-analysis.md` §2.2 (Eka Care/Bajaj Finserv Health positioning) and Tier 2 recommendation #8.

## Current state vs. PRD ambition

No ABDM integration of any kind exists in the codebase — no ABHA creation flow, no FHIR R4 document generation, no HFR/HPR linkage, no consent-artefact model. This is entirely net-new, and `project-plans/05-competitive-analysis.md` independently flagged it as *"the single largest strategic gap"* in a competitive sense: Eka Care and Bajaj Finserv Health are positioned specifically around ABDM depth, and the PRD's own market analysis (§2, §1.2) argues certification is becoming a hard requirement for any facility tied to government schemes.

This requirement scopes milestones M1–M3 only (ABHA creation, care-context linking as a Health Information Provider, consent-based record fetch as a Health Information User), matching the PRD's own phasing — M4 (NHCX claims integration) belongs to `REQ031` (insurance), not here, since it is a distinct certification track with its own regulatory timeline.

## Gap classification

- **Net-new, entirely.** This is a compliance/certification programme as much as an engineering task — sandbox onboarding, certification review, and progressive milestone sign-off are external dependencies with lead times the engineering team does not control, which is why `project-plans/06-execution-plan.md` P5 Wave B explicitly recommends starting the paperwork in Wave A even though the build lands later.

## Phase assignment

PRD Phase: `FR-ABDM-01`–`09` are **V1 GA (P1)**; `FR-ABDM-10` (DHIS incentive tracking) is **V2 (P2)**. The PRD's own roadmap (§18, Q3–Q4) targets M1–M2 certified by Q3 and M3 by Q4 as explicit exit criteria — this is a hard external dependency, not an internal estimate, and should be started as early as the roadmap allows regardless of when the corresponding feature work lands.

## Dependencies

- **Requires:** `REQ020` (encounters) and `REQ021` (prescriptions) must exist before care-context creation (`FR-ABDM-04`) has anything to link — an ABHA-linked care context without a real encounter/prescription behind it would be a certification artefact with no substance.
- **Blocks:** `REQ031`'s NHCX integration (M4) is a distinct but related certification track that assumes M1–M3 groundwork (HFR/HPR registration, the consent-artefact model) already exists.

## User stories

### Epic: ABHA creation and linking

**US-ABDM-01** — As a patient registering at a facility, I want to create or link my ABHA via Aadhaar or mobile OTP during registration, so that my records can eventually be portable across providers with my consent.
- PRD refs: FR-ABDM-02
- Priority: P1
- Acceptance criteria: given a patient without an ABHA, the registration flow offers Aadhaar-OTP or mobile-OTP creation with a demographic fallback if OTP fails; given an existing ABHA, the patient can link it instead of creating a new one.

**US-ABDM-02** — As front-desk staff, I want a facility QR that a patient can scan to pre-fill their registration from their ABHA profile, so that registration is faster and more accurate than manual entry.
- PRD refs: FR-ABDM-03
- Priority: P1
- Acceptance criteria: given a facility QR provisioned from the org's HFR ID, a patient's scan-and-share produces a pre-filled registration form at the front desk, requiring only confirmation.

### Epic: Care-context linking (HIP)

**US-ABDM-03** — As the system, I want every OPD visit, prescription, and lab report to create a linked ABDM care context, so that a patient's consented history is complete, not partial.
- PRD refs: FR-ABDM-04, FR-ABDM-05
- Priority: P1
- Acceptance criteria: given a signed encounter/prescription/lab report for an ABHA-linked patient, a FHIR R4 bundle using India profiles is generated and linked as a care context; the linking token is propagated consistently across OPD, pharmacy, and lab modules so every care context attaches to the same ABHA, not fragmented per module.

### Epic: Consent-based fetch (HIU)

**US-ABDM-04** — As a clinician treating a patient who has records at another ABDM-linked facility, I want to request consent-based access to their history, so that I'm not treating blind when the patient has relevant prior care elsewhere.
- PRD refs: FR-ABDM-07
- Priority: P1
- Acceptance criteria: given a consent request is granted by the patient, the requested record is fetched and displayed; given consent expires or is revoked, access stops immediately, and the consent ledger (visible to both Org Admin and patient) reflects the current state accurately.

### Epic: Facility and professional registration

**US-ABDM-05** — As an Org Admin onboarding a new branch, I want assistance registering the facility on HFR and linking clinicians to HPR, so that ABDM participation doesn't require a separate manual process outside the product.
- PRD refs: FR-ABDM-06
- Priority: P1
- Acceptance criteria: the onboarding wizard (`REQ014`) offers HFR/HPR registration assist as a step, not a separate undocumented process.

### Epic: Key custody and certification transparency

**US-ABDM-06** — As an Org Admin at a facility with strict data-governance requirements, I want the option to hold my own encryption keys for ABDM-linked documents, so that key custody isn't solely vendor-controlled — per ABDM's own guidance that vendor-managed-only keys are an anti-pattern.
- PRD refs: FR-ABDM-08
- Priority: P1
- Acceptance criteria: a key-custody model exists that allows the healthcare entity to hold its own keys for ABDM-relevant documents, distinct from the platform's own general encryption-at-rest scheme.

**US-ABDM-07** — As a prospective buyer evaluating the product, I want to see exactly which ABDM milestones are certified and when, so that I can trust the claim rather than take "ABDM-ready" marketing at face value.
- PRD refs: FR-ABDM-09
- Priority: P1
- Acceptance criteria: certification status per milestone, with dates, is displayed in-product and matches what's published on the marketing site — never a claim ahead of actual certification, per the PRD's own explicit warning (§3.2) that buyers are being coached to reject unverified "ABDM-ready" claims.

## Data model impact

- New `Consents` table: `id`, `patient_id`, `purpose`, `scope`, `granted_at`, `expires_at`, `revoked_at`, `artefact_ref` — shared infrastructure with `REQ034`'s DPDP consent work; this should be one consent model serving both ABDM and DPDP purposes, not two.
- New `CareContexts` table: `id`, `patient_id`, `abha_number`, `encounter_id`, `type`, `linked_at`, `hip_id`.
- `Patients` gains `abha_number`, `abha_address`.
- `Clinics` gains `hfr_facility_id` (already scoped in `REQ014`).

## Non-functional notes

Sandbox integration and certification review are external, gated processes with lead times outside engineering's control — do not schedule internal work assuming certification timing matches development completion. Treat certification as a release gate the way `PRD §18`'s roadmap does explicitly.

## Open questions

- Carried from PRD §19.9: does the organization register as a DPDP Consent Manager itself, or only integrate with third-party ones once that framework is operational — directly relevant to the shared `Consents` model above. Log in `context/open-questions.md` when `REQ034` and this requirement both enter planning.
