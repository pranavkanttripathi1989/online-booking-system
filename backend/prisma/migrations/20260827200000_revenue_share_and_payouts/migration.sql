-- REQ158 (P2-06) -- doctor revenue-share rules + monthly payouts.

CREATE TABLE "RevenueShareRules" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "clinic_id" TEXT,
    "clinician_id" TEXT,
    "share_percentage" DOUBLE PRECISION NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueShareRules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevenueShareRules_client_org_id_idx" ON "RevenueShareRules"("client_org_id");
CREATE INDEX "RevenueShareRules_clinic_id_idx" ON "RevenueShareRules"("clinic_id");
CREATE INDEX "RevenueShareRules_clinician_id_idx" ON "RevenueShareRules"("clinician_id");

ALTER TABLE "RevenueShareRules" ADD CONSTRAINT "RevenueShareRules_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueShareRules" ADD CONSTRAINT "RevenueShareRules_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueShareRules" ADD CONSTRAINT "RevenueShareRules_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Payouts" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "share_percentage_used" DOUBLE PRECISION NOT NULL,
    "payout_amount" INTEGER NOT NULL,
    "appointment_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "computed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payouts_clinician_id_clinic_id_period_start_key" ON "Payouts"("clinician_id", "clinic_id", "period_start");
CREATE INDEX "Payouts_client_org_id_period_start_idx" ON "Payouts"("client_org_id", "period_start");
CREATE INDEX "Payouts_clinic_id_period_start_idx" ON "Payouts"("clinic_id", "period_start");
CREATE INDEX "Payouts_clinician_id_idx" ON "Payouts"("clinician_id");

ALTER TABLE "Payouts" ADD CONSTRAINT "Payouts_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payouts" ADD CONSTRAINT "Payouts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payouts" ADD CONSTRAINT "Payouts_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
