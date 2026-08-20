---
id: REQ003
type: requirement
feature: semble-competitive-gap
created: 2026-08-17
updated: 2026-08-17
status: approved
parent: null
related: []
---

# Competitive Gap Analysis & Custom Role/Access-Group Requirements

**Prepared as:** a senior technical business analyst's requirements document — full competitor analysis + current-codebase analysis + a phase-wise roadmap ordered by business priority, not technical convenience.
**Competitor analyzed:** [Semble](https://www.semble.io) — a UK private-practice management platform, the closest direct competitor to MediBook found so far. Same buyer (independent clinics and small practice groups), same core job (booking + patient records + billing), but Semble goes considerably deeper into clinical documentation than MediBook does today.
**Methodology:** the root docs index (`docs.semble.io/docs/`) returns HTTP 403 (bot-protected), and Semble's Queries/Mutations index pages use client-side pagination ("Load more") that a static fetch cannot trigger — my own `WebFetch` passes against those two index pages were confirmed **incomplete** (missed entries past the first batch, notably the entire patient-merge mutation pair). The complete, authoritative versions of both index pages were supplied directly by the user as full-page screenshots and are the source of truth for the query/mutation inventory below, superseding my earlier partial fetches. Object-level field detail (18 objects) still comes from directly fetching Semble's individual API object reference pages one at a time: `User`, `Patient`, `Booking`, `Invoice`, `Product`, `Task`, `Consultation`, `Letter`, `ClinicalPathway`, `Label`, `Practice`, `PatientRelationship`, `Contact`, `Availability`, `PatientDocument`, `UserAccessGroup`, `Episode`, `Journey` (nested on `Booking` — full 4-field set confirmed: `arrived`/`consultation`/`departed`/`dna`). Several further guessed object-page URLs (`Webhook`, `PriceRule`, `MergeRecord` dedicated pages) did not resolve — noted honestly rather than fabricated; those operations' existence and one-line descriptions are still confirmed via the mutation/query index screenshots. Sources: [Semble API docs](https://docs.semble.io/docs/); general feature confirmation from [Appvizer](https://www.appvizer.com/health/medical-practice/semble) and [Capterra](https://www.capterra.com/p/181314/Semble/).
**Scope note:** this is a requirements document only — no code or schema changes are made in Part 2 of this document. Part 1's schema fix was already made and validated in an earlier session (noted as done, not proposed).

---

## Executive summary

**MediBook today is a booking/scheduling + admin system. Semble is a full clinical practice-management platform with EHR-lite depth.** Semble's public API surface — confirmed complete via full-page screenshots of both index pages — spans **~95 distinct write operations** and **~65 read queries** across patient records, clinical documentation, a multi-layered pricing engine, in-clinic payment terminals, data-quality tooling (duplicate-record merging), and webhooks/integrations — categories where MediBook's 34-model schema currently has, in most cases, **zero** equivalent. This isn't a list of small feature misses; it's a different product category that happens to compete for the same buyer. The roadmap in this document is deliberately sequenced so MediBook closes the highest-business-risk gaps first without trying to become a full EHR in one leap.

---

## Part 1 — Custom Roles & Access Groups

### 1.1 The business need

You (org admin) want the ability to create new roles beyond the fixed six (admin/super_admin/manager/clinician/staff/patient) — e.g., "Billing Specialist," "Front Desk Lead," "Senior Physiotherapist" — each with its own hand-picked set of permissions, created from the admin portal without engineering involvement.

### 1.2 Competitive validation (now with confirmed write-operations, not just read fields)

**Semble's access model is two-layered and it's more deeply built than a first read suggested:**
- `User.role`: a small **static** enum — `user | manager | practitioner`.
- `User.accessGroups`: an unlimited, admin-defined list of `UserAccessGroup` objects layered on top — the actual custom-permission mechanism.
- **`Practice.accessGroups`**: access groups are configured **at the practice level** as a first-class setting, alongside `paymentTypes`, `appointmentTypes`, and `groupTypes` — i.e., "manage your access groups" is treated as core practice configuration, not a buried admin toggle.
- **Per-patient-record access control is real and mutable**, not just a read-only field: the mutation index includes `addPatientAccessGroup` / `removePatientAccessGroup` as first-class operations, confirming a specific patient's visibility can be scoped to specific groups (e.g., a safeguarding case restricted to a named subset of staff) — this is an *operational* feature in Semble, not a theoretical data model.

**Zendesk** (the clearest documented UX pattern for this feature, non-healthcare) — [Zendesk custom roles](https://support.zendesk.com/hc/en-us/articles/4408882153882-Creating-custom-roles-and-assigning-agents): clone-from-existing-role or start fresh, name + description, permission checkbox matrix grouped by category, delegatable "manage custom roles" permission, no self-escalation, admin roles untouchable by non-admins.

**athenahealth** ties permissions to the *job*, not the individual, specifically so coverage during staff absence works.

### 1.3 Current code analysis

- `schema.prisma` already has the right primitives: `Permissions` (`resource` + `action`), `RolePermissions` (join table), `UserRoles` (the actual role entity). **This was clearly designed with custom roles in mind, just never finished.**
- `frontend/src/pages/admin/Roles.jsx` **only lets you set a role's name/description/active-flag** — no permission-assignment UI at all, nothing wired to `Permissions`/`RolePermissions`.
- **Critical gap found and already fixed this session**: `UserRoles.name` was `@unique` globally with no tenant scoping. Fixed: added `client_org_id` (nullable — null means a platform-wide system role, set means one org's custom role) and `is_system` (protects the 6 seeded roles), composite unique on `(client_org_id, name)`.
- **Standing constraint, not yet at risk but must stay true**: roles are correctly modeled as a DB table everywhere, never a fixed enum. The moment someone "cleans up" the role list into a TypeScript/GraphQL enum, custom role creation becomes structurally impossible again.
- **New finding this pass**: MediBook has no equivalent of Semble's *per-patient* access-group scoping at all — worth flagging as a distinct, later-phase feature (§2.7 below), separate from role-level access.

### 1.4 Requirements

1. **Permission taxonomy**: define the canonical `resource` list (appointments, patients, clinicians, billing, roles, settings, reviews, messages, …) and `action` list (view/create/edit/delete/export) up front.
2. **Role creation flow**: name + description, optional "clone from existing role," then a permission matrix grouped by category.
3. **Delegation**: "manage roles" is itself a grantable permission, not hardcoded to `admin`/`super_admin`.
4. **Guardrails**: no self-escalation via role creation; `is_system` roles are viewable/assignable but not editable/deletable from the portal; deleting a role with assigned users is blocked or forces reassignment.
5. **Per-record (patient) access groups** — confirmed by Semble's live mutations as a real, not hypothetical, feature. Sequence as a later phase (§2.7), not Phase 1.
6. **Audit**: every role/permission change writes to `AuditLogs` (already modeled).

---

## Part 2 — Full Semble Competitive Gap Analysis

### 2.1 New architectural finding: billing party is a separate entity from the patient

Semble models a **`Contact`** object distinct from `Patient`: an administrative/billing entity with `isSelfPayContract`, `isPayor`, `invoiceRecipient`, `billingFrequency`, `billingDetails`, and — notably — a `parentContact` field enabling **hierarchical billing groups** (e.g. a corporate account or family group as the root contact, with individual patients billed up to it). A `Contact` can also carry a `medicalSpecialty` and `company` affiliation, meaning the same entity type covers both "a person who pays for someone else's care" and "a referring clinician/organization."

**Why this matters for MediBook specifically:** the India-market decisions already made (Razorpay, GST invoicing) assume the patient is always the payor. That's frequently false in practice — a parent pays for a child, an employer pays for a corporate health-checkup package, a TPA/insurer pays on a patient's behalf. Today, `PatientRelationship` (already flagged as missing, §2.1 Patients table) covers the *clinical* relationship (who's related to whom); `Contact` covers the *financial* one (who actually gets billed) — these are two distinct gaps, not one. Recommend modeling both, since a "family relationship" and "who pays the invoice" don't have to be the same fact (a grown child might be the emergency contact but not the payor, for instance).

#### Users / Clinicians

| Semble field | Purpose | MediBook today |
|---|---|---|
| `qualifications`, `registration` | Professional credentials, license/registration number | **Missing.** `Clinicians` has no equivalent field at all. |
| `medicalSpecialties` (plural list) | A practitioner can hold multiple specialties | `clinician_type` is a single free-text field, one specialty only |
| `isLocum`, `locumFor`, `locumStartDate`, `locumEndDate` | Temporary covering-clinician arrangements, with the supervising user referenced | **Missing entirely.** High relevance — Indian clinics have frequent staff rotation/covering-doctor arrangements |
| `healthcodeIdentifier` | Provider number used specifically for insurance/claim submission | Missing (ties to the Invoice-level `doctorHealthcodeIdentifier` gap below too) |
| `pronouns` | Inclusive design | Missing |
| `siretNumber`, `assuranceMaladieNumber` | France-specific compliance fields directly on the User record | Validates MediBook's own approach of adding India-specific fields (GST, PAN, telemedicine registration number) directly onto core models rather than a generic "extra_data" blob |

#### Patients

| Semble field | Purpose | MediBook today |
|---|---|---|
| `communicationPreferences` | How the patient wants to be contacted (email/SMS/etc.) | **Missing** — and this doubles as a DPDP Act consent-tracking requirement, not just UX |
| `customAttributes` (+ `addPatientAttribute`/`updatePatientAttribute`/`removePatientAttribute` mutations) | Clinic-defined custom fields per patient, no schema migration needed per field | Missing |
| `relatedAccounts` / `PatientRelationship` object (+ `addPatientRelationship` etc.) — has a typed `relationshipType` enum, a custom label for "OTHER," and its own `contactDetails` | Family/guardian/emergency-contact linking | **Missing entirely.** Routine scenario in Indian clinics: a parent/guardian booking and paying for a child or elderly relative, with no mechanism today |
| `accessGroups` on Patient (+ mutations) | Per-record access restriction | Missing (see §1.4.5) |
| `labels` (+ `addPatientLabel`/`removePatientLabel`) | Free-form categorization/tagging | Missing |
| `onHold`, `archived`/`archivedInfo` (+ `archivePatient`/`unarchivePatient` mutations) | Distinct lifecycle states — `onHold` blocks new bookings (e.g. unpaid balance, safeguarding flag) without being a full archive | MediBook only has a blunt `is_deleted` boolean — no intermediate "blocked but not gone" state |
| `patientDocuments`, `documentsSharedWithPatient`, `sharingToken` (+ `createPatientDocument` mutation) | Upload/attach files to a patient record, securely shareable | **Missing entirely** — no Documents model of any kind in `schema.prisma` |
| `numbers` / `PatientNumber` (+ `addPatientNumber`/`createPatientNumber`/`updatePatientNumber`/**`updatePatientNumberDefinition`**) | Multiple practice-specific patient ID schemes (e.g. an insurance number, an NHS-equivalent number) — and notably, the *definition* of what number types exist is itself editable, meaning clinics configure their own ID schemes | Missing |
| `membershipName`, `membershipStartDateFormatted` (+ `addPatientMembership`/`removePatientMembership`) | Patient-level membership/subscription plans (e.g. a monthly wellness membership), distinct from `SubscriptionPlans` (which is the *tenant's* SaaS plan, not the patient's) | Missing — a real product opportunity, not just a data gap: recurring patient memberships are a monetization lever MediBook doesn't have at all |
| `ins`, `birthName`/`birthNames` | France-specific identity-certification fields | Not directly relevant to India, but confirms the pattern of country-specific identity fields living directly on Patient |
| `createMergeRecord`/`updateMergeRecord` mutations (confirmed live in Semble's Mutations index; no corresponding `merge`/`mergeRecord` query exists — write-only, run-once operations) | **Duplicate patient/contact record merging** — a dedicated, governed operation for consolidating two records created for the same real person (a routine front-desk error: patient books online with a slightly different spelling/phone number and a duplicate record is created) | **Missing entirely, and no equivalent is even possible today** — MediBook has no `is_deleted`-aware merge path, so duplicate patients silently fragment a person's booking/clinical/billing history across two rows. Field-level detail on `MergeRecord`'s arguments (which record wins, how conflicting fields are reconciled, what happens to bookings/invoices tied to the losing record) could not be retrieved via automated fetch — Semble's dedicated object page for it did not resolve to real content — so treat this as a confirmed-to-exist, not-yet-fully-specified requirement: scope the actual merge semantics (survivor selection, foreign-key repointing for Bookings/Invoices/Consultations, audit trail of the merge itself) during implementation planning, not now. |
| `patientCommunication`/`patientCommunications` queries — distinct object from `communicationPreferences` | A **log/history** of communications actually sent to a patient (confirmations, reminders, marketing), separate from the preference *settings* that control whether they're sent | Missing — MediBook has no equivalent of either the preference *or* the log; worth building them as two distinct concerns (a settings row vs. an append-only sent-message history) rather than conflating them, matching Semble's own object split |

#### Scheduling / Booking

| Semble field | Purpose | MediBook today |
|---|---|---|
| `BookingStatus` enum tied explicitly to payment state ("Confirmed maps to payment.status done or null") | Booking confirmation is *payment-gated* by design | MediBook's `Appointments.status` is a free-text string with no explicit payment-state coupling |
| `videoUrl`, `isVideoConsultation` (on Product) | Telehealth built into both the booking and the service definition | MediBook has a `pages/video` route but no schema-level flag on the service/product itself |
| `Journey` object, nested on `Booking` — confirmed fields: `arrived`, `consultation`, `departed`, `dna` (all `DateTime`) | "The progression of a booking" — a purpose-built waiting-room/attendance tracker: patient arrival, consultation start, departure, and a **dedicated no-show (`dna`, did-not-attend) timestamp** distinct from a cancelled/rescheduled status | Missing — MediBook tracks status transitions only via `AppointmentStatusLogs`-style logging (a status string + timestamp), not front-desk arrival/departure checkpoints or a first-class DNA field separate from "cancelled." Front-desk-relevant for walk-in/hybrid clinics: lets staff see at a glance who's checked in vs. still waiting vs. no-showed, and gives clinics real no-show-rate data per clinician/service. No dedicated `journey`/`journeys` query or `createJourney` mutation exists — it's read/write only as a nested field on `Booking`. |
| `metadata` (array of `MetadataEntry`) on Booking | Arbitrary custom key-value data per booking | Missing |
| `patientMessagesSent` / `SendPatientMessages` | Tracks which automated messages were sent for this specific booking | Missing — relevant given MediBook's planned Email Service (Phase 9) has no per-booking send-tracking designed yet |
| `createOutOfOfficeBooking` mutation | A dedicated mutation type for blocking out clinician unavailability as a "booking," rather than a separate model | MediBook already has `SpacerBlocks`/`RoomBlocks`/`LunchBreaks` as separate models — arguably a *more* explicit design than Semble's, not a gap |

#### Clinical Documentation — the headline gap

| Semble object/mutation | Purpose | MediBook today |
|---|---|---|
| `Consultation` (id, patient, date, `encounterType`, doctorName, `questionnaireId`, `records[]`) | The record of a single patient encounter | **Missing entirely** |
| `createAllergyRecord`/`updateAllergyRecord` | A **named, distinct** clinical-safety record type — allergies are modeled explicitly, not folded into generic notes | **Missing** — this is a patient-safety gap, not a nice-to-have, if MediBook ever handles clinical notes at all |
| `createFreeTextRecord`/`updateFreeTextRecord`, `deleteRecord` | Generic clinical note records | Missing |
| `Letter` (title, body, `reviewStatus` enum, `recipient`, `dateShared`) + `createLetter`/`updateLetter`/`deleteLetter` | Referral/correspondence letters with an explicit **review/approval workflow** before sharing | Missing entirely |
| `Questionnaire` (`sections[]`, `styling`, `settings`, `confirmationMessage`, `redirectUrl`) + `fillQuestionnaire` mutation | Structured, brandable intake/clinical forms — supports generic, multiple-choice, signature-capture, and **relationship-based question types with dependencies between questions** (conditional logic) | **Missing entirely** — more sophisticated than a simple form builder; worth scoping as its own mini-feature (patient intake forms, consent forms, pre-consultation questionnaires) rather than a Consultation sub-field |
| `PatientDocument` (`parent` for folder hierarchy, `uploadUrl`/`downloadUrl` with 2-hour expiry, `shareDetails()` with recipient filtering) | A genuine per-patient **file system** with folders, not just flat attachments | Missing — if built (Phase 2), design it as a folder-capable store from the start rather than a flat attachment list, since retrofitting hierarchy later is expensive |
| `ClinicalPathway`, `Episode`, `WorkingDiagnosis`, `PathwayDiagnosisCode` — explicitly marked by Semble itself as **"not yet available for public API use" / "Future/Limited Access"** | Structured care pathways (multi-visit treatment plans with staged status, e.g. `EpisodePathwayStatus`) | Missing — but importantly, **even Semble gates this as an advanced/limited feature**, not baseline. This validates sequencing it well behind core booking+consultation work, not chasing it early. |
| `ClinicalReport`/`ClinicalReports` (confirmed as its own queryable object, distinct from `Consultation`) + `updateClinicalReportGovernance` | A **formal, sign-off-gated output document** (e.g. a completed structured assessment or summary report) — separate from the free-form `Consultation` record and from `Letter` — with explicit governance/approval controls before it's considered final | Missing — MediBook has no concept of a "completed report" distinct from a consultation note; worth deferring until Consultations (Phase 2) and Letters (Phase 3) both exist, since ClinicalReport appears to be a third, more formal tier above both |
| `diagnosisCodes` query — "returns valid diagnosis codes, results can be [filtered/searched]" | A real, live diagnosis-code lookup/catalog endpoint | Confirms the Phase 5 "full ICD-10-equivalent diagnosis coding" item is a genuine live Semble feature (not just a schema field) — MediBook should plan for a searchable code-lookup query, not just a free-text `diagnosis_code` column, once that phase is reached |
| `forms` query — "fetches a collection of hospital booking forms" | A distinct forms concept from `Questionnaire` — sounds specifically tied to pre-admission/hospital-style intake paperwork rather than general patient questionnaires | Missing, and only a one-line description could be confirmed (dedicated object page didn't resolve) — low priority for an outpatient/clinic-first product like MediBook; note but don't scope until the questionnaire builder (Phase 2) is built and it's clear whether `forms` would be redundant with it |
| `updateClinicalReportGovernance` | Governance/sign-off controls specifically for clinical reports | Missing (see `ClinicalReport` row above) |

#### Financial / Billing — deeper than a single transaction

| Semble object/mutation | Purpose | MediBook today |
|---|---|---|
| `Invoice` (`invoiceNumber`, `paidOrOutstanding`, `outstanding`, `refunded`, `lineItems[]`, `payments[]`, `refunds[]`, `payeeDetails`, `paymentLinkUrl`) | A full invoice with line items, partial payment tracking, and a shareable payment link | MediBook's `PaymentTransactions` is a single flat transaction record — no line items, no partial-payment/outstanding-balance concept, no payment link |
| `patientTitle`/`patientDob` snapshotted onto the invoice at creation | Historical accuracy — the invoice shows what the patient's details *were* at billing time, immune to later record edits | Missing — a real compliance/audit-trail nuance worth adopting |
| `insuranceDetails` snapshot, `healthcode` (claim submission status), `doctorHealthcodeIdentifier` | Insurance claim submission tracking | Missing — India-equivalent would be TPA/insurance claim tracking for cashless treatment, a real gap for clinics that deal with insurers |
| `accountId`/`payeeDetails` (billed party can be the patient **or an insurer contact**) | Third-party billing | Missing |
| `paymentOnAccount`/`paymentsOnAccount` queries — "a Payment on Account by its identifier" / "Payments on Account that still have [a remaining balance]" | A **standing credit balance** a patient/contact holds that isn't yet applied to any specific invoice (e.g. an advance/deposit payment, or a refund credited back rather than paid out) — distinct from `Invoice.payments[]`, which are payments *against* a specific invoice | Missing — MediBook's `PaymentTransactions` is always invoice/booking-scoped; there's no concept of an un-applied credit balance sitting on a patient's account. Relevant once membership/subscription billing (Phase 4) exists, since pre-payments and refund credits need somewhere to live between transactions |
| `PriceProfile`, `PriceProfilePeriod`, `PriceRule`, `PriceAdjustmentRule` (full CRUD mutation set: `createPriceProfile`/`updatePriceProfile`/`deletePrice`, `createPriceProfilePeriod`, `createPriceRule`, `createPriceAdjustmentRule`, etc.) | A genuinely sophisticated **rules-based pricing engine** — time-bound price profiles, layered adjustment rules (e.g. membership discounts, seasonal pricing) | MediBook has flat `Products.price`/`ProductVariations.price` only — no rules engine of any kind |
| `createPaymentIntentForBooking`, `markBookingPaymentProcessing`, `startTerminalPaymentForBooking`, `cancelTerminalPaymentForBooking` | A full **in-clinic card-terminal payment lifecycle**, separate from online payment | Missing — relevant for hybrid (online + walk-in) clinics, lower priority for an online-booking-first rollout |
| `Product.cost`, `stockLevel`, `serialNumber`, `supplierName` | Products can represent **physical inventory**, not just bookable services | MediBook's `Products` model is service/booking-oriented only — worth a deliberate decision on whether retail/inventory items are in scope at all, rather than silently missing them |

#### Practice Administration & Integration

| Semble field/mutation | Purpose | MediBook today |
|---|---|---|
| `Practice.branding`, `logo` | Org-level branding | MediBook **already built this** this session (Settings → Clinic → Branding) — genuine parity here, not a gap |
| `Practice.groupTypes`, `paymentTypes`, `appointmentTypes` as practice-level configuration lists | Org-configurable taxonomies | Partially present (`ProductCategories`/`ClinicianTypeModel`/`RoomTypeModel` exist) but not unified under one "practice settings" umbrella the way Semble models it |
| `patientSharingMode`, `contactSharingMode` | Practice-level rules for how patient/contact data is shared across locations within the same practice group | Missing — relevant once MediBook supports multi-clinic organizations sharing a patient base, which the onboarding wizard already anticipates |
| `createWebhook`/`updateWebhook`/`deleteWebhook`, `createIntegrationToken` | Third-party integration surface (accounting software, insurance/TPA systems) | **Missing entirely** — no webhook or integration-token concept anywhere in MediBook |
| `integrationToken` query — "fetching the integration token **of a patient**" | Confirms integration tokens in Semble are (at least also) **patient-scoped**, not only practice-scoped — likely used to grant a specific patient/portal session scoped API access, distinct from the practice-wide `createIntegrationToken` webhook-auth mutation already noted above | Correction to the earlier finding: there are two distinct integration-token concepts (practice-level, for third-party systems; patient-level, likely for portal/SSO-style scoped access), not one. Both missing in MediBook, but scope them as separate features if this is ever built (Phase 5) |
| `onlineBookingConfiguration`/`onlineBookingConfigurations` queries | A formal, queryable model for the practice's public-facing online-booking page settings (which services/clinicians are bookable online, lead time, etc.) | Confirms Phase 5's "formal online booking configuration model" is a real, live Semble object, not a guess — MediBook's public booking page today reads scattered fields off `Products`/`Clinicians` rather than one dedicated config object |
| `Label` (generic id/color/title, reused across Patients *and* Products) | A single, reusable tagging primitive | Missing — worth building once, generically, rather than bespoke per-domain tags later |
| `createPracticeTemplateDocument` | Practice-defined document templates (e.g. a standard referral letter template) | Missing |

### 2.2 Full write-operation (mutation) surface — for completeness

Semble's public mutation index (≈95 operations, confirmed complete via user-supplied full-page screenshot — the earlier `WebFetch`-only pass under-counted this and specifically missed the pair below) spans these categories: Contact Management, Patient Management, Booking & Availability, Invoice & Payment, Medical Records, Products & Labels, Communication (`sendEmail`/`sendSms`/`cancelScheduledPatientCommunication`), Documentation (Letters, Practice Templates), Administrative (Labels, Tasks, Users, Locations), Integration & Webhooks, Payment Processing (terminal-specific), Clinical Operations (Questionnaires, Clinical Report Governance), **Data Quality (`createMergeRecord`/`updateMergeRecord` — patient/contact deduplication, see Patients table above)**, and a "Future/Limited Access" tier (Clinical Pathways, Episodes, the full Price Profile/Rule engine). This confirms the object-level findings above aren't read-only API surface artifacts — every one of them is a live, mutable feature in Semble's product.

### 2.3 Full read query surface — cross-checked against the object findings above

Semble's public Queries index (≈65 operations, confirmed complete via user-supplied full-page screenshot) was cross-checked entry-by-entry against every finding already documented above. Result: **every query maps to an object already covered in §2.1/2.2's tables** — `accountStatement(s)`, `availabilities`/`availabilityRule`/`availabilitySettings`/`availabilitySlots`, `booking`/`bookings`/`bookingsById`/`bookingTerminalPaymentStatus`, `clinicalPathway(s)` (limited access), `consultation(s)`, `contact(s)`, `episode`/`episodes`/`episodeTypes` (limited access), `invoice(s)`, `lab`/`labs`/`labels`, `letter(s)`, `patient`/`patients`/`patientDocument(s)`/`patientRelationships`, `paymentTerminalReaders`, `practice`/`practiceTemplateDocument(s)`, `prescription(s)`, `priceAdjustmentRule(s)`/`resolveEffectivePriceRule`, `product(s)`, `questionnaire(s)`, `record(s)`, `task(s)`, `user(s)`, `webhook(s)`, `workingDiagnoses` (limited access) — no surprises among those. Five entries were **new or materially clarified** by this pass and have been folded into the tables above: `createMergeRecord`/`updateMergeRecord` (Patients table), `paymentOnAccount`/`paymentsOnAccount` (Financial table), `clinicalReport`/`clinicalReports` (Clinical Documentation table), `patientCommunication`/`patientCommunications` as a log distinct from preferences (Patients table), `forms` (Clinical Documentation table), the patient-scoped `integrationToken` (Practice Admin table), `onlineBookingConfiguration(s)` (Practice Admin table, confirms an existing Phase 5 guess), and `diagnosisCodes` (Clinical Documentation table, confirms an existing Phase 5 guess). Separately, fetching Semble's `Journey` object page directly (nested on `Booking`) confirmed its exact field set (`arrived`/`consultation`/`departed`/`dna`), replacing the earlier vaguer `bookingJourney` note in the Scheduling table with concrete detail.

---

## Part 3 — Phased roadmap, ordered by business priority

Deliberately *not* "build the whole EHR." Sequenced by what closes the most business risk/opportunity first for a **booking-first** product competing against a **records-first** one.

**Phase 1 — Trust, safety, and RBAC (cheapest, highest-impact, closes real risk)**
- Custom Roles & Access Groups (Part 1) — schema foundation already laid.
- Clinician professional fields: `qualifications`, `registration_number` (also required for India Telemedicine Guidelines — two requirements converging on one field), multiple specialties, locum support (`is_locum`, `locum_for`, date range).
- Patient safety/admin states: `on_hold` (blocks new bookings), `archived` (distinct from hard delete), `labels`.
- `communication_preferences` on Patients — doubles as DPDP Act consent tracking.
- Related accounts / family linking (`PatientRelationship`-style, with a typed relationship enum + custom label for "other").
- **Billing party / payor as a distinct concept from the patient** (`Contact`-style: `is_payor`, `invoice_recipient`, `billing_frequency`, optional `parent_contact` for corporate/family billing groups) — closes a real gap in the Razorpay/GST work already done, which currently assumes the patient always pays for themself.
- Patient number schemes (`PatientNumber` + editable number-type *definitions*) — lets a clinic track whatever local ID (insurance number, Ayushman Bharat ID, etc.) it needs without a schema change per scheme.
- **Duplicate patient/contact merging** (`createMergeRecord`/`updateMergeRecord`-equivalent) — a genuine patient-safety item, not just data hygiene: a fragmented duplicate record means a clinician can miss allergy/history data recorded against the "other" copy of the same person. Cheapest to build early, before Phase 2-4 pile clinical/financial data onto records that might later need merging (merging gets more expensive to reconcile the more sub-objects point at a patient).

**Phase 2 — Core clinical documentation (makes MediBook a "practice management" system, not just a booking widget)**
- `Consultation` (encounter record tied to a booking, with `encounterType`, doctor, date).
- **Allergy records specifically** (`createAllergyRecord`) — treat as a distinct, higher-priority safety feature, not folded into generic notes.
- Generic free-text clinical records.
- Patient documents (upload/attach, securely shareable via a token — mirrors Semble's `sharingToken` pattern). **Design with folder hierarchy from the start** (a `parent` reference), not a flat list — retrofitting this later is expensive.
- Basic diagnosis capture (free-text first; ICD-10-style coding is a Phase 5 maturity step).
- A minimal patient intake/consent questionnaire builder (sections + basic question types) — don't build Semble's full conditional-logic/signature-capture depth yet, but the *shape* (form → sections → questions, brandable, with a confirmation message) is worth adopting early since intake forms are one of the highest-frequency touchpoints with a patient.

**Phase 3 — Clinical/operational depth**
- `Letter` with an explicit review/approval status before it's shared with a patient or recipient — don't skip the governance step even in v1.
- `ClinicalReport` as a distinct, governance-gated tier above the free-form `Consultation` note (sequence after Consultations/Letters both exist — see §2's Clinical Documentation table).
- Formal `Task` model (internal staff follow-ups — "call patient back," "chase lab result") with assignment, due date, priority.
- Labs — formalizes the existing frontend "Test Results" page with a real backend model.
- A generic, reusable `Label` primitive (color + title), applied to both Patients and Products rather than bespoke tagging per domain.
- Waiting-room/attendance tracking (`Journey`-equivalent: arrived/consultation-started/departed timestamps + a dedicated no-show flag distinct from "cancelled") — relevant for any hybrid or walk-in clinic, gives real per-clinician no-show-rate data.
- Patient communication log (sent-message history, distinct from the Phase 1 communication *preferences*).

**Phase 4 — Financial maturity**
- Invoice line items + partial-payment/outstanding-balance tracking (the current `PaymentTransactions` model is a flat single-transaction record — this is a real structural gap, not just a missing field).
- Patient-level snapshotting on invoices (title/DOB at time of billing) for audit accuracy.
- Insurance/TPA claim-submission tracking fields, India-equivalent of Semble's `healthcode`/`doctorHealthcodeIdentifier`.
- Patient memberships (recurring patient-level plans) — a genuine new monetization lever, not just parity.
- Payment-on-account / standing credit balance (patient-held pre-payment or refund credit not yet applied to a specific invoice) — needed once memberships/subscriptions exist, since recurring billing generates un-applied credits and prepayments.
- A basic price-rule/adjustment layer (even a simple version of Semble's Price Profile engine) once membership pricing is real.
- Payment terminal integration — sequence behind everything above; only relevant for hybrid online+in-clinic practices.

**Phase 5 — Platform & integration maturity**
- Webhooks + integration tokens (accounting software, insurance/TPA systems, third-party integrators).
- Practice-level document templates (referral letter templates, etc.).
- Full ICD-10-equivalent diagnosis coding.
- Clinical Pathways/Episodes — **Semble itself gates this as "Future/Limited Access,"** so MediBook has explicit competitor validation to *not* build this early.
- Per-patient access-group scoping (§1.4.5) — real feature, genuinely more complex, sequence last among the "safety/access" items.

### What NOT to chase

- Full ICD-10/diagnosis-coding compliance, clinical pathway engines, and deep e-prescribing (controlled-substance workflows, pharmacy integration) are multi-quarter, regulator-adjacent efforts — sequence them only once Phase 1-4 prove the clinical-documentation direction is actually wanted by the client. Semble itself treats Clinical Pathways as limited-access, which is direct competitor validation for deferring this.
- Payment terminal hardware integration is low priority unless the client's clinics are explicitly hybrid (in-person card payments at the desk).
- A full retail-inventory system (`Product.stockLevel`/`serialNumber`/`supplierName`) is a scope decision, not an assumed requirement — confirm with the client whether MediBook clinics sell physical retail items at all before building it.
