-- REQ106 — waitlist for a fully-booked clinician/date, notify-only with a
-- time-boxed claim window (no auto-booking, per this slice's own design
-- decision against double-booking risk in hybrid mode).

CREATE TYPE "WaitlistStatus" AS ENUM ('waiting', 'notified', 'claimed', 'expired', 'cancelled');

CREATE TABLE "WaitlistEntries" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "waitlist_date" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'waiting',
    "position" INTEGER NOT NULL,
    "notified_at" TIMESTAMP(3),
    "claim_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntries_pkey" PRIMARY KEY ("id")
);

-- F-13 — lead with the selective column (clinician_id), not client_org_id.
CREATE INDEX "WaitlistEntries_clinician_id_waitlist_date_status_idx" ON "WaitlistEntries"("clinician_id", "waitlist_date", "status");
CREATE INDEX "WaitlistEntries_client_org_id_idx" ON "WaitlistEntries"("client_org_id");
CREATE INDEX "WaitlistEntries_patient_id_idx" ON "WaitlistEntries"("patient_id");

ALTER TABLE "WaitlistEntries" ADD CONSTRAINT "WaitlistEntries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntries" ADD CONSTRAINT "WaitlistEntries_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntries" ADD CONSTRAINT "WaitlistEntries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
