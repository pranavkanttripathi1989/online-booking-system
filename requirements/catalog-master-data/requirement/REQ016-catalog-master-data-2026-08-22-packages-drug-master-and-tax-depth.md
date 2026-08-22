---
id: REQ016
type: requirement
feature: catalog-master-data
created: 2026-08-22
updated: 2026-08-22
status: draft
parent: null
related: [BUG001]
---

# Catalogue extensions: packages, drug master, per-category pricing, tax depth

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M3 — Master Data: Services, Products & Catalogues** (`FR-CAT-01`–`FR-CAT-08`). Cross-referenced against `backend/src/services`, `backend/src/products`, and `requirements/products/bug/BUG001-products-2026-08-21-cross-tenant-idor.md`.

## Current state vs. PRD ambition

The existing `services` and `products` domains cover a meaningful slice of M3 already: a `Service` entity with department/duration/price exists (`Products` model doubles as both, per `CLAUDE.md`'s entity-shape note), GST fields exist on the payment side, and `BUG001` already fixed the org-scoping defect on the create paths (`client_org_id` stamped from the JWT, not a caller-supplied `clinic_id`) — that fix should be treated as the reference pattern for every new mutation this requirement adds.

Real gaps against the PRD:

1. **No `Package` entity.** `FR-CAT-03` (a bundle of services with N sittings, a validity window, and per-sitting consumption tracking) has no equivalent — this blocks any physio/dental/IVF multi-sitting workflow, which the PRD's speciality-pack roadmap (§6.3) depends on.
2. **No drug master.** `Product` today models retail/service items generically; the PRD's `FR-CAT-04`/`FR-CAT-05` need a drugs-specific shape (composition, strength, form, schedule class, HSN) seeded from a licensed database, with tenant-level custom additions and a per-clinician favourites list. This is also a hard prerequisite for `REQ021` (prescriptions) and `REQ022` (pharmacy) — neither can function without it.
3. **No differentiated pricing by patient category or channel.** `FR-CAT-02` wants price variance by branch, by clinician, by patient category (general/corporate/staff/camp), and by channel (online/walk-in). Today price is a single field on the service row.
4. **No price-list versioning.** `FR-CAT-06` wants effective-dated price lists with bulk edit and change audit; today a price update is a direct field mutation with no history.
5. **Consultation-fee rules exist in spirit but not in this domain** — `cancellation-rules` (a sibling feature) already models per-clinic, priority-ordered rules for a different concern (cancellation fees). `FR-CAT-07`'s "free follow-up within X days" rule should follow that same established pattern rather than inventing a third rules engine.

## Gap classification

- **Extend existing:** per-category/per-channel pricing on `Products`/`Services`; tax/HSN depth (`FR-CAT-08`) on top of the GST fields that already exist on `AppointmentPayments` per `REQ017` in `patient-payments`... — no, correction: GST fields exist on `PaymentTransactions` (SaaS billing) only per `project-plans` F-17; this requirement's tax fields belong on the catalogue item itself (HSN/SAC, taxable-vs-exempt flag), which is a different, catalogue-side gap from the invoice-side one `project-plans` already flagged.
- **Net-new:** `Package` entity and sitting-consumption tracking; drug master with a favourites list; price-list versioning and bulk edit with audit.
- **Already satisfied:** basic service/product CRUD, org-scoped and tenant-isolated per `BUG001`'s fix.

## Phase assignment

PRD Phase: `FR-CAT-01`/`02`/`07` are **MVP (P0)**; the rest — packages, drug master, price-list audit, tax depth — are **V1 GA (P1)**, which matches the dependency reality: drug master must exist before `REQ021` (prescriptions) can be built at all.

## Dependencies

- **Requires:** `BUG001`'s org-scoping pattern as the template for every new create path (Hard Rule 6).
- **Blocks:** `REQ021` (prescriptions) and `REQ022` (pharmacy) both require the drug master to exist first — sequence this requirement ahead of both.

## User stories

### Epic: Packages

**US-CAT-01** — As an Org Admin at a physiotherapy clinic, I want to sell a "10-session physio package" at a bundled price, so that a patient pays once and consumes sessions over time.
- PRD refs: FR-CAT-03
- Priority: P1
- Acceptance criteria:
  - Given a package with 10 sittings and a 90-day validity, when a patient books their 3rd session, then the remaining-sittings counter decrements and the booking requires no additional payment.
  - Given a package's validity window has expired with sittings remaining, then no further session can be booked against it, and the front desk sees the exact number of forfeited sittings.

### Epic: Drug master

**US-CAT-02** — As a clinician, I want to search for a drug by brand or generic name from a pre-seeded Indian drug database, so that I don't have to type composition and strength manually every time.
- PRD refs: FR-CAT-04, FR-CAT-05
- Priority: P1
- Acceptance criteria:
  - Given the seeded drug master, when I type "Aug" in the Rx builder, then "Augmentin 625 (Amoxicillin + Clavulanic Acid)" appears with strength/form pre-filled.
  - Given a drug a clinician prescribes often that isn't in the base database, when they add a tenant-level custom drug, then it appears in their own favourites and does not leak into other tenants' catalogues.

**US-CAT-03** — As a clinician, I want a personal favourites list of drugs and drug-sets ("URI adult set"), so that I can apply a common regimen in one click.
- PRD refs: FR-CAT-05
- Priority: P1
- Acceptance criteria:
  - Given a saved favourite set of 3 drugs, when applied to a new prescription, then all 3 lines populate with the clinician's saved dose/frequency/duration defaults, editable per-encounter.

### Epic: Differentiated pricing

**US-CAT-04** — As a Branch Manager, I want to charge a lower rate for corporate-tied patients than walk-ins, so that our corporate contracts are honoured automatically at billing time.
- PRD refs: FR-CAT-02
- Priority: P0
- Acceptance criteria:
  - Given a patient tagged `corporate` with a corporate-rate override on a service, when that service is billed, then the corporate rate applies without staff manually selecting it.
  - Given the same service booked online vs. at the counter, when the org has configured different online/walk-in rates, then the correct rate is applied per channel.

### Epic: Price-list audit

**US-CAT-05** — As an Org Admin, I want every price change logged with who changed what and when, so that I can explain a billing discrepancy raised weeks later.
- PRD refs: FR-CAT-06
- Priority: P1
- Acceptance criteria:
  - Given a price change with an effective-from date in the future, when that date arrives, then the new price takes effect automatically and the prior price remains visible in the audit history for bills issued before the change.

### Epic: Tax depth

**US-CAT-06** — As an Accountant, I want every catalogue item tagged with the correct HSN/SAC and taxable-vs-exempt status, so that invoices are GST-correct without manual classification at billing time.
- PRD refs: FR-CAT-08
- Priority: P1
- Acceptance criteria:
  - Given a healthcare consultation service, when billed, then it is treated as GST-exempt by default per current Indian tax treatment of healthcare services, while a retail/pharmacy item on the same bill is taxed correctly with its own HSN and GST rate.

## Data model impact

- New `Packages` table: `id`, `client_org_id`, `name`, `services_json`, `sittings`, `validity_days`, `price`.
- New `PackageConsumption` table tracking sittings used per patient per package.
- New `Drugs` table: `id`, `client_org_id|null` (null = platform-seeded), `name`, `composition`, `strength`, `form`, `schedule_class`, `hsn`, `gst_rate`, `manufacturer`.
- New `ClinicianFavourites` table for drugs/drug-sets/advice templates, scoped per clinician.
- `Products`/`Services` gain `patient_category_pricing_json`, `channel_pricing_json`, `hsn`, `is_tax_exempt`.
- New `PriceHistory` table: `id`, `item_type`, `item_id`, `old_price`, `new_price`, `effective_from`, `changed_by`, `changed_at`.

## Non-functional notes

The drug master is a licensing decision, not just an engineering one — PRD §19 Open Question 4 ("build vs. license, annual cost and update cadence") is unresolved and blocks `US-CAT-02` from shipping with real data. Until resolved, ship the schema and a small manually-curated seed set so `REQ021` can be built and tested against it.

## Open questions

- Carried from PRD §19.4: drug database build-vs-license decision, with cost and update-cadence implications. Log in `context/open-questions.md` once this requirement enters planning.
