-- REQ175/REQ176/REQ177 -- per-clinic payment gateway registry (Razorpay/
-- Cashfree/PayU/PhonePe), a real refund engine + manager-approval queue,
-- and pharmacy counter payments. All additive; every existing Razorpay-only
-- AppointmentPayments row keeps working unchanged (gateway defaults to
-- 'razorpay', refund_status defaults to 'none').

-- AlterTable: AppointmentPayments gains gateway + refund columns
ALTER TABLE "AppointmentPayments" ADD COLUMN "gateway" TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE "AppointmentPayments" ADD COLUMN "gateway_order_id" TEXT;
ALTER TABLE "AppointmentPayments" ADD COLUMN "gateway_payment_id" TEXT;
ALTER TABLE "AppointmentPayments" ADD COLUMN "gateway_reference" TEXT;
ALTER TABLE "AppointmentPayments" ADD COLUMN "refund_status" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "AppointmentPayments" ADD COLUMN "refund_amount" INTEGER;
ALTER TABLE "AppointmentPayments" ADD COLUMN "refund_reason" TEXT;
ALTER TABLE "AppointmentPayments" ADD COLUMN "refunded_at" TIMESTAMP(3);
ALTER TABLE "AppointmentPayments" ADD COLUMN "gateway_refund_id" TEXT;

-- CreateIndex
CREATE INDEX "AppointmentPayments_gateway_order_id_idx" ON "AppointmentPayments"("gateway_order_id");

-- CreateTable: PaymentGatewayConfig
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "provider" TEXT NOT NULL,
    "credentials_encrypted" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_clinic_id_key" ON "PaymentGatewayConfig"("clinic_id");

-- AddForeignKey
ALTER TABLE "PaymentGatewayConfig" ADD CONSTRAINT "PaymentGatewayConfig_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayConfig" ADD CONSTRAINT "PaymentGatewayConfig_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: RefundRequests
CREATE TABLE "RefundRequests" (
    "id" TEXT NOT NULL,
    "appointment_payment_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "requested_by_user_id" TEXT NOT NULL,
    "requested_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundRequests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefundRequests_client_org_id_status_idx" ON "RefundRequests"("client_org_id", "status");

-- CreateIndex
CREATE INDEX "RefundRequests_clinic_id_idx" ON "RefundRequests"("clinic_id");

-- CreateIndex
CREATE INDEX "RefundRequests_appointment_payment_id_idx" ON "RefundRequests"("appointment_payment_id");

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_appointment_payment_id_fkey" FOREIGN KEY ("appointment_payment_id") REFERENCES "AppointmentPayments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: PharmacyPayments
CREATE TABLE "PharmacyPayments" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "prescription_id" TEXT,
    "amount" INTEGER NOT NULL,
    "tenders_json" JSONB NOT NULL,
    "gstin" TEXT,
    "hsn_sac_code" TEXT,
    "gst_rate" DOUBLE PRECISION,
    "cgst_amount" INTEGER,
    "sgst_amount" INTEGER,
    "igst_amount" INTEGER,
    "recorded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyPayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PharmacyPayments_clinic_id_idx" ON "PharmacyPayments"("clinic_id");

-- CreateIndex
CREATE INDEX "PharmacyPayments_patient_id_idx" ON "PharmacyPayments"("patient_id");

-- CreateIndex
CREATE INDEX "PharmacyPayments_client_org_id_created_at_idx" ON "PharmacyPayments"("client_org_id", "created_at");

-- AddForeignKey
ALTER TABLE "PharmacyPayments" ADD CONSTRAINT "PharmacyPayments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyPayments" ADD CONSTRAINT "PharmacyPayments_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyPayments" ADD CONSTRAINT "PharmacyPayments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyPayments" ADD CONSTRAINT "PharmacyPayments_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "Prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyPayments" ADD CONSTRAINT "PharmacyPayments_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
