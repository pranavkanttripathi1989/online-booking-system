-- REQ056 (US-BIL-03/US-BIL-04) -- discount approval + day-end cash close

-- AlterTable
ALTER TABLE "ClientOrganizations" ADD COLUMN "discount_approval_threshold_paise" INTEGER NOT NULL DEFAULT 100000;

-- AlterTable
ALTER TABLE "AppointmentPayments" ADD COLUMN "discount_amount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AppointmentPayments" ADD COLUMN "discount_reason" TEXT;
ALTER TABLE "AppointmentPayments" ADD COLUMN "approved_by_user_id" TEXT;

-- CreateTable
CREATE TABLE "DiscountApprovalRequests" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "requested_by_user_id" TEXT NOT NULL,
    "discount_amount" INTEGER NOT NULL,
    "discount_reason" TEXT NOT NULL,
    "expected_amount_paise" INTEGER NOT NULL,
    "tenders_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "resulting_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountApprovalRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrawerCloseouts" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "closed_by_user_id" TEXT NOT NULL,
    "business_date" TIMESTAMP(3) NOT NULL,
    "breakdown_json" JSONB NOT NULL,
    "total_expected_paise" INTEGER NOT NULL,
    "total_counted_paise" INTEGER NOT NULL,
    "variance_paise" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashDrawerCloseouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountApprovalRequests_client_org_id_status_idx" ON "DiscountApprovalRequests"("client_org_id", "status");

-- CreateIndex
CREATE INDEX "DiscountApprovalRequests_clinic_id_idx" ON "DiscountApprovalRequests"("clinic_id");

-- CreateIndex
CREATE INDEX "DiscountApprovalRequests_appointment_id_idx" ON "DiscountApprovalRequests"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "CashDrawerCloseouts_clinic_id_business_date_key" ON "CashDrawerCloseouts"("clinic_id", "business_date");

-- CreateIndex
CREATE INDEX "CashDrawerCloseouts_client_org_id_idx" ON "CashDrawerCloseouts"("client_org_id");

-- AddForeignKey
ALTER TABLE "AppointmentPayments" ADD CONSTRAINT "AppointmentPayments_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApprovalRequests" ADD CONSTRAINT "DiscountApprovalRequests_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApprovalRequests" ADD CONSTRAINT "DiscountApprovalRequests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApprovalRequests" ADD CONSTRAINT "DiscountApprovalRequests_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApprovalRequests" ADD CONSTRAINT "DiscountApprovalRequests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApprovalRequests" ADD CONSTRAINT "DiscountApprovalRequests_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerCloseouts" ADD CONSTRAINT "CashDrawerCloseouts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerCloseouts" ADD CONSTRAINT "CashDrawerCloseouts_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerCloseouts" ADD CONSTRAINT "CashDrawerCloseouts_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
