-- Corrects the prior migration's scope model: admin/Policies.jsx's
-- clinic dropdown is explicitly "Clinic (leave blank = global)" with a
-- "Global (all clinics)" option -- a third state (clinic_id AND product_id
-- both null) the previous exactly-one-scope CHECK constraint forbade
-- outright. A "global" rule still needs a tenant anchor or it becomes an
-- unscoped cross-tenant read/write (Hard Rule 6): admin/super_admin are
-- platform-wide (client_org_id: null, seed.ts) so their global rules stay
-- platform-wide by the same "org-less caller sees everything" convention
-- used elsewhere; a manager's global rule must stay confined to their own
-- org's clinics. Storing client_org_id directly (not just derived through
-- clinic/product) makes every row self-scoping and matches how Clinics
-- itself carries a direct client_org_id rather than only a relation.
-- Table still has 0 rows (nothing shipped yet), so no backfill needed.

ALTER TABLE "ProductCancellationRules" DROP CONSTRAINT "ProductCancellationRules_scope_check";

ALTER TABLE "ProductCancellationRules" ADD COLUMN "client_org_id" TEXT;

ALTER TABLE "ProductCancellationRules" ADD CONSTRAINT "ProductCancellationRules_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A rule may be product-scoped, clinic-scoped, or global (both null) --
-- just never product- AND clinic-scoped at once.
ALTER TABLE "ProductCancellationRules" ADD CONSTRAINT "ProductCancellationRules_scope_check"
  CHECK (NOT ("product_id" IS NOT NULL AND "clinic_id" IS NOT NULL));
