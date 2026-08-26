-- REQ131 -- a basic OPD cashless claim-tracking state machine (submitted ->
-- under_review -> approved | rejected; approved -> settled). No
-- client_org_id/clinic_id column -- scoped via
-- appointment -> clinic -> client_org_id.
CREATE TABLE "Claims" (
  "id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "payer_id" TEXT NOT NULL,
  "policy_id" TEXT,
  "claim_amount" INTEGER NOT NULL,
  "approved_amount" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "rejection_reason" TEXT,
  "submitted_by_user_id" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  "settled_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Claims_status_idx" ON "Claims"("status");
CREATE INDEX "Claims_patient_id_idx" ON "Claims"("patient_id");
CREATE INDEX "Claims_appointment_id_idx" ON "Claims"("appointment_id");
CREATE INDEX "Claims_payer_id_idx" ON "Claims"("payer_id");

ALTER TABLE "Claims" ADD CONSTRAINT "Claims_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Claims" ADD CONSTRAINT "Claims_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Claims" ADD CONSTRAINT "Claims_payer_id_fkey"
  FOREIGN KEY ("payer_id") REFERENCES "Payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Claims" ADD CONSTRAINT "Claims_policy_id_fkey"
  FOREIGN KEY ("policy_id") REFERENCES "PatientInsurancePolicies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Claims" ADD CONSTRAINT "Claims_submitted_by_user_id_fkey"
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
