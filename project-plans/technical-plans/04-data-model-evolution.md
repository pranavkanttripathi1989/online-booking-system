---
id: TECH005
type: technical-plan
feature: technical-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: TECH000
related: [TECH001, TECH002, TECH003, TECH006]
---

# 04 — Data model evolution and migration strategy

Consult this whenever you touch `backend/prisma/schema.prisma`.

## 1. The migration constraint that governs everything

**`prisma migrate dev` cannot run non-interactively in this environment** —
confirmed, it refuses even with `--create-only`. Every schema change ships as a
**hand-written** `backend/prisma/migrations/<timestamp>_<name>/migration.sql`,
applied with `prisma migrate deploy`.

Consequences you must internalise:

- There is **no diff/review safety net**. Read every migration end-to-end against the `schema.prisma` diff before applying, every time.
- Match Prisma's own naming conventions exactly, or `migrate deploy` and the schema drift apart: constraints are `"Table_column_fkey"`, indexes `"Table_column_idx"`, quoted PascalCase table names, quoted snake_case columns.
- After `prisma generate`, **always** `docker restart medibook_backend` — the running watch process caches the old client types and produces stale "property does not exist" errors otherwise.
- Never run `npm run build` in the container that has the `start:dev` watch running — it corrupts `dist/` and crashes the app.

### Reference: the established backfill pattern

`20260821000000_products_client_org_id/migration.sql` is the model to copy when
adding a tenant column to an existing table — add column, add FK, then backfill
from real relational evidence, leaving genuinely-unknowable rows `NULL`:

```sql
ALTER TABLE "Products" ADD COLUMN "client_org_id" TEXT;
ALTER TABLE "Products" ADD CONSTRAINT "Products_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Products" p SET "client_org_id" = sub.client_org_id
FROM ( SELECT DISTINCT ON (a."product_id") a."product_id", c."client_org_id"
       FROM "Appointments" a JOIN "Clinics" c ON c."id" = a."clinic_id"
       WHERE a."product_id" IS NOT NULL AND c."client_org_id" IS NOT NULL
       ORDER BY a."product_id", a."created_at" ASC ) sub
WHERE p."id" = sub."product_id" AND p."client_org_id" IS NULL;
```

## 2. Phase F migrations

### 2.1 `<ts>_patients_client_org_id`

Closes F-04. Same shape as the Products precedent above: add
`Patients.client_org_id` + FK, backfill from the earliest appointment's clinic
org, leave appointment-less patients `NULL`.

Once this lands, `patients.service.ts`'s `orgScope()` switches from the relation
filter to the direct column, and the `{ appointments: { none: {} } }` escape
hatch — which is what makes a new patient cross-tenant readable — is **removed**.
Both changes belong in the same slice as the migration.

### 2.2 `<ts>_add_indexes` — the big one

Zero `@@index` exist across 41 models today. Minimum set, by access pattern:

| Table | Index | Why |
|---|---|---|
| `Appointments` | `(clinician_id, appointment_date)` | the core booking query |
| `Appointments` | `(clinic_id, appointment_date)` | branch day view |
| `Appointments` | `(patient_id)` | patient timeline |
| `Appointments` | `(status, is_deleted)` | status filters |
| `Patients` | `(client_org_id)` after 2.1 | tenant scoping |
| `Patients` | lower(email), lower(phone), name trigram | front-desk search |
| `Clinics` | `(client_org_id)` | tenant scoping |
| `Clinicians` | `(clinic_id)` | roster |
| `Products` | `(client_org_id, is_active)` | catalogue |
| `Notifications` | `(user_id, created_at)` | the bell dropdown |
| `Messages` | `(thread_id, created_at)` | thread render |
| `MessageParticipants` | `(user_id)` | my-threads |
| `AuditLogs` | `(user_id, created_at)`, `(resource, resource_id)` | audit search |
| `AppointmentPayments` | `(appointment_id)`, `(razorpay_order_id)` | payment lookup + webhook |
| `ClinicianAvailability` | `(clinician_id, day_of_week)` | slot generation |
| `SpacerBlocks`/`RoomBlocks` | `(clinician_id\|room_id, date)` | conflict checks |
| `UserProfiles` | `(client_org_id, role_id)` | user directory |
| `TestResults` | `(ordered_by_user_id)`, `(patient_id)` | scoping + patient view |

Verify with `EXPLAIN ANALYZE` at seeded volume — do not assume.

### 2.3 `<ts>_appointment_exclusion_constraints`

`btree_gist` extension + generated `time_range` column + clinician/room exclusion
constraints. Full SQL in `01-phase1-mvp.md` §3.3. Technically Phase 1 work, but
land it as early as the concurrency test allows.

## 3. New tables by phase

### 3.1 Phase 1

