-- REQ023 (US-BIL-01, scoped subset) -- mixed-tender counter billing.

CREATE TABLE "PaymentTenders" (
  "id" TEXT NOT NULL,
  "appointment_payment_id" TEXT NOT NULL,
  "tender_type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reference" TEXT,
  "recorded_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentTenders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentTenders_appointment_payment_id_idx" ON "PaymentTenders"("appointment_payment_id");

ALTER TABLE "PaymentTenders" ADD CONSTRAINT "PaymentTenders_appointment_payment_id_fkey"
  FOREIGN KEY ("appointment_payment_id") REFERENCES "AppointmentPayments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentTenders" ADD CONSTRAINT "PaymentTenders_recorded_by_user_id_fkey"
  FOREIGN KEY ("recorded_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
