-- REQ108 -- a curated ~100-code OPD-relevant starter set (real WHO ICD-10
-- codes), not the full ~14,000+ code set. Platform-global reference data,
-- like Languages. The actual rows are seeded via prisma/seed.ts (this
-- codebase's own established convention for reference data -- see
-- DRUGS/PLANS in seed.ts -- never raw INSERT statements in a migration
-- file, which no other migration in this codebase does either).

CREATE TABLE "Icd10Codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Icd10Codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Icd10Codes_code_key" ON "Icd10Codes"("code");
CREATE INDEX "Icd10Codes_category_idx" ON "Icd10Codes"("category");