`Departments`, `Resources`, `AppointmentResources`, `Drugs`,
`ClinicianFavourites`, `Waitlist`, `QueueEntries`, `QueueEvents`, `Encounters`,
`EncounterNotes`, `EncounterAddenda`, `Vitals`, `Diagnoses`, `Attachments`,
`EncounterTemplates`, `Prescriptions`, `PrescriptionItems`, `TpgDrugLists`,
`PatientRelation`, `PatientMerge`, `IntakeFormFields`, `BookingWidgetConfig`,
`ImportBatches`, `PaymentTenders`, `Shifts`, `CashReconciliation`,
`RevenueShareRules`, `PayoutStatements`, `CorporateAccounts`, `PlanVersions`,
`UsageRecords`, `PlatformInvoices`.

Column additions: `Clinics.hfr_facility_id`, `Clinics.letterhead_asset_id`;
`ClinicianAvailability.{mode,capacity,overbook_allowance,walkin_ratio}`;
`Appointments.token_no`; `Services.{prepayment_policy,reschedule_limit,no_show_grace_minutes}`;
`AppointmentPayments.{gst fields}`; `Products.{inherit_mode,parent_service_id,hsn,is_tax_exempt}`.

### 3.2 Phase 2

`SenderIdentities`, `MessageCreditWallets`, `Stores`, `Batches`, `StockLedger`,
`Dispenses`, `PurchaseOrders`, `GoodsReceiptNotes`, `StockTransfers`,
`TelemedicineSessions`, `CareContexts`, `Consents`, `DisclosureLog`,
`RightsRequests`, `RetentionPolicies`, `Payers`, `Empanelments`, `Tariffs`,
`PatientPolicies`, `BenefitWallets`, `EligibilityChecks`, `ApiKeys`,
`WebhookSubscriptions`, `WebhookDeliveryLog`, `PaymentMandates`,
`PreDebitNotifications`, `BreakGlassGrants`, `ImpersonationGrants`,
`CannedReplies`, `MessageAttachments`.

Column additions: `Patients.{abha_number,abha_address}`;
`Clinicians.{registration_number,council,hpr_id,verified_at}`;
`MessageThreads.{thread_type,assigned_to,sla_due_at,is_clinical}`.

### 3.3 Phase 3

`PreAuths`, `PreAuthEvents`, `Claims`, `ClaimDeductions`, `ClaimDocuments`,
`Remittances`, `SchemeCases`, `NonPayableItems`, `PayerRules`, lab/IPD-lite
tables, `FeatureFlags`/`FlagAssignments`.

### 3.4 The shared `Consents` table (Phase 2 — build once)

Serves both ABDM (`REQ028`) and DPDP (`REQ034`). Two consent systems for one
concept would be a product failure, not just duplication.

```prisma
model Consents {
  id           String    @id @default(uuid())
  patient_id   String
  purpose      String                          // treatment|communications|marketing|record_sharing|abdm_fetch
  scope        Json?                           // what specifically, for ABDM artefacts
  granted_at   DateTime?
  expires_at   DateTime?
  revoked_at   DateTime?
  artefact_ref String?                         // ABDM consent-artefact id where applicable
  notice_version String?                       // which privacy-notice text was shown (DPDP)
  created_at   DateTime  @default(now())

  @@index([patient_id, purpose, revoked_at])
  @@index([artefact_ref])
}
```

## 4. Constraints beyond indexes

Per PRD §14.2, plus this codebase's own findings:

| Constraint | Table | Phase |
|---|---|---|
| Exclusion on clinician/room time range | `Appointments` | 1 |
| Immutability trigger after sign | `Encounters`, `EncounterNotes` | 1 |
| Gapless sequence per `(branch, series, FY)` | invoice numbering | 1 (shared with pharmacy in 2) |
| `@@unique([appointment_id, resource_id])` | `AppointmentResources` | 1 |
| Append-only (no update/delete) | `StockLedger` | 2 |
| Tariff immutable once claim-referenced | `Tariffs` | 3 |
| `@@unique([payer_id, patient_id, admission_date, procedure_code])` | `Claims` | 3 |

## 5. The standing rule for every new table

From `REQ035`, and it is a code-review gate, not a follow-up task:

> A migration that creates a tenant-scoped table **must** declare its indexes in
> the same file. A new table with no index on its scoping column does not merit
> review.

Rationale: retrofitting indexing across ~40 new tables costs far more than
adding two lines per table now — and we already know exactly what that
retrofit costs, because Phase F is paying it for the existing 41.

## 6. Row-level security — deliberately not adopted

The PRD (§7.2, §7.3) specifies PostgreSQL RLS with `organization_id` on every row
as defence-in-depth beneath the application layer.

**Recommendation: don't adopt RLS in Phase 1.** Reasons specific to this codebase:

- Prisma's RLS support requires per-request session variables (`SET LOCAL`), which means a connection-per-request or transaction-wrapped pattern that the current `PrismaService` singleton doesn't have.
- The application-layer fix (Phase F's shared `orgScope`) plus the tenancy matrix closes the actual live vulnerability and is verifiable today.
- Adding RLS *and* application scoping without the integration test would produce two half-trusted layers, which is worse than one well-tested one.

**Revisit when:** the tenancy matrix is green and stable, and either an enterprise
buyer requires it contractually or the schema-per-tenant Enterprise option
(PRD §7.3) is actually built. Log the decision in `context/open-questions.md`
rather than leaving the PRD's requirement silently unmet.
