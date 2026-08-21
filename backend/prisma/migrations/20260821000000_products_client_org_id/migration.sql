-- BUG001 — Products/ProductCategories/ProductSubcategories never had a
-- client_org_id of their own; every create path left the existing clinic_id
-- column null too, so the old clinic-relation tenant filter silently matched
-- nothing for a caller's own rows on list queries, and findOne's null-guarded
-- check skipped the tenant comparison entirely, making a clinic-less product
-- readable cross-org by id.

-- AddColumn
ALTER TABLE "Products" ADD COLUMN "client_org_id" TEXT;
ALTER TABLE "ProductCategories" ADD COLUMN "client_org_id" TEXT;
ALTER TABLE "ProductSubcategories" ADD COLUMN "client_org_id" TEXT;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductCategories" ADD CONSTRAINT "ProductCategories_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductSubcategories" ADD CONSTRAINT "ProductSubcategories_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: a product with no client_org_id of its own may still have real
-- appointment history that reveals which org it actually belongs to (its
-- clinic_id was never set either, so this is the only signal available).
-- Rows with no appointment history stay NULL — visible only to org-less
-- platform roles (admin/super_admin), the same default used everywhere else
-- in this schema for records that predate an org linkage.
UPDATE "Products" p
SET "client_org_id" = sub.client_org_id
FROM (
  SELECT DISTINCT ON (a."product_id") a."product_id", c."client_org_id"
  FROM "Appointments" a
  JOIN "Clinics" c ON c."id" = a."clinic_id"
  WHERE a."product_id" IS NOT NULL AND c."client_org_id" IS NOT NULL
  ORDER BY a."product_id", a."created_at" ASC
) sub
WHERE p."id" = sub."product_id" AND p."client_org_id" IS NULL;
