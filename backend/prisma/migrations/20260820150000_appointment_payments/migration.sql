-- REQ004 — real per-appointment patient payments via Razorpay. Deliberately
-- separate from PaymentTransactions (tenant SaaS-subscription billing only,
-- no appointment_id/patient_id at all) -- see the schema.prisma comment on
-- this model for the full rationale.

-- CreateTable
CREATE TABLE "AppointmentPayments" (
  "id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "client_org_id" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL,
  "razorpay_order_id" TEXT,
  "razorpay_payment_id" TEXT,
  "razorpay_signature" TEXT,
  "gstin" TEXT,
  "hsn_sac_code" TEXT,
  "gst_rate" DOUBLE PRECISION,
  "cgst_amount" INTEGER,
  "sgst_amount" INTEGER,
  "igst_amount" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppointmentPayments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AppointmentPayments" ADD CONSTRAINT "AppointmentPayments_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayments" ADD CONSTRAINT "AppointmentPayments_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayments" ADD CONSTRAINT "AppointmentPayments_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayments" ADD CONSTRAINT "AppointmentPayments_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
