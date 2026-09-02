-- REQ179 (IPD slice 3) -- operation theatre scheduling. Hand-written per
-- this repo's standing convention (prisma migrate dev cannot run
-- non-interactively here).

-- ============================================================
-- Drugs.item_type -- drug | consumable | implant | surgical_item | oxygen.
-- Defaults to 'drug' so every existing drug picker (prescription builder,
-- MAR order search) keeps working unchanged -- none of them pass this
-- filter explicitly, and the resolver defaults it to 'drug' when omitted.
-- ============================================================
ALTER TABLE "Drugs" ADD COLUMN "item_type" TEXT NOT NULL DEFAULT 'drug';
CREATE INDEX "Drugs_item_type_idx" ON "Drugs"("item_type");

-- ============================================================
-- OperationTheatres
-- ============================================================
CREATE TABLE "OperationTheatres" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "default_turnaround_minutes" INTEGER NOT NULL DEFAULT 30,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationTheatres_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OperationTheatres_client_org_id_clinic_id_is_active_idx" ON "OperationTheatres"("client_org_id", "clinic_id", "is_active");

-- ============================================================
-- OtBookings (+ theatre-overlap and surgeon-overlap EXCLUDE constraints)
-- ============================================================
CREATE TABLE "OtBookings" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "theatre_id" TEXT NOT NULL,
  "admission_id" TEXT NOT NULL,
  "procedure_name" TEXT NOT NULL,
  "primary_surgeon_clinician_id" TEXT NOT NULL,
  "anesthetist_clinician_id" TEXT,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "turnaround_minutes" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
  "cancel_reason" TEXT,
  "notes" TEXT,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OtBookings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ot_bookings_end_after_start" CHECK ("end_at" > "start_at")
);
CREATE INDEX "OtBookings_theatre_id_start_at_idx" ON "OtBookings"("theatre_id", "start_at");
CREATE INDEX "OtBookings_admission_id_idx" ON "OtBookings"("admission_id");
CREATE INDEX "OtBookings_client_org_id_status_start_at_idx" ON "OtBookings"("client_org_id", "status", "start_at");
CREATE INDEX "OtBookings_primary_surgeon_clinician_id_start_at_idx" ON "OtBookings"("primary_surgeon_clinician_id", "start_at");

-- btree_gist was already created in 20260902110000_ipd_adt_core;
-- IF NOT EXISTS makes this idempotent regardless of migration order.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Turnaround is folded directly into the excluded range -- never padded in
-- application code -- so the one column (turnaround_minutes, snapshotted
-- from the theatre's own default at booking time) is the single source of
-- truth for how long a theatre stays physically blocked after a procedure
-- ends. '[)' bounds: a booking starting exactly when another's turnaround
-- ends is a clean handover, not a collision.
ALTER TABLE "OtBookings" ADD CONSTRAINT "ot_bookings_no_theatre_overlap"
EXCLUDE USING gist (
  theatre_id WITH =,
  tsrange(start_at, end_at + (turnaround_minutes * INTERVAL '1 minute'), '[)') WITH &&
)
WHERE (is_cancelled = false);

-- Surgeon-overlap deliberately does NOT include turnaround -- turnaround is
-- theatre cleaning time, not a constraint on the surgeon's own calendar.
ALTER TABLE "OtBookings" ADD CONSTRAINT "ot_bookings_no_surgeon_overlap"
EXCLUDE USING gist (
  primary_surgeon_clinician_id WITH =,
  tsrange(start_at, end_at, '[)') WITH &&
)
WHERE (is_cancelled = false);

-- ============================================================
-- OtBookingStaff / OtChecklists (WHO Surgical Safety Checklist, 3 phases)
-- ============================================================
CREATE TABLE "OtBookingStaff" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtBookingStaff_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OtBookingStaff_booking_id_idx" ON "OtBookingStaff"("booking_id");

CREATE TABLE "OtChecklists" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "phase" TEXT NOT NULL,
  "items_json" JSONB NOT NULL,
  "completed_by_user_id" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtChecklists_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OtChecklists_booking_id_phase_key" ON "OtChecklists"("booking_id", "phase");

-- ============================================================
-- OtNotes (+ the reject_write_if_locked() trigger from
-- 20260902210000_ipd_nursing_charting -- reused, not redefined)
-- ============================================================
CREATE TABLE "OtNotes" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "pre_op_diagnosis" TEXT NOT NULL DEFAULT '',
  "procedure_performed" TEXT NOT NULL DEFAULT '',
  "findings" TEXT NOT NULL DEFAULT '',
  "complications" TEXT NOT NULL DEFAULT '',
  "post_op_diagnosis" TEXT NOT NULL DEFAULT '',
  "post_op_instructions" TEXT NOT NULL DEFAULT '',
  "author_clinician_id" TEXT NOT NULL,
  "signed_at" TIMESTAMP(3),
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OtNotes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OtNotes_booking_id_key" ON "OtNotes"("booking_id");

CREATE TRIGGER ot_notes_lock_guard
  BEFORE UPDATE OR DELETE ON "OtNotes"
  FOR EACH ROW EXECUTE FUNCTION reject_write_if_locked();

-- ============================================================
-- OtConsumables -- real stock consumption, charge_id stays null this
-- slice (billing backfills it in slice 4, a stated gap).
-- ============================================================
CREATE TABLE "OtConsumables" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "drug_id" TEXT NOT NULL,
  "batch_id" TEXT,
  "quantity" INTEGER NOT NULL,
  "implant_serial_no" TEXT,
  "charge_id" TEXT,
  "stock_movement_id" TEXT,
  "recorded_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtConsumables_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OtConsumables_booking_id_idx" ON "OtConsumables"("booking_id");

-- ============================================================
-- Foreign keys
-- ============================================================
ALTER TABLE "OperationTheatres" ADD CONSTRAINT "OperationTheatres_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationTheatres" ADD CONSTRAINT "OperationTheatres_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OtBookings" ADD CONSTRAINT "OtBookings_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtBookings" ADD CONSTRAINT "OtBookings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtBookings" ADD CONSTRAINT "OtBookings_theatre_id_fkey" FOREIGN KEY ("theatre_id") REFERENCES "OperationTheatres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtBookings" ADD CONSTRAINT "OtBookings_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtBookings" ADD CONSTRAINT "OtBookings_primary_surgeon_clinician_id_fkey" FOREIGN KEY ("primary_surgeon_clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtBookings" ADD CONSTRAINT "OtBookings_anesthetist_clinician_id_fkey" FOREIGN KEY ("anesthetist_clinician_id") REFERENCES "Clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OtBookingStaff" ADD CONSTRAINT "OtBookingStaff_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "OtBookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OtBookingStaff" ADD CONSTRAINT "OtBookingStaff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OtChecklists" ADD CONSTRAINT "OtChecklists_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "OtBookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OtChecklists" ADD CONSTRAINT "OtChecklists_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OtNotes" ADD CONSTRAINT "OtNotes_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtNotes" ADD CONSTRAINT "OtNotes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "OtBookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtNotes" ADD CONSTRAINT "OtNotes_author_clinician_id_fkey" FOREIGN KEY ("author_clinician_id") REFERENCES "Clinicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OtConsumables" ADD CONSTRAINT "OtConsumables_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtConsumables" ADD CONSTRAINT "OtConsumables_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "OtBookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OtConsumables" ADD CONSTRAINT "OtConsumables_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "Drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtConsumables" ADD CONSTRAINT "OtConsumables_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "DrugBatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OtConsumables" ADD CONSTRAINT "OtConsumables_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
