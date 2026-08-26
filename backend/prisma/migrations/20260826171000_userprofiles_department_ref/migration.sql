-- REQ102 — a separate FK to Departments for message-thread auto-participant-
-- add, distinct from the existing free-text UserProfiles.department column.
ALTER TABLE "UserProfiles" ADD COLUMN "department_id_ref" TEXT;
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_department_id_ref_fkey"
  FOREIGN KEY ("department_id_ref") REFERENCES "Departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "UserProfiles_department_id_ref_idx" ON "UserProfiles"("department_id_ref");
