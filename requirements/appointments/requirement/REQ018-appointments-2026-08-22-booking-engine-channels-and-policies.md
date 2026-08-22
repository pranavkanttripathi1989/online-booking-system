---
id: REQ018
type: requirement
feature: appointments
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: REQ017
related: [REQ017, REQ016]
---

# Booking engine: channels, dedup, family profiles, and no-show policy

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M5 — Booking Engine** (`FR-BOOK-01`–`FR-BOOK-13`). Cross-referenced against `backend/src/appointments` (368 lines, 14 tests) and `frontend/src/components/BookingWizard`.

## Current state vs. PRD ambition

The core booking mutation already exists and is reasonably solid: `createAppointment` validates the clinic belongs to the caller's org (the Hard Rule 6 fix already applied here), checks slot availability, and the appointment state machine (`requested → confirmed → checked_in → in_consultation → completed`, branching to `cancelled`/`no_show`/`rescheduled`) matches the PRD's own state machine (`PRD §14.3`, Appendix B) almost exactly — this is good alignment achieved independently, worth preserving rather than redesigning.

Gaps against the PRD:

1. **Patient de-duplication is thin.** `FR-BOOK-02` wants dedup by phone + name + DOB with merge tooling and a full audit trail. Today, `Patients` has no dedup logic at all on create — two bookings with the same phone number create two separate patient rows.
2. **No family/dependant model.** `FR-BOOK-03` (one phone number managing multiple patient profiles with relationship labels) has no equivalent — `PatientRelation` doesn't exist.
3. **Booking policies exist for cancellation, not for prepayment/reschedule limits.** The `cancellation-rules` feature already models per-clinic priority-ordered rules for cancellation fees; `FR-BOOK-04` additionally wants prepayment-required/optional/none and a reschedule limit per service, which is a different axis of policy on the same service entity.
4. **No embeddable booking widget or short-link/QR** (`FR-BOOK-10`) — the booking wizard exists as an in-app route only.
5. **No configurable intake-form builder** (`FR-BOOK-11`) — reason-for-visit is free text; there's no per-service custom field configuration.
6. **No group/camp bulk-booking** (`FR-BOOK-12`) — P2 in the PRD, no existing scaffolding, not urgent.
7. **No-show handling is manual.** `FR-BOOK-13` wants auto-mark-no-show after a grace period and an escalating future-prepay requirement; today `no_show` is a status a human sets.

What already works and should not be re-scoped here: reminder ladder timing exists in spirit via `notification-preferences` (`REQ008`/`REQ025` extends this); reschedule/cancel by patient and staff already exists with reason capture; walk-in registration exists.

## Gap classification

