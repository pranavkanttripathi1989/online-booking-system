---
id: REQ034
type: requirement
feature: compliance-dpdp
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: null
related: [REQ028, REQ012]
---

# DPDP Act 2023 compliance: consent, data-principal rights, retention, and breach response

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §12.1 (`FR-DPDP-01`–`09`) and §12.2's clinical/sectoral requirements not already covered by another requirement (`FR-REG-05`, `06`). Cross-referenced against `project-plans/03-security-and-tenancy-audit.md` §7 and `REQ012` (org-wide security settings).

## Current state vs. PRD ambition

`project-plans/03-security-and-tenancy-audit.md` §7 already assessed this precisely: encryption at rest for credentials exists (`secrets.ts`, AES-256-GCM), a self-service `myDataExport` query exists as a partial data-portability start, org-level retention settings are persisted, and audit logging exists but is shallow (`project-plans` F-10 — resolved separately under that finding, not duplicated here). What's missing entirely: consent artefacts with purpose limitation, a documented retention/erasure job, breach-notification tooling, a processor/sub-processor register, and a formal Data Processing Agreement as part of the standard tenant contract.

The PRD's timeline (§1.2, §12.1) is a hard external clock, not a target the team sets itself: DPDP Rules were notified 13 November 2025; enforcement and Consent Manager registration activate 13 November 2026; full compliance is due 13 May 2027. `PRD §17` risk R3 states plainly: *"DPDP enforcement arrives before we are audit-ready → deal blocker in enterprise procurement; penalty exposure for tenants."*

## Gap classification

- **Extend existing:** `myDataExport` becomes the foundation for the formal data-principal-rights "access" workflow; existing per-org retention settings become the basis for `FR-DPDP-07`'s automated purge job.
- **Net-new, entirely:** granular purpose-specific consent capture with versioning and withdrawal; correction/erasure/grievance/nomination rights workflows with SLA timers; standalone itemised privacy notices; breach detection/notification runbook; children's-data verifiable-parental-consent path; the standard Data Processing Agreement contract artefact.
- **Shared infrastructure, not duplicated:** the `Consents` model this requirement needs is the same one `REQ028` (ABDM) needs for its own consent-artefact handling — build one consent model serving both purposes, per that requirement's own cross-reference back to this one.

## Phase assignment

PRD Phase: `FR-DPDP-01`, `02`, `03`, `05`, `06` are **MVP (P0)** — the PRD tags these P0 despite DPDP enforcement being a future date, because retrofitting consent capture onto years of accumulated data is far more expensive than building it in from day one. `FR-DPDP-04`, `07`, `08` are **V1 GA (P1)**; `FR-DPDP-09` (Consent Manager interop) is **V2 (P2)**, pending the framework itself becoming operational.

## Dependencies

- **Requires:** none upstream — this is foundational and should be built early precisely because of the sunk-cost argument above.
- **Blocks:** `REQ028` shares its consent model with this requirement — sequence them together, not independently.

## User stories

### Epic: Consent capture

**US-DPDP-01** — As a patient, I want to give separate, specific consent for treatment, communications, and marketing — not one bundled checkbox — so that agreeing to be treated doesn't silently also enrol me in marketing messages.
- PRD refs: FR-DPDP-03
- Priority: P0
- Acceptance criteria:
  - Given the registration or consent-update flow, each purpose (treatment/communications/marketing/record-sharing) is a separate, non-pre-ticked toggle; every consent action is versioned (which notice text was shown, when) and withdrawable independently per purpose.
  - Given a patient withdraws marketing consent, marketing communications stop immediately while treatment-related communications (e.g., appointment reminders) continue unaffected.

**US-DPDP-02** — As a patient or staff user, I want a standalone, plain-language privacy notice separate from the Terms of Service, so that I can actually understand what happens to my data without reading a legal contract.
- PRD refs: FR-DPDP-02
- Priority: P0
- Acceptance criteria: the privacy notice is a distinct, itemised document (not a section buried in Terms), shown at the point consent is captured, for both patients and tenant staff users.

### Epic: Data-principal rights

