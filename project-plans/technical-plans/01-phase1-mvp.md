---
id: TECH002
type: technical-plan
feature: technical-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: TECH000
related: [TECH001, TECH005, TECH006]
---

# 01 — Phase 1 / MVP: "Run the OPD day"

**PRD reference:** §6.1, roadmap Q1–Q2. **Requirements:** `REQ014`, `REQ016`, `REQ017`, `REQ018`, `REQ019`, `REQ020`, `REQ021`, `REQ023`, `REQ032`.
**Exit criterion (PRD §18):** 10 design-partner clinics running live daily OPD; MVP GA to design partners; first paid conversions.
**Prerequisite:** Phase F complete.

## Build order (dependency DAG)

```
REQ014 organizations (Department, Resource, real onboarding)
   │
   ├──> REQ017 scheduling-engine (session/token mode, multi-resource)  ← the critical path
   │        │
   │        ├──> REQ018 appointments (booking channels, dedup, family)
   │        │        │
   │        │        └──> REQ019 queue-management (check-in, token, live board)
   │        │                 │
   │        │                 └──> REQ020 clinical-records (EMR)
   │        │                          │
   │        │                          └──> REQ021 prescriptions   ← needs REQ016 too
   │        │
   │        └──> (REQ016 catalog: drug master must land before REQ021)
   │
   ├──> REQ023 patient-payments (billing depth)      ─┐ independent of the
   └──> REQ032 subscription-plan-engine (plan builder)─┘ clinical stack; parallelisable
```

`REQ017` is the critical path and the PRD's own "heart of the product". Start it
as soon as `REQ014`'s `Resource` entity exists.

---

## 1. REQ014 — Organizations: hierarchy and onboarding

### 1.1 New entities

```prisma
model Departments {
  id            String   @id @default(uuid())
  client_org_id String
  branch_id     String                        // FK to Clinics (a "branch" IS a Clinic here)
  name          String
  is_deleted    Boolean  @default(false)
  created_at    DateTime @default(now())
  updated_at    DateTime @default(now())

  client_organization ClientOrganizations @relation(fields: [client_org_id], references: [id])
  branch              Clinics             @relation(fields: [branch_id], references: [id])
  clinicians          Clinicians[]
  products            Products[]

  @@index([client_org_id, branch_id])
  @@index([branch_id, is_deleted])
}

model Resources {
  id            String   @id @default(uuid())
  client_org_id String
  branch_id     String
  name          String
  type          String                        // 'equipment' | 'chair' | 'machine' | 'bay'
  is_bookable   Boolean  @default(true)
  is_deleted    Boolean  @default(false)
  created_at    DateTime @default(now())

  client_organization ClientOrganizations @relation(fields: [client_org_id], references: [id])
  branch              Clinics             @relation(fields: [branch_id], references: [id])
  appointmentResources AppointmentResources[]

  @@index([client_org_id, branch_id])
  @@index([branch_id, is_bookable, is_deleted])
}
```

**Naming decision:** the PRD says `BRANCH`; this codebase says `Clinics`. Keep
`Clinics` as the table — a rename touches 29 modules for zero functional gain —
and use "branch" only in UI copy. Note this deviation in the slice's `PLAN###`.

`Clinics` also gains `hfr_facility_id String?` (ABDM prerequisite, Phase 2) and
`letterhead_asset_id String?` (per-branch print letterhead, `REQ021`).

### 1.2 Masters cascade

`Products`/`Services` gain `inherit_mode` (`inherit | override | branch_only`)
and a nullable `parent_service_id` self-relation so a branch row can point at the
org-level definition it overrides. Resolution order at read time: branch override
→ org definition → nothing.

### 1.3 Real onboarding wizard

`ClientOrganizations` already has `owner_user_id`, `onboarding_status`
(`OnboardingStatus` enum), `onboarding_step`, `trial_ends_at`, `onboarded_at`.
**Reuse these — do not add parallel columns.**

New module `backend/src/onboarding/` with four mutations replacing the current
`mocks/store.js` calls in `pages/onboarding/index.jsx` verbatim by name:
`startOrganizationOnboarding`, `selectOnboardingPlan`, `addOnboardingFirstClinic`,
`completeOrganizationOnboarding`.

