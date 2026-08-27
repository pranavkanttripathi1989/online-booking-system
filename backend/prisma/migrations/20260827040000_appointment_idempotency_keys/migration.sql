-- P1-05: durable idempotency keys for booking mutations (BOOK-3).
-- One row per appointment ever created via a keyed request; a repeat
-- key short-circuits to the original appointment instead of re-running
-- creation logic. Slot holds are Redis/TTL-only and need no table.

CREATE TABLE "AppointmentIdempotencyKeys" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentIdempotencyKeys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentIdempotencyKeys_idempotency_key_key" ON "AppointmentIdempotencyKeys"("idempotency_key");

CREATE UNIQUE INDEX "AppointmentIdempotencyKeys_appointment_id_key" ON "AppointmentIdempotencyKeys"("appointment_id");

ALTER TABLE "AppointmentIdempotencyKeys" ADD CONSTRAINT "AppointmentIdempotencyKeys_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
