-- REQ129 (US-RX-08) -- tamper-evident hash over a prescription's own
-- canonical clinical content, computed once at issue time. Nullable:
-- existing rows predate this column.
ALTER TABLE "Prescriptions" ADD COLUMN "pdf_hash" TEXT;
