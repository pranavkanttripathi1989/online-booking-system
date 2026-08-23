-- P3.1 (project-plans/06-execution-plan.md, F-16): closes the acceptance
-- criterion booking-concurrency.int-spec.ts was written against
-- (technical-plans/00-foundation-hardening.md §4) -- availability was
-- checked and the row inserted in two separate statements
-- (appointments.service.ts's assertSlotFree() then a later create()), so N
-- concurrent requests for the same slot could all pass the check before any
-- of them wrote. This constraint makes the database itself the single
-- source of truth for "is this slot free", closing the race the
-- application-level check could never close on its own.
--
-- btree_gist is required for a GiST index to support the plain equality
-- operator (=) on clinician_id (a text column) alongside the range overlap
-- operator (&&) on the computed tsrange -- GiST has no native support for
-- equality on non-range types without it.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- '[)' bounds (inclusive start, exclusive end): a booking ending exactly
-- when another starts is back-to-back, not overlapping, and must be
-- allowed. Excludes soft-deleted and cancelled/no_show rows -- a cancelled
-- appointment vacates its slot, matching assertSlotFree()'s own existing
-- `status: { notIn: ['cancelled', 'no_show'] }` filter exactly, so this
-- constraint enforces the same rule the application already intended, not
-- a stricter one.
ALTER TABLE "Appointments" ADD CONSTRAINT "appointments_no_overlapping_booking"
EXCLUDE USING gist (
  clinician_id WITH =,
  tsrange(appointment_time, appointment_time + (duration_minutes * INTERVAL '1 minute'), '[)') WITH &&
)
WHERE (is_deleted = false AND status NOT IN ('cancelled', 'no_show'));