- **Extend existing:** booking-policy fields (prepay/reschedule-limit) on `Services`; reminder-ladder timing to match the PRD's exact T-24h/T-2h/post-visit cadence (currently less prescriptive); no-show auto-marking as a scheduled job.
- **Net-new:** patient dedup + merge tooling; family/dependant profiles; embeddable widget + short-link/QR; intake form builder; group/camp booking.
- **Already satisfied:** the core appointment state machine, staff-side reschedule/cancel, walk-in token issuance (pending `REQ017`'s session mode for the "within 2 interactions" requirement to be measurable).

## Phase assignment

PRD Phase: `FR-BOOK-01`–`07`, `09`, `10` are **MVP (P0)**; `FR-BOOK-08` (teleconsult booking — depends on `REQ026`), `11`, `13` are **V1 GA (P1)**; `FR-BOOK-12` (group/camp) is **V2 (P2)**.

## Dependencies

- **Requires:** `REQ017` for session/token-mode booking to be offered as a channel; `REQ016`'s `Package` entity for package-based booking flows.
- **Blocks:** `REQ019` (queue) needs the walk-in/booked interleaving ratio this module's policy config sets.

## User stories

### Epic: Patient identity

**US-BOOK-01** — As front-desk staff booking a returning patient, I want the system to find their existing record by phone number rather than create a duplicate, so that their history isn't fragmented across two patient rows.
- PRD refs: FR-BOOK-02
- Priority: P0
- Acceptance criteria:
  - Given a phone number already on file, when a new booking is entered with the same phone and a matching or near-matching name/DOB, then the existing patient record is offered before a new one is created.
  - Given two patient records are later identified as duplicates, when an authorised user merges them, then every appointment/prescription/invoice from both moves to the surviving record, and the merge itself is written to an audit trail that can be inspected later.

**US-BOOK-02** — As a parent booking for my children under my own phone number, I want to manage multiple patient profiles from one login with a relationship label, so that I don't need a separate account per family member.
- PRD refs: FR-BOOK-03
- Priority: P0
- Acceptance criteria:
  - Given one phone-verified login, when I add a dependant with relationship "child," then I can book, view records, and pay for that dependant, and the dependant's own consent/visibility rules apply per `REQ034`.

### Epic: Booking policy

**US-BOOK-03** — As an Org Admin, I want to require prepayment for a specific service (e.g., a first teleconsult) while leaving another service pay-at-counter, so that no-show-prone services are protected without inconveniencing every patient.
- PRD refs: FR-BOOK-04
- Priority: P0
- Acceptance criteria:
  - Given a service configured "prepayment required," when a patient attempts to book without paying, then the booking does not confirm until payment succeeds; given a service configured "none," the booking confirms immediately.

**US-BOOK-04** — As the system, I want to auto-mark an appointment as a no-show after a configurable grace period, so that staff don't have to remember to close out abandoned bookings, and so future prepay requirements can respond to a patient's no-show history.
- PRD refs: FR-BOOK-13
- Priority: P1
- Acceptance criteria:
  - Given an appointment past its grace period with no check-in, when the grace period elapses, then it transitions to `no_show` automatically, and a repeat-no-show patient is flagged for mandatory prepayment on their next booking per the org's configured threshold.

### Epic: Distribution channels

**US-BOOK-05** — As an Org Admin, I want an embeddable booking widget for our own website and a shareable short link/QR, so that patients can book without navigating to our platform's domain.
- PRD refs: FR-BOOK-10
- Priority: P0
- Acceptance criteria:
  - Given the widget snippet is embedded on an external site, when a patient completes a booking through it, then the appointment is created identically to one made on the platform's own booking page, correctly attributed to that org/branch.

### Epic: Intake customization

**US-BOOK-06** — As an Org Admin, I want to configure custom intake fields per service (e.g., "current medications" for a first consult), so that the clinician has relevant context before the patient arrives.
- PRD refs: FR-BOOK-11
- Priority: P1
- Acceptance criteria:
  - Given a service with 3 custom fields configured, when a patient books that service, then those 3 fields appear in the booking flow and their answers are visible in the resulting encounter (`REQ020`).

## Data model impact

- `Patients` gains dedup-matching support (a normalized-phone index) and a `PatientMerge` audit table: `id`, `surviving_patient_id`, `merged_patient_id`, `merged_by`, `merged_at`.
- New `PatientRelation` table: `id`, `patient_id`, `related_patient_id`, `relation`.
- `Services` gains `prepayment_policy` (`required|optional|none`), `reschedule_limit`, `no_show_grace_minutes`.
- New `IntakeFormFields` table scoped per service: `id`, `service_id`, `label`, `field_type`, `required`.
- New `BookingWidgetConfig` per org/branch for the embeddable widget's allowed origins and short-link slug.

## Non-functional notes

Patient merge is an irreversible, high-blast-radius operation touching clinical records — it must be permission-gated tightly (not available to Front Desk by default per the PRD's own permission matrix) and every merge must be reversible in principle via the audit trail even if not via a one-click undo.

## Open questions

None raised in PRD §19 specific to this module.