`startOrganizationOnboarding` is `@Public()` — the only new public mutation in
Phase 1. It therefore needs the same scrutiny `register` failed: the created org
must be provably isolated from the moment it exists. Add an explicit tenancy-matrix
case for *organization creation itself*, not just post-creation reads.

Demo-data seeding: rows tagged `is_demo: true`, wipeable in one transaction.

### 1.4 Data import (`FR-ORG-07/08`) — P1, defer within phase

New `ImportBatches` table; every imported row carries `import_batch_id` for
rollback. CSV/XLSX parse + column-mapping UI + dry-run + commit + 24h rollback.
This is the PRD's named #1 switching blocker (§2.3.7) but is not MVP-blocking —
schedule it last in the phase.

---

## 2. REQ016 — Catalogue: drug master first

Only the **drug master** is Phase-1-critical, because `REQ021` cannot exist
without it. Packages, tiered pricing and price-list versioning are P1 and can
land later in the phase.

```prisma
model Drugs {
  id             String   @id @default(uuid())
  client_org_id  String?                       // null = platform-seeded, visible to all
  name           String
  composition    String?
  strength       String?
  form           String?                       // tablet | syrup | injection | ...
  schedule_class String?                       // H | H1 | X | OTC
  hsn            String?
  gst_rate       Int?                          // basis points, or null for exempt
  manufacturer   String?
  is_deleted     Boolean  @default(false)
  created_at     DateTime @default(now())

  client_organization ClientOrganizations? @relation(fields: [client_org_id], references: [id])
  prescriptionItems   PrescriptionItems[]

  @@index([client_org_id, is_deleted])
  @@index([name])
}

model ClinicianFavourites {
  id            String   @id @default(uuid())
  clinician_id  String
  kind          String                          // 'drug' | 'drug_set' | 'advice' | 'test'
  label         String
  payload_json  Json                            // for drug_set: the full line list with defaults
  created_at    DateTime @default(now())

  clinician Clinicians @relation(fields: [clinician_id], references: [id])
  @@index([clinician_id, kind])
}
```

**Blocked decision:** the drug database is build-vs-license (PRD §19.4,
unresolved). Ship the schema plus a small curated seed set so `REQ021` is
buildable and testable; do not block the phase on the licensing decision.

---

## 3. REQ017 — Scheduling engine: the critical path

**Status (2026-08-24): §3.1–3.3 shipped** (`PLAN055`/`TP082`/`TR081`, real
migration `20260824000000_scheduling_engine_session_mode`). One deliberate
deviation from this section's own sketch, recorded in `PLAN055`: `Resources`
uses `clinic_id` (this codebase's real branch-entity FK name everywhere
else), not `branch_id` as sketched below. §3.4 (timezone model) was **not**
touched — `appointment_date`/`appointment_time` remain two independent
zone-less timestamps; this stayed out of scope for the P0 slice and is still
open. §3.5–3.6 are P1, not built (see `REQ017`'s own status note).

### 3.1 Mode discriminator on existing availability

The existing `ClinicianAvailability` is a correctly-built **slot-mode-only**
engine with real self-scoping (`assertClinicianAccess`). Extend it; do not
replace it — its tests must keep passing unchanged.

```prisma
// added to ClinicianAvailability
mode               String  @default("slot")   // 'slot' | 'session' | 'hybrid'
capacity           Int?                        // session/hybrid: token count
overbook_allowance Int     @default(0)
walkin_ratio       Int?                        // hybrid: booked-per-walkin, e.g. 3
```

### 3.2 Multi-resource booking

```prisma
model AppointmentResources {
  id             String @id @default(uuid())
  appointment_id String
  resource_id    String

  appointment Appointments @relation(fields: [appointment_id], references: [id], onDelete: Cascade)
  resource    Resources    @relation(fields: [resource_id], references: [id])

  @@unique([appointment_id, resource_id])
  @@index([resource_id])
}
```

Slot generation must intersect **clinician ∩ room ∩ every required resource**.
The PRD's own acceptance example is the test: Dr. A needs Room 2 + the ECG
machine; Room 2 booked at 11:00 ⇒ the 11:00 TMT slot is not offered even though
Dr. A is free. And symmetrically when the ECG machine (not the room) is the
conflict.

### 3.3 Database-level double-booking prevention — do this once, for both modes

Application-level `assertSlotFree()` is a `findFirst` inside a `READ COMMITTED`
transaction: two concurrent bookings can both pass. Close it in the database.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointments" ADD COLUMN "time_range" tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      "appointment_time",
      "appointment_time" + ("duration_minutes" || ' minutes')::interval,
      '[)'
    )
  ) STORED;

