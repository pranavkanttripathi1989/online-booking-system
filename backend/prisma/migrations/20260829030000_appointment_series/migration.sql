-- REQ163 (P2-10) -- recurring/series appointments + treatment-plan scheduling.
-- One new table (AppointmentSeries) plus two new nullable columns on
-- Appointments (series_id, series_occurrence_no) linking each real,
-- eagerly-materialized occurrence back to its series.

CREATE TABLE "AppointmentSeries" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "series_type" TEXT NOT NULL DEFAULT 'recurring',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentSeries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentSeries_client_org_id_clinic_id_idx" ON "AppointmentSeries"("client_org_id", "clinic_id");
CREATE INDEX "AppointmentSeries_patient_id_idx" ON "AppointmentSeries"("patient_id");

ALTER TABLE "AppointmentSeries" ADD CONSTRAINT "AppointmentSeries_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentSeries" ADD CONSTRAINT "AppointmentSeries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentSeries" ADD CONSTRAINT "AppointmentSeries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentSeries" ADD CONSTRAINT "AppointmentSeries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointments" ADD COLUMN "series_id" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "series_occurrence_no" INTEGER;

CREATE INDEX "Appointments_series_id_idx" ON "Appointments"("series_id");

ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "AppointmentSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
