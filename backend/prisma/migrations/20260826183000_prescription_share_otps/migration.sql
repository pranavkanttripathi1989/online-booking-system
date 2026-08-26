-- REQ109 -- OTP-gated WhatsApp sharing of a prescription PDF. A durable
-- table (not Redis) since attempts/consumed_at double as the audit trail
-- for whether a shared prescription was ever actually retrieved.

CREATE TABLE "PrescriptionShareOtps" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionShareOtps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrescriptionShareOtps_prescription_id_idx" ON "PrescriptionShareOtps"("prescription_id");

ALTER TABLE "PrescriptionShareOtps" ADD CONSTRAINT "PrescriptionShareOtps_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "Prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