ALTER TABLE "Appointments" ADD CONSTRAINT "appointments_no_clinician_overlap"
  EXCLUDE USING gist ("clinician_id" WITH =, "time_range" WITH &&)
  WHERE ("status" NOT IN ('cancelled','no_show') AND "is_deleted" = false);

ALTER TABLE "Appointments" ADD CONSTRAINT "appointments_no_room_overlap"
  EXCLUDE USING gist ("room_id" WITH =, "time_range" WITH &&)
  WHERE ("status" NOT IN ('cancelled','no_show') AND "is_deleted" = false);
```

Resource-level exclusion needs the range on the join table — add a generated
`time_range` to `AppointmentResources` (denormalised from the parent) or enforce
resources via a trigger; decide during the slice's `PLAN###` against real code.

Keep the application check as the fast, friendly path; map the constraint
violation (`23P01`) to the existing user-facing message
`"This time slot is no longer available"`. **Phase F's concurrency test is this
work's acceptance criterion** — it goes green here.

### 3.4 Timezone model

`appointment_date` + `appointment_time` are today two independent zone-less
timestamps. That does not survive a multi-city tenant. Decide in this slice:
store a single UTC `start_at` + `duration_minutes`, derive local rendering from
`Clinics.timezone`. This is a data migration over existing rows — small now
(4 appointments), impossible later.

### 3.5 Live throughput / ETA

Session mode needs a rolling median consult duration per clinician per service,
computed from real `checked_in → completed` timestamps (available once `REQ019`
and `REQ020` land). Implement as a small aggregate table refreshed on each
`completed` transition — **not** a JS-side loop over full result sets
(`02-findings-register.md` F-15).

### 3.6 Disruption handling (P1 within phase)

`Waitlist` table with a time-limited claim link; delay broadcast; bulk-reschedule
with one-click accept. All three dispatch through the existing
`NotificationTriggerService` — do not build a second notification path.

---

## 4. REQ018 — Booking engine

- **Dedup**: normalised-phone index on `Patients`; match on phone + name/DOB before create. `PatientMerge` audit table; merge moves appointments/prescriptions/invoices to the surviving record. Permission-gate tightly — **not** Front Desk by default (PRD Appendix A).
- **Family**: `PatientRelation(patient_id, related_patient_id, relation)`. Shared with `REQ027`.
- **Policy**: `Services` gains `prepayment_policy` (`required|optional|none`), `reschedule_limit`, `no_show_grace_minutes`.
- **No-show automation**: scheduled job transitions past-grace appointments to `no_show`; repeat offenders flagged for mandatory prepay.
- **Widget**: `BookingWidgetConfig` per org/branch with allowed origins + short-link slug; iframe + JS snippet.
- **Intake forms**: `IntakeFormFields` per service; answers surface in the encounter (`REQ020`).

The appointment state machine already matches the PRD (`requested → confirmed →
checked_in → in_consultation → completed`, branching `cancelled`/`no_show`/
`rescheduled`). **Do not redesign it** — good alignment achieved independently.

---

## 5. REQ019 — Check-in and queue

Entirely net-new backend (`waiting-room/index.jsx` is mock-only today, F-18).

```prisma
model QueueEntries {
  id             String    @id @default(uuid())
  client_org_id  String
  branch_id      String
  clinician_id   String
  appointment_id String?                        // null for a pure walk-in
  token_no       Int
  status         String    @default("waiting")  // waiting|called|in_progress|done|skipped|no_show
  checked_in_at  DateTime  @default(now())
  called_at      DateTime?
  completed_at   DateTime?

  @@index([client_org_id, branch_id, status])
  @@index([clinician_id, checked_in_at])
  @@unique([branch_id, clinician_id, token_no, checked_in_at])
}
```

