-- REQ154 (P2-02) -- a curated OPD-relevant starter set of procedure/service
-- reference codes, mirroring Icd10Codes' own table shape exactly. Rows are
-- seeded via prisma/seed.ts (this codebase's established convention for
-- reference data -- never raw INSERT statements in a migration file).

CREATE TABLE "ProcedureCodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProcedureCodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcedureCodes_code_key" ON "ProcedureCodes"("code");
CREATE INDEX "ProcedureCodes_category_idx" ON "ProcedureCodes"("category");

-- REQ154 -- 'procedure' becomes a third Diagnoses.type value; this column
-- is its equivalent of icd10_code, nullable/free-text, soft validation only.
ALTER TABLE "Diagnoses" ADD COLUMN "procedure_code" TEXT;
