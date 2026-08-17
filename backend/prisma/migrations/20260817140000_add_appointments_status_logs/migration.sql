-- AlterTable
ALTER TABLE "Appointments" ADD COLUMN "cancellation_reason" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);
ALTER TABLE "Appointments" ADD COLUMN "booked_by_user_id" TEXT;

-- CreateTable
CREATE TABLE "AppointmentStatusLogs" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "changed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentStatusLogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentStatusLogs" ADD CONSTRAINT "AppointmentStatusLogs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentStatusLogs" ADD CONSTRAINT "AppointmentStatusLogs_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
