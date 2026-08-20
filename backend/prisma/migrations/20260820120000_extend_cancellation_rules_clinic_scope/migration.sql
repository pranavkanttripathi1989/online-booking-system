-- Extends ProductCancellationRules to support clinic-scoped rules alongside
-- the existing product-scoped ones. admin/Policies.jsx's Cancellation Rules
-- tab already had a real GraphQL contract written against a clinic-scoped
-- shape (name/description/priority/clinic_id, no product_id at all) with
-- zero matching resolvers -- this reconciles the schema with that contract
-- rather than building a second, parallel model. Table is empty in every
-- environment checked (dev DB: 0 rows), so no backfill is needed for the
-- new NOT NULL "name" column.

-- AlterTable
ALTER TABLE "ProductCancellationRules"
  ALTER COLUMN "product_id" DROP NOT NULL,
  ALTER COLUMN "rule_type" SET DEFAULT 'cancellation',
  ADD COLUMN "name" TEXT NOT NULL,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "clinic_id" TEXT,
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "ProductCancellationRules" ADD CONSTRAINT "ProductCancellationRules_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A rule is either clinic-scoped or product-scoped, never both, never neither.
ALTER TABLE "ProductCancellationRules" ADD CONSTRAINT "ProductCancellationRules_scope_check"
  CHECK (
    ("product_id" IS NOT NULL AND "clinic_id" IS NULL) OR
    ("product_id" IS NULL AND "clinic_id" IS NOT NULL)
  );