Plus `QueueEvents` for the call/recall/skip/transfer audit trail, mirroring the
existing `AppointmentStatusLogs` pattern.

**Real-time:** reuse the existing `graphql-ws` + `PubSub` infrastructure
(`common/pubsub.module.ts`) — add queue subscription topics, do not introduce a
second transport. PRD NFR: board update latency < 2s.

**Interleaving:** the booked:walk-in ratio logic is shared with `REQ017`'s hybrid
mode. Implement once in the scheduling engine's queue-ordering function and have
queue management call it.

**Offline resilience** (PRD §13: ≥15 min connectivity loss for check-in) is a
genuinely new capability class not present anywhere in the frontend. Scope it as
its own technical spike; do not assume it falls out of Apollo's cache.

---

## 6. REQ020 — Clinical records (EMR)

Scope only the PRD's P0 subset: structured notes, templates/favourites, allergy
banners, attachments, sign-off immutability, patient timeline. ICD-10 coding,
investigation orders, referrals, voice/AI, CDS and speciality packs are P1/P2 and
carry unresolved clinical-liability questions (PRD §19.5).

```prisma
model Encounters {
  id             String    @id @default(uuid())
  appointment_id String    @unique
  patient_id     String
  clinician_id   String
  status         String    @default("draft")    // draft | signed
  consultation_mode String @default("in_person") // in_person|video|audio|text  (REQ026 reads this)
  signed_at      DateTime?
  signed_by      String?
  locked         Boolean   @default(false)
  created_at     DateTime  @default(now())

  @@index([patient_id, created_at])
  @@index([clinician_id, created_at])
}

model EncounterNotes   { id String @id @default(uuid()) encounter_id String section String content_json Json version Int @default(1)
                         @@index([encounter_id, section]) }
model EncounterAddenda { id String @id @default(uuid()) encounter_id String author_id String content String reason String created_at DateTime @default(now())
                         @@index([encounter_id, created_at]) }
model Vitals           { id String @id @default(uuid()) encounter_id String code String value String unit String? recorded_by String recorded_at DateTime @default(now())
                         @@index([encounter_id]) }
model Diagnoses        { id String @id @default(uuid()) encounter_id String icd10_code String? text String type String?
                         @@index([encounter_id]) }
model Attachments      { id String @id @default(uuid()) encounter_id String file_ref String mime_type String uploaded_by String created_at DateTime @default(now())
                         @@index([encounter_id]) }
```

### Sign-off immutability — enforce in the database, not the service

PRD §14.2 is explicit and this is a medico-legal requirement:

```sql
CREATE OR REPLACE FUNCTION reject_signed_encounter_edit() RETURNS trigger AS $$
BEGIN
  IF OLD.locked = true AND (NEW.locked = true) THEN
    RAISE EXCEPTION 'Signed encounter is immutable; append an addendum instead';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER encounters_immutable_after_sign
  BEFORE UPDATE ON "Encounters"
  FOR EACH ROW EXECUTE FUNCTION reject_signed_encounter_edit();
```

An application-layer check is not a substitute. Same for `EncounterNotes` —
block content updates where the parent encounter is locked.

**Hard product constraint** (PRD §5 P4): median consult documentable in **≤90
seconds** with templates + favourites. Design every interaction against that,
not just functional correctness — it's the stated difference between adoption
and reverting to paper.

**PHI note:** this is the most sensitive data in the product. Every table here
must use Phase F's `orgScope` from day one and appear in the tenancy matrix
before the slice ships.

---

## 7. REQ021 — Prescriptions

```prisma
model Prescriptions {
  id           String   @id @default(uuid())
  encounter_id String
  patient_id   String
  clinician_id String
  mode         String                          // in_person|video|audio|text — TPG gate reads this
  issued_at    DateTime @default(now())
  signature_id String?
  pdf_hash     String?
  language     String   @default("en")

  @@index([patient_id, issued_at])
  @@index([encounter_id])
}

model PrescriptionItems {
  id              String  @id @default(uuid())
  prescription_id String
  drug_id         String
  dose            String
  frequency       String                        // BD|TDS|HS|SOS|…
  route           String?
  duration_days   Int?
  qty             Int?                          // auto-calculated from frequency × duration
  instructions    String?
  substitutable   Boolean @default(true)

  @@index([prescription_id])
}

model TpgDrugLists { drug_id String @id list String }   // 'O' | 'A' | 'B' | 'prohibited'
```

