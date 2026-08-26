---
id: REQ027
type: requirement
feature: patient-portal
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: REQ018
related: [REQ018, REQ021, REQ028]
---

# Patient PWA: records, payments, family profiles, and ABHA management

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M13 — Patient Portal / App** (`FR-PAT-01`–`FR-PAT-09`). Cross-referenced against `project-plans/analysis/01-codebase-analysis.md` §3.2 (`pages/patient/*`) and `project-plans/analysis/02-findings-register.md` F-18.

## Current state vs. PRD ambition

`pages/patient/Appointments.jsx` and `pages/patient/Profile.jsx` are both named in `project-plans` F-18 as pages rendering fabricated data with no GraphQL call, despite the `appointments` and `account`/`patients` backend modules they should be wired to already existing and being self-scoped correctly (`patients.service.ts`'s `selfScope()`). This is the same pattern as `REQ020`'s clinical-records finding: the frontend investment exists as a shell, and the fix for the existing pages is largely a wiring exercise, not new backend design — that wiring work belongs to `project-plans/analysis/06-execution-plan.md` P2 and should not be re-scoped here as if it were net-new.

What this requirement scopes is the genuinely new capability the PRD asks for beyond wiring the existing pages: family profiles (shared with `REQ018`'s dependant model), ABHA account management, PWA installability/offline basics, refill requests, and multi-language UI.

## Gap classification

- **Wiring fix, not new build (tracked in `project-plans`, referenced here):** `pages/patient/Appointments.jsx`, `pages/patient/Profile.jsx` — real backend exists, frontend doesn't call it.
- **Extend existing:** records/payments views should wire to the already-real `appointments`/`account`/`appointment-payments` modules.
- **Net-new:** installable PWA with offline-capable shell; ABHA account management UI (depends on `REQ028`); refill requests; multi-language UI framework (no i18n exists in the frontend at all today, per `project-plans/analysis/05-competitive-analysis.md` Tier 3 item 14).

## Phase assignment

PRD Phase: `FR-PAT-01`–`05` are **MVP (P0)**; `06` (ABHA), `07` (messaging/refill), `08` (multi-language) are **V1 GA (P1)**; `09` (NPS) is **V2 (P2)**.

## Dependencies

- **Requires:** `REQ018`'s family/dependant model (`PatientRelation`) is shared infrastructure, not duplicated here; `REQ028` (ABDM) for `FR-PAT-06`; `REQ021` for viewing/downloading prescriptions.
- **Blocks:** none downstream.

## User stories

### Epic: Fix the existing fabricated pages (tracking reference)

**US-PAT-00** — As a patient, I want my appointments and profile pages to show my real data, not a hardcoded mock, so that the portal is trustworthy at all.
- PRD refs: n/a — closes `project-plans` F-18 for these two specific pages
- Priority: P0
- Acceptance criteria: `pages/patient/Appointments.jsx` and `pages/patient/Profile.jsx` are wired to the real, already-self-scoped `appointments` and `account`/`patients` queries, matching each page's existing contract per the project's Hard Rule 7. This story is tracked in `project-plans/analysis/06-execution-plan.md` P2 and is listed here only for traceability against the PRD's own `FR-PAT` numbering.

### Epic: Family profiles

**US-PAT-01** — As a patient managing my family's healthcare, I want to switch between my own and my dependants' profiles from one login, so that I don't juggle multiple accounts.
- PRD refs: FR-PAT-05
- Priority: P0
- Acceptance criteria: given dependants are linked (per `REQ018`'s `PatientRelation`), a profile switcher shows all linked profiles and each carries its own consent settings (`REQ034`).

### Epic: Records and payments

**US-PAT-02** — As a patient, I want to download my prescriptions, invoices, and visit summaries as PDFs, so that I have my own copy independent of the clinic.
- PRD refs: FR-PAT-03, FR-PAT-04
- Priority: P0
- Acceptance criteria: every record type is downloadable in a format matching its print template (`REQ021`'s Rx layout, `REQ023`'s GST invoice layout) — not a plain-text summary that loses the compliant formatting.

### Epic: ABHA and PWA

**US-PAT-03** — As a patient, I want to create or link my ABHA from the portal and manage which facilities have consent to see my records, so that I control my own health data sharing.
- PRD refs: FR-PAT-06
- Priority: P1
- Acceptance criteria: depends on `REQ028`; scoped fully there, referenced here as the portal-side surface.

**US-PAT-04** — As a patient on a low-end Android phone, I want the portal installable as a PWA that works reasonably even on a spotty connection, so that data cost and device limitations don't lock me out.
- PRD refs: FR-PAT-01
- Priority: P0
- Acceptance criteria: the PWA is installable, meets the PRD's low-bandwidth NFR (`§13`, "lightweight UI mode under 300 KB initial payload for tier-3 connectivity"), and functions on a 2 GB RAM device budget.

### Epic: Refills and messaging

**US-PAT-05** — As a patient nearing the end of a medication course, I want to request a refill directly from my prescription history, so that I don't need a fresh consultation for a routine continuation.
- PRD refs: FR-PAT-07
- Priority: P1
- Acceptance criteria: a refill request creates a task visible to the prescribing clinician (or the org's configured refill-approval role), not an automatic re-dispense.

### Epic: Localisation

**US-PAT-06** — As a patient who is more comfortable in Hindi or a regional language, I want the portal UI itself (not just prescription instructions) in that language, so that the whole experience — not just the Rx — is usable.
- PRD refs: FR-PAT-08
- Priority: P1
- Acceptance criteria: the portal supports English + Hindi + at least 4 regional languages at GA, per the PRD's own minimum; this requires introducing an i18n framework to the frontend, which does not exist today.

## Data model impact

No new core entities beyond what `REQ018` (family/dependant) and `REQ028` (ABHA) already define. This requirement is primarily a frontend/UX scope plus an i18n framework decision.

## Non-functional notes

The low-bandwidth and offline requirements here are shared with `REQ019`'s front-desk offline-resilience need — consider whether a common offline/sync strategy serves both rather than solving it twice for two different personas.

## Open questions

- PRD §19.8: which 6 regional languages at GA, based on target-city sales priority — a business decision, not an engineering one; log in `context/open-questions.md` when this requirement enters planning.
