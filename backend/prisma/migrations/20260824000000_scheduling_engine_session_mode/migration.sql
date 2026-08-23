-- REQ017 (Phase 1, slice 1) -- dual-mode scheduling: session/token mode,
-- multi-resource intersection booking, and extending the existing
-- slot-integrity exclusion constraints to be mode-aware.

-- ClinicianAvailability: mode discriminator + session/hybrid fields.
-- Default 'slot' on every existing row preserves current behavior exactly.
ALTER TABLE "ClinicianAvailability" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'slot';
ALTER TABLE "ClinicianAvailability" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "ClinicianAvailability" ADD COLUMN "overbook_allowance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClinicianAvailability" ADD COLUMN "walkin_ratio" INTEGER;

-- Appointments: booking_mode denormalizes the matching availability row's
-- mode at booking time (existing rows default to 'slot', correctly, since
-- session/hybrid mode did not exist before this migration). token_no is
-- the sequential 1..N position within one session/hybrid window.
ALTER TABLE "Appointments" ADD COLUMN "booking_mode" TEXT NOT NULL DEFAULT 'slot';
ALTER TABLE "Appointments" ADD COLUMN "token_no" INTEGER;

-- Narrow the two existing exclusion constraints (20260823030000/20260823031500)
-- to booking_mode='slot'. Session/hybrid mode deliberately allows many rows
-- to share the same clinician/room/time -- that is the entire point of a
-- session; capacity there is enforced by a pg_advisory_xact_lock-guarded
-- count check in appointments.service.ts, not by DB-level time exclusion.
-- Postgres has no ALTER CONSTRAINT for an EXCLUDE predicate -- drop and
-- recreate is the only way to change the WHERE clause.
ALTER TABLE "Appointments" DROP CONSTRAINT "appointments_no_overlapping_booking";
ALTER TABLE "Appointments" ADD CONSTRAINT "appointments_no_overlapping_booking"
EXCLUDE USING gist (
  clinician_id WITH =,
  tsrange(appointment_time, appointment_time + (duration_minutes * INTERVAL '1 minute'), '[)') WITH &&
)
WHERE (is_deleted = false AND status NOT IN ('cancelled', 'no_show') AND booking_mode = 'slot');

ALTER TABLE "Appointments" DROP CONSTRAINT "appointments_no_overlapping_room_booking";
ALTER TABLE "Appointments" ADD CONSTRAINT "appointments_no_overlapping_room_booking"
EXCLUDE USING gist (
  room_id WITH =,
  tsrange(appointment_time, appointment_time + (duration_minutes * INTERVAL '1 minute'), '[)') WITH &&
)
WHERE (is_deleted = false AND status NOT IN ('cancelled', 'no_show') AND booking_mode = 'slot');

-- Resources (REQ014's own spec: owns client_org_id directly, unlike Rooms
-- which scopes only via its clinic relation -- a bookable org-level asset,
-- e.g. an ECG machine, assigned to one clinic).
CREATE TABLE "Resources" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'equipment',
  "is_bookable" BOOLEAN NOT NULL DEFAULT true,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Resources_client_org_id_clinic_id_idx" ON "Resources"("client_org_id", "clinic_id");
CREATE INDEX "Resources_clinic_id_is_bookable_is_deleted_idx" ON "Resources"("clinic_id", "is_bookable", "is_deleted");

ALTER TABLE "Resources" ADD CONSTRAINT "Resources_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Resources" ADD CONSTRAINT "Resources_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AppointmentResources: join table for multi-resource intersection booking
-- (US-CAL-05). start_at/end_at are a denormalized copy of the parent
-- appointment's own time range, set at insert time -- an EXCLUDE predicate
-- can only reference its own table's columns, so this table needs its own
-- range rather than joining to Appointments inside the constraint. Rows
-- are deleted (not status-filtered) when the parent appointment is
-- cancelled/no_show'd/soft-deleted -- "no row for this resource at this
-- time" needs no status column at all.
CREATE TABLE "AppointmentResources" (
  "id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppointmentResources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentResources_appointment_id_resource_id_key" ON "AppointmentResources"("appointment_id", "resource_id");
CREATE INDEX "AppointmentResources_resource_id_idx" ON "AppointmentResources"("resource_id");

ALTER TABLE "AppointmentResources" ADD CONSTRAINT "AppointmentResources_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentResources" ADD CONSTRAINT "AppointmentResources_resource_id_fkey"
  FOREIGN KEY ("resource_id") REFERENCES "Resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- btree_gist is already enabled by the 20260823030000 migration;
-- CREATE EXTENSION IF NOT EXISTS is idempotent regardless, so it is safe
-- to declare again here for a migration that can stand alone.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "AppointmentResources" ADD CONSTRAINT "appointment_resources_no_overlap"
EXCLUDE USING gist (
  resource_id WITH =,
  tsrange(start_at, end_at, '[)') WITH &&
);