### PDF rendering — decide architecturally before coding

`FR-RX-06` requires print preview to match output **exactly**. That effectively
requires server-side PDF generation (one rendering path), not browser print CSS.
Retrofitting this after a browser-print MVP means rebuilding the feature. Decide
in the slice's `PLAN###`.

### TPG enforcement is a Phase 2 release gate

`FR-RX-10/11` (List O/A/B enforcement, prohibited-drug block, mandatory diagnosis
before tele-Rx) is P1 — but it **must ship before `REQ026` (telemedicine) goes
live**. Teleconsult prescribing without it is a regulatory violation, not a
missing feature.

---

## 8. REQ023 — Billing depth

Extends the real Razorpay integration from `REQ004`; does not replace it.

- **Mixed/split tenders**: `PaymentTenders` child table on the bill — cash/UPI/card/netbanking/wallet/cheque/credit, multiple rows per invoice.
- **GST on patient payments** (F-17): mirror the GST fields that already exist on `PaymentTransactions` onto `AppointmentPayments` — place of supply, HSN/SAC, CGST/SGST/IGST, GSTIN. Without this a clinic cannot issue a compliant consultation invoice.
- **Gapless invoice numbering**: sequence table with row-level locking per `(branch_id, series, financial_year)` (PRD §14.2). **Shared with `REQ022` pharmacy** — one implementation.
- **Day-end close**: `Shifts` + `CashReconciliation` (expected vs. counted, denomination sheet, variance, handover).
- **Doctor revenue share**: `RevenueShareRules` per clinician-branch + `PayoutStatements` with a TDS field.
- **Dynamic UPI QR**: auto-detect via webhook **and** a scheduled poll (`FR-PAY-03` — never confirm on client-side callback alone).
- **F-07 fix** lands here if not already done in Phase F.

---

## 9. REQ032 — Subscription plan builder v1

PRD §18 names this an explicit MVP-GA exit criterion. Independent of the clinical
stack — parallelise it.

```prisma
model PlanVersions {
  id           String  @id @default(uuid())
  plan_id      String
  version      Int
  features_json Json                            // { pharmacy: true, telemedicine: false, ... }
  quotas_json   Json                            // { max_branches: 5, max_clinician_seats: 15, ... }
  metered_json  Json                            // { whatsapp_conversation: 90, sms: 20, ... } paise
  price_json    Json
  active        Boolean @default(true)
  @@unique([plan_id, version])
}
model UsageRecords { id String @id @default(uuid()) org_id String metric String qty Int period String recorded_at DateTime @default(now())
                     @@index([org_id, metric, period]) }
```

`OrganizationSubscriptions` gains `plan_version_id`, `seats_json`, `addons_json`.

**Entitlement enforcement** is the point of the whole module (`CLAUDE.md` already
records this as "not built"). Add an `EntitlementGuard` registered *after* the
existing guard chain, consulted by feature-flagged modules. Cache the resolved
entitlement set in Redis per tenant, invalidated on plan change — an
uncached per-request lookup becomes the same N+1-shaped cost F-15 flags.

**Versioning rule**: editing a live plan creates a new version; existing
subscribers stay grandfathered until explicitly migrated. Non-negotiable — it's
what stops a pricing change silently altering an existing contract.

---

## Phase 1 Definition of Done

- 10 design-partner clinics can run a full OPD day: book → check in → queue → consult → prescribe → bill.
- Session/token mode works alongside slot mode; the PRD's multi-resource acceptance example passes.
- Concurrent booking of one slot yields exactly one appointment (Phase F's test, now green).
- A signed encounter is immutable at the database layer; corrections are addenda.
- Every new table has indexes in its creating migration and a tenancy-matrix row.
- Plan entitlements actually gate feature access.
- No page in the Phase 1 surface renders data it didn't fetch.
