-- Companion to 20260823030000_appointments_no_overlap_exclusion_constraint's
-- clinician-level constraint. technical-plans/01-phase1-mvp.md §3.3 designs
-- this exact pair together ("do this once, for both modes"), because
-- appointments.service.ts's create() has no room-availability check of its
-- own at all: `rooms.findFirst({clinic_id, is_active, is_deleted})` returns
-- whichever room comes first, deterministically, regardless of whether
-- that room is already booked at the requested time. A clinic with 2+
-- active rooms (confirmed live: MG Road Clinic has exactly 2) could have
-- two different clinicians' appointments both assigned the same room at
-- overlapping times, entirely undetected, before this.
--
-- This is a data-integrity backstop, not a fix for create()'s room
-- selection itself -- it still doesn't pick a genuinely free room among
-- several, only ever the same first-found one, so a double-booking now
-- fails loudly (a clean rejection) rather than silently succeeding. Real
-- room-availability-aware assignment is separate, larger scope --logged as
-- open question #14 rather than attempted here.
-- btree_gist is already enabled by the companion migration; CREATE EXTENSION
-- IF NOT EXISTS is idempotent regardless, so it is safe to omit here.
ALTER TABLE "Appointments" ADD CONSTRAINT "appointments_no_overlapping_room_booking"
EXCLUDE USING gist (
  room_id WITH =,
  tsrange(appointment_time, appointment_time + (duration_minutes * INTERVAL '1 minute'), '[)') WITH &&
)
WHERE (is_deleted = false AND status NOT IN ('cancelled', 'no_show'));