**US-DPDP-03** — As a patient, I want to request access to, correction of, or erasure of my data, and have a clear timeline for the response, so that my rights aren't a theoretical entitlement with no actual process behind them.
- PRD refs: FR-DPDP-04
- Priority: P1
- Acceptance criteria: each rights request type has an SLA timer, is logged for audit, and — for erasure specifically — respects any legal-hold override (e.g., an active medico-legal record that cannot yet be deleted) with a clear explanation to the requester rather than a silent refusal.

**US-DPDP-04** — As an Org Admin, I want to see a full disclosure log of what patient data was shared with any third party (a payer, a lab, an ABDM consent grant), so that I can answer a patient's "who has seen my data" question definitively.
- PRD refs: implicit in FR-DPDP-03/§17 FR-REG-07b
- Priority: P1
- Acceptance criteria: every disclosure event (insurance claim sharing, ABDM consent-based fetch, any export) is logged with what was shared, to whom, and when — shared infrastructure with `REQ031`'s insurance-disclosure requirement and `REQ028`'s ABDM consent ledger.

### Epic: Security, retention, and breach response

**US-DPDP-05** — As the system, I want reasonable security safeguards — encryption at rest and in transit, access logging, monitoring, backups — extended contractually to sub-processors, so that data protection doesn't stop at our own infrastructure boundary.
- PRD refs: FR-DPDP-05
- Priority: P0
- Acceptance criteria: this closes the encryption/access-logging half of `project-plans`'s existing findings (already largely satisfied per that audit) and adds the sub-processor contractual extension, which is a legal/procurement artefact, not code.

**US-DPDP-06** — As an Org Admin, I want a documented retention schedule per data class with automated purge, so that data isn't kept indefinitely by default and isn't destroyed prematurely for records under legal hold.
- PRD refs: FR-DPDP-07
- Priority: P1
- Acceptance criteria: given a retention period is configured per data class (e.g., 7 years for clinical records per medico-legal guidance, per `PRD FR-REG-05`), an automated job purges data past that period unless a legal hold is active on it.

**US-DPDP-07** — As the platform operator, I want a breach-detection and notification runbook with templates ready in advance, so that a real incident is handled within statutory timelines instead of improvised under pressure.
- PRD refs: FR-DPDP-06
- Priority: P0
- Acceptance criteria: a documented runbook exists covering detection, Board notification, affected-individual notification, and a follow-up report — this is primarily a process/template deliverable, with the technical detection hooks (anomalous access alerting) as its supporting engineering component.

### Epic: Minors' data

**US-DPDP-08** — As a parent registering a child patient, I want a verifiable parental-consent path, and I want assurance my child is never subject to behavioural advertising or tracking, so that minors' data is handled to a higher standard than adults'.
- PRD refs: FR-DPDP-08
- Priority: P1
- Acceptance criteria: a patient record flagged as a minor requires a linked, verified parental consent before treatment data is recorded, and is excluded from any marketing-segmentation or tracking mechanism by construction, not by policy alone.

## Data model impact

- `Consents` table (shared with `REQ028`): `id`, `patient_id`, `purpose`, `scope`, `granted_at`, `expires_at`, `revoked_at`, `artefact_ref`.
- New `DisclosureLog` table: `id`, `patient_id`, `recipient_type`, `recipient_id`, `data_shared_json`, `authorized_by_consent_id`, `at`.
- New `RightsRequests` table: `id`, `patient_id`, `type` (`access|correction|erasure|grievance|nomination`), `status`, `sla_due_at`, `resolved_at`.
- New `RetentionPolicies` table per `client_org_id` per data class, feeding the automated purge job.

## Non-functional notes

The consent model here and in `REQ028` must be the same table, not two — a patient should not need to understand that "ABDM consent" and "DPDP consent" are different systems when conceptually they're both "who can see my data, for what, until when."

## Open questions

- Carried from PRD §19.9 (Consent Manager registration — shared with `REQ028`) and §19.13 (90-day post-churn retention default needs legal review against medical-record retention expectations, which may require a *longer* minimum retention than 90 days for clinical data specifically, in tension with a patient's own erasure request under this same requirement — flag this tension explicitly for legal review before implementation, not resolved here).
