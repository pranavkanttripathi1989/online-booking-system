-- F-04 (project-plans/02-findings-register.md) — Patients had no
-- client_org_id of its own; org-scoping fell back to a relation through
-- Appointments.clinic, and a patient with zero appointments yet (freshly
-- registered, before their first booking) was visible to any authenticated
-- staff caller regardless of org. Same shape as BUG001's
-- Products.client_org_id, reversed direction.

-- AddColumn
ALTER TABLE "Patients" ADD COLUMN "client_org_id" TEXT;

-- AddForeignKey
ALTER TABLE "Patients" ADD CONSTRAINT "Patients_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Patients_client_org_id_idx" ON "Patients"("client_org_id");

-- Backfill: a patient with no client_org_id of their own may still have
-- real appointment history that reveals which org they actually belong to.
-- Rows with no appointment history stay NULL — visible only to org-less
-- platform roles (admin/super_admin), the same default used everywhere else
-- in this schema for records that predate an org linkage.
UPDATE "Patients" p
SET "client_org_id" = sub.client_org_id
FROM (
  SELECT DISTINCT ON (a."patient_id") a."patient_id", c."client_org_id"
  FROM "Appointments" a
  JOIN "Clinics" c ON c."id" = a."clinic_id"
  WHERE a."patient_id" IS NOT NULL AND c."client_org_id" IS NOT NULL
  ORDER BY a."patient_id", a."created_at" ASC
) sub
WHERE p."id" = sub."patient_id" AND p."client_org_id" IS NULL;
