-- REQ179 (IPD slice 4) -- the billing ledger. Hand-written per this repo's
-- standing convention (prisma migrate dev cannot run non-interactively here).

-- ============================================================
-- Two small additive columns on tables that already exist.
-- ============================================================
ALTER TABLE "IpdBillingSettings" ADD COLUMN "doctor_visit_charge_product_id" TEXT;
ALTER TABLE "OperationTheatres" ADD COLUMN "usage_charge_product_id" TEXT;

ALTER TABLE "IpdBillingSettings" ADD CONSTRAINT "IpdBillingSettings_doctor_visit_charge_product_id_fkey" FOREIGN KEY ("doctor_visit_charge_product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperationTheatres" ADD CONSTRAINT "OperationTheatres_usage_charge_product_id_fkey" FOREIGN KEY ("usage_charge_product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- IpdPackages / IpdPackageInclusions -- created before IpdBills since
-- IpdBills.package_id FKs to it.
-- ============================================================
CREATE TABLE "IpdPackages" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "specialty" TEXT,
  "price_paise" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpdPackages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IpdPackages_client_org_id_clinic_id_is_active_idx" ON "IpdPackages"("client_org_id", "clinic_id", "is_active");

CREATE TABLE "IpdPackageInclusions" (
  "id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "max_quantity" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpdPackageInclusions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IpdPackageInclusions_package_id_product_id_key" ON "IpdPackageInclusions"("package_id", "product_id");

-- ============================================================
-- IpdBills -- the header. gross_paise/paid_paise are MAINTAINED running
-- totals (see the schema.prisma file-header comment on why).
-- ============================================================
CREATE TABLE "IpdBills" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "bill_number" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "package_id" TEXT,
  "gross_paise" INTEGER NOT NULL DEFAULT 0,
  "paid_paise" INTEGER NOT NULL DEFAULT 0,
  "finalized_at" TIMESTAMP(3),
  "finalized_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IpdBills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IpdBills_admission_id_key" ON "IpdBills"("admission_id");
CREATE INDEX "IpdBills_client_org_id_clinic_id_status_idx" ON "IpdBills"("client_org_id", "clinic_id", "status");

-- ============================================================
-- IpdCharges -- the ledger. Append-only: a wrong charge is reversed by a
-- signed negative row, never deleted or edited in place.
-- ============================================================
CREATE TABLE "IpdCharges" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "bill_id" TEXT NOT NULL,
  "charge_type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "service_date" TIMESTAMP(3) NOT NULL,
  "product_id" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price_paise" INTEGER NOT NULL,
  "total_paise" INTEGER NOT NULL,
  "gst_rate" DOUBLE PRECISION,
  "gst_amount_paise" INTEGER,
  "is_reversed" BOOLEAN NOT NULL DEFAULT false,
  "is_package_inclusive" BOOLEAN NOT NULL DEFAULT false,
  "bed_occupancy_id" TEXT,
  "source_reference_type" TEXT,
  "source_reference_id" TEXT,
  "posted_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpdCharges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IpdCharges_bill_id_idx" ON "IpdCharges"("bill_id");
CREATE INDEX "IpdCharges_admission_id_service_date_idx" ON "IpdCharges"("admission_id", "service_date");
CREATE INDEX "IpdCharges_client_org_id_charge_type_idx" ON "IpdCharges"("client_org_id", "charge_type");

-- Idempotency for the room-day/nursing accrual walk (cron + on-read
-- catch-up, PLAN251's own account of why both paths exist) -- a partial
-- unique index, which Prisma's schema DSL cannot express directly, so it
-- is declared here only. One row per (admission, occupancy, calendar day)
-- per charge_type, ignoring reversed rows so a reversed-then-reposted day
-- is not permanently blocked.
CREATE UNIQUE INDEX "ipd_charges_room_day_once_per_occupancy_day"
ON "IpdCharges" (admission_id, bed_occupancy_id, service_date)
WHERE charge_type = 'room_day' AND is_reversed = false;

CREATE UNIQUE INDEX "ipd_charges_nursing_once_per_occupancy_day"
ON "IpdCharges" (admission_id, bed_occupancy_id, service_date)
WHERE charge_type = 'nursing' AND is_reversed = false;

-- One doctor-visit charge per clinician per day -- source_reference_id
-- holds the clinician id for a doctor_visit row (source_reference_type =
-- 'clinician').
CREATE UNIQUE INDEX "ipd_charges_doctor_visit_once_per_clinician_day"
ON "IpdCharges" (admission_id, source_reference_id, service_date)
WHERE charge_type = 'doctor_visit' AND is_reversed = false;

-- ============================================================
-- IpdPayments
-- ============================================================
CREATE TABLE "IpdPayments" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "bill_id" TEXT NOT NULL,
  "payment_type" TEXT NOT NULL,
  "amount_paise" INTEGER NOT NULL,
  "tenders_json" JSONB NOT NULL,
  "receipt_number" TEXT NOT NULL,
  "notes" TEXT,
  "recorded_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpdPayments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IpdPayments_bill_id_idx" ON "IpdPayments"("bill_id");
CREATE INDEX "IpdPayments_admission_id_idx" ON "IpdPayments"("admission_id");

-- ============================================================
-- Foreign keys
-- ============================================================
ALTER TABLE "IpdPackageInclusions" ADD CONSTRAINT "IpdPackageInclusions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "IpdPackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IpdPackageInclusions" ADD CONSTRAINT "IpdPackageInclusions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IpdPackages" ADD CONSTRAINT "IpdPackages_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdPackages" ADD CONSTRAINT "IpdPackages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IpdBills" ADD CONSTRAINT "IpdBills_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdBills" ADD CONSTRAINT "IpdBills_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdBills" ADD CONSTRAINT "IpdBills_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdBills" ADD CONSTRAINT "IpdBills_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "IpdPackages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IpdBills" ADD CONSTRAINT "IpdBills_finalized_by_user_id_fkey" FOREIGN KEY ("finalized_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IpdCharges" ADD CONSTRAINT "IpdCharges_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdCharges" ADD CONSTRAINT "IpdCharges_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdCharges" ADD CONSTRAINT "IpdCharges_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdCharges" ADD CONSTRAINT "IpdCharges_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "IpdBills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdCharges" ADD CONSTRAINT "IpdCharges_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IpdCharges" ADD CONSTRAINT "IpdCharges_bed_occupancy_id_fkey" FOREIGN KEY ("bed_occupancy_id") REFERENCES "BedOccupancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IpdCharges" ADD CONSTRAINT "IpdCharges_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IpdPayments" ADD CONSTRAINT "IpdPayments_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdPayments" ADD CONSTRAINT "IpdPayments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdPayments" ADD CONSTRAINT "IpdPayments_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdPayments" ADD CONSTRAINT "IpdPayments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "IpdBills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IpdPayments" ADD CONSTRAINT "IpdPayments_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
