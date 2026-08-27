-- P1-04: links a ClientOrganizations row to the versioned Plans catalog
-- (REQ032) so EntitlementsService has a real org -> plan assignment to
-- resolve. Nullable -- no real org has one assigned yet; a null plan_id
-- is treated as "ungated" by the service, not "blocked".

ALTER TABLE "ClientOrganizations"
  ADD COLUMN "plan_id" TEXT;

ALTER TABLE "ClientOrganizations"
  ADD CONSTRAINT "ClientOrganizations_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "Plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClientOrganizations_plan_id_idx" ON "ClientOrganizations" ("plan_id");
