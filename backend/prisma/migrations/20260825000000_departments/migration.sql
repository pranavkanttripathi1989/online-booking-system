-- REQ014 (US-ORG-03) -- Department entity: specialty grouping (Cardiology,
-- Dental, Physio) so clinicians/services can be organized and reported on
-- by department. Owns client_org_id directly, same shape as Resources
-- (an org-level concept assigned to one clinic, not Rooms' via-relation-
-- only pattern).
CREATE TABLE "Departments" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Departments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Departments_client_org_id_clinic_id_idx" ON "Departments"("client_org_id", "clinic_id");

ALTER TABLE "Departments" ADD CONSTRAINT "Departments_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Departments" ADD CONSTRAINT "Departments_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Optional department assignment on Clinicians and Products -- nullable,
-- since every existing row predates departments existing at all.
ALTER TABLE "Clinicians" ADD COLUMN "department_id" TEXT;
CREATE INDEX "Clinicians_department_id_idx" ON "Clinicians"("department_id");
ALTER TABLE "Clinicians" ADD CONSTRAINT "Clinicians_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "Departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Products" ADD COLUMN "department_id" TEXT;
CREATE INDEX "Products_department_id_idx" ON "Products"("department_id");
ALTER TABLE "Products" ADD CONSTRAINT "Products_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "Departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
