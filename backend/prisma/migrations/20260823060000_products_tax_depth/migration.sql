-- REQ046/REQ016 (US-CAT-06) -- GST classification on Products (which also
-- backs "Services" via services.service.ts -- see schema.prisma comment).
-- hsn is free text pending a real HSN master table; is_tax_exempt's default
-- is applied per creation path in application code (services.service.ts
-- defaults true for a clinical consultation, products.service.ts defaults
-- false for a retail/pharmacy item), not here -- the column default below is
-- just the DB-level fallback for any row that bypasses both services.

-- AddColumn
ALTER TABLE "Products" ADD COLUMN "hsn" TEXT;
ALTER TABLE "Products" ADD COLUMN "is_tax_exempt" BOOLEAN NOT NULL DEFAULT false;
