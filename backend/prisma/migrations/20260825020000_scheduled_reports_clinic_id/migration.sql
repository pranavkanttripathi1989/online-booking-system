-- REQ029 (US-RPT-03) — a scheduled report can be scoped to one clinic
-- (optional) rather than always the whole org; missed in the initial
-- 20260825010000 migration, caught by tsc before this shipped anywhere.
ALTER TABLE "ScheduledReports" ADD COLUMN "clinic_id" TEXT;

ALTER TABLE "ScheduledReports" ADD CONSTRAINT "ScheduledReports_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ScheduledReports_clinic_id_idx" ON "ScheduledReports"("clinic_id");
