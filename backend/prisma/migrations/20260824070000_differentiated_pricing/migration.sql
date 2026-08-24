-- REQ016 (US-CAT-04) -- differentiated pricing by patient category and channel.

ALTER TABLE "Patients" ADD COLUMN "patient_category" TEXT;

ALTER TABLE "Products" ADD COLUMN "category_pricing_json" JSONB;
ALTER TABLE "Products" ADD COLUMN "channel_pricing_json" JSONB;
