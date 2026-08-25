-- REQ101 — per-product GST rate + clinic GST registration state/GSTIN.
-- Both nullable; AppointmentPayments' own GST split stays null until both
-- are set for a given payment (see appointment-payments.service.ts).
ALTER TABLE "Products" ADD COLUMN "gst_rate" DOUBLE PRECISION;
ALTER TABLE "Clinics" ADD COLUMN "state" TEXT;
ALTER TABLE "Clinics" ADD COLUMN "gstin" TEXT;
