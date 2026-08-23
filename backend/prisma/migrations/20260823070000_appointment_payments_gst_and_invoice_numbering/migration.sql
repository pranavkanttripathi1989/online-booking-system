-- REQ047/REQ023 (US-BIL-09) -- place_of_supply/invoice_number on
-- AppointmentPayments, plus a gapless per-clinic invoice-numbering
-- sequence. gstin/hsn_sac_code/gst_rate/cgst_amount/sgst_amount/igst_amount
-- already existed on this table (never populated by any code path until
-- this migration's companion service change) -- not touched here.

-- AddColumn
ALTER TABLE "AppointmentPayments" ADD COLUMN "place_of_supply" TEXT;
ALTER TABLE "AppointmentPayments" ADD COLUMN "invoice_number" TEXT;

-- CreateTable
CREATE TABLE "InvoiceSequences" (
  "id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "series" TEXT NOT NULL DEFAULT 'APPT',
  "financial_year" TEXT NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InvoiceSequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequences_clinic_id_series_financial_year_key" ON "InvoiceSequences"("clinic_id", "series", "financial_year");

-- AddForeignKey
ALTER TABLE "InvoiceSequences" ADD CONSTRAINT "InvoiceSequences_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
