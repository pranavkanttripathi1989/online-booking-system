-- REQ019 (Phase 1, slice 4) -- check-in, live queue board, and queue
-- actions, P0 subset.

CREATE TABLE "QueueEntries" (
  "id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "clinician_id" TEXT NOT NULL,
  "token_no" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "called_at" TIMESTAMP(3),
  "skip_return_after" INTEGER,
  "served_since_skip" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QueueEntries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QueueEntries_appointment_id_key" ON "QueueEntries"("appointment_id");
CREATE INDEX "QueueEntries_clinic_id_status_idx" ON "QueueEntries"("clinic_id", "status");
CREATE INDEX "QueueEntries_clinician_id_status_idx" ON "QueueEntries"("clinician_id", "status");

ALTER TABLE "QueueEntries" ADD CONSTRAINT "QueueEntries_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QueueEntries" ADD CONSTRAINT "QueueEntries_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QueueEntries" ADD CONSTRAINT "QueueEntries_clinician_id_fkey"
  FOREIGN KEY ("clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "QueueEvents" (
  "id" TEXT NOT NULL,
  "queue_entry_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "changed_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QueueEvents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QueueEvents_queue_entry_id_created_at_idx" ON "QueueEvents"("queue_entry_id", "created_at");

ALTER TABLE "QueueEvents" ADD CONSTRAINT "QueueEvents_queue_entry_id_fkey"
  FOREIGN KEY ("queue_entry_id") REFERENCES "QueueEntries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QueueEvents" ADD CONSTRAINT "QueueEvents_changed_by_user_id_fkey"
  FOREIGN KEY ("changed_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
