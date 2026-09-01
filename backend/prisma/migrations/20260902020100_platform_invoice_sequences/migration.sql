-- REQ179 — a global per-financial-year invoice sequence for platform
-- billing (no clinic dimension, unlike InvoiceSequences).

CREATE TABLE "PlatformInvoiceSequences" (
    "id" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoiceSequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformInvoiceSequences_financial_year_key" ON "PlatformInvoiceSequences"("financial_year");
