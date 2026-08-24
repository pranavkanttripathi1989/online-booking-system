-- REQ018 (US-BOOK-03) — prepayment policy on Products
-- REQ015 (US-SEC-07) — clinician verification fields
-- REQ029 (US-RPT-02) — patient acquisition_source
-- Hand-written per CLAUDE.md (prisma migrate dev cannot run non-interactively
-- here); DDL was drafted with `prisma migrate diff` against the live dev DB
-- then hand-filtered to remove unrelated pre-existing schema drift
-- (Appointments.type / UserProfiles.staff_status NOT NULL churn, already
-- documented in CLAUDE.md as "33 lines of schema-vs-database drift") and FK
-- constraint noise on tables this batch does not otherwise touch (relation
-- field reordering in schema.prisma makes prisma's diff tool re-emit
-- unrelated FK constraints — verified none of those are structural changes).

-- AlterTable
ALTER TABLE "Clinicians" ADD COLUMN     "medical_council" TEXT,
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'unverified',
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by_user_id" TEXT;

-- AlterTable
ALTER TABLE "Patients" ADD COLUMN     "acquisition_source" TEXT;

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "prepayment_policy" TEXT NOT NULL DEFAULT 'none';

-- CreateTable (REQ018 US-BOOK-05)
CREATE TABLE "BookingWidgetConfig" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "allowed_origins" JSONB NOT NULL,
    "short_link_slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingWidgetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable (REQ032 US-PLAN-01/02)
CREATE TABLE "Plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMP(3),
    "billing_period" TEXT NOT NULL,
    "price_paise" INTEGER NOT NULL,
    "feature_flags_json" JSONB NOT NULL,
    "quotas_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersions_pkey" PRIMARY KEY ("id")
);

-- CreateTable (REQ034)
CREATE TABLE "Consents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "notice_version" TEXT NOT NULL,

    CONSTRAINT "Consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RightsRequests" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sla_due_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RightsRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable (REQ022)
CREATE TABLE "DrugBatches" (
    "id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity_received" INTEGER NOT NULL,
    "quantity_remaining" INTEGER NOT NULL,
    "mrp_paise" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrugBatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovements" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "movement_type" TEXT NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "StockMovements_pkey" PRIMARY KEY ("id")
);

-- CreateTable (REQ030)
CREATE TABLE "WebhookEndpoints" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "event_types_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEndpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDeliveryLog" (
    "id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "http_status" INTEGER,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_snippet" TEXT,

    CONSTRAINT "WebhookDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable (REQ031)
CREATE TABLE "Payers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payer_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayerEmpanelments" (
    "id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "renewal_reminder_date" TIMESTAMP(3),

    CONSTRAINT "PayerEmpanelments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientInsurancePolicies" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "policy_holder_name" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientInsurancePolicies_pkey" PRIMARY KEY ("id")
);

-- CreateTable (REQ015 US-SEC-08)
CREATE TABLE "ApiKeys" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable (REQ029 US-RPT-03)
CREATE TABLE "ScheduledReports" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "recipients_json" JSONB NOT NULL,
    "cadence" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "last_sent_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledReports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingWidgetConfig_short_link_slug_key" ON "BookingWidgetConfig"("short_link_slug");
CREATE INDEX "BookingWidgetConfig_client_org_id_idx" ON "BookingWidgetConfig"("client_org_id");
CREATE INDEX "BookingWidgetConfig_clinic_id_idx" ON "BookingWidgetConfig"("clinic_id");

CREATE INDEX "PlanVersions_plan_id_idx" ON "PlanVersions"("plan_id");
CREATE UNIQUE INDEX "PlanVersions_plan_id_version_key" ON "PlanVersions"("plan_id", "version");

CREATE INDEX "Consents_patient_id_idx" ON "Consents"("patient_id");
CREATE INDEX "Consents_client_org_id_idx" ON "Consents"("client_org_id");

CREATE INDEX "RightsRequests_patient_id_idx" ON "RightsRequests"("patient_id");
CREATE INDEX "RightsRequests_client_org_id_status_idx" ON "RightsRequests"("client_org_id", "status");

CREATE INDEX "DrugBatches_drug_id_idx" ON "DrugBatches"("drug_id");
CREATE INDEX "DrugBatches_clinic_id_client_org_id_idx" ON "DrugBatches"("clinic_id", "client_org_id");
CREATE INDEX "DrugBatches_expiry_date_idx" ON "DrugBatches"("expiry_date");

CREATE INDEX "StockMovements_batch_id_idx" ON "StockMovements"("batch_id");

CREATE INDEX "WebhookEndpoints_client_org_id_idx" ON "WebhookEndpoints"("client_org_id");
CREATE INDEX "WebhookDeliveryLog_endpoint_id_attempted_at_idx" ON "WebhookDeliveryLog"("endpoint_id", "attempted_at");

CREATE INDEX "PayerEmpanelments_client_org_id_idx" ON "PayerEmpanelments"("client_org_id");
CREATE UNIQUE INDEX "PayerEmpanelments_payer_id_clinic_id_key" ON "PayerEmpanelments"("payer_id", "clinic_id");

CREATE INDEX "PatientInsurancePolicies_patient_id_idx" ON "PatientInsurancePolicies"("patient_id");
CREATE INDEX "PatientInsurancePolicies_client_org_id_idx" ON "PatientInsurancePolicies"("client_org_id");

CREATE INDEX "ApiKeys_client_org_id_idx" ON "ApiKeys"("client_org_id");
CREATE INDEX "ApiKeys_key_prefix_idx" ON "ApiKeys"("key_prefix");

CREATE INDEX "ScheduledReports_client_org_id_is_active_idx" ON "ScheduledReports"("client_org_id", "is_active");

-- AddForeignKey
ALTER TABLE "BookingWidgetConfig" ADD CONSTRAINT "BookingWidgetConfig_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingWidgetConfig" ADD CONSTRAINT "BookingWidgetConfig_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlanVersions" ADD CONSTRAINT "PlanVersions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Consents" ADD CONSTRAINT "Consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Consents" ADD CONSTRAINT "Consents_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RightsRequests" ADD CONSTRAINT "RightsRequests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RightsRequests" ADD CONSTRAINT "RightsRequests_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DrugBatches" ADD CONSTRAINT "DrugBatches_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DrugBatches" ADD CONSTRAINT "DrugBatches_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DrugBatches" ADD CONSTRAINT "DrugBatches_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovements" ADD CONSTRAINT "StockMovements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "DrugBatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WebhookEndpoints" ADD CONSTRAINT "WebhookEndpoints_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebhookDeliveryLog" ADD CONSTRAINT "WebhookDeliveryLog_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "WebhookEndpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PayerEmpanelments" ADD CONSTRAINT "PayerEmpanelments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "Payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayerEmpanelments" ADD CONSTRAINT "PayerEmpanelments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayerEmpanelments" ADD CONSTRAINT "PayerEmpanelments_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientInsurancePolicies" ADD CONSTRAINT "PatientInsurancePolicies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientInsurancePolicies" ADD CONSTRAINT "PatientInsurancePolicies_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "Payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientInsurancePolicies" ADD CONSTRAINT "PatientInsurancePolicies_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApiKeys" ADD CONSTRAINT "ApiKeys_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduledReports" ADD CONSTRAINT "ScheduledReports_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
