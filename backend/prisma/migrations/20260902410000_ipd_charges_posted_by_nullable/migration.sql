-- REQ179 (IPD slice 4) -- follow-up to 20260902400000_ipd_billing_core,
-- found before any service code depended on the original NOT NULL: a
-- system-posted charge (the room-day/nursing accrual sweep) has no human
-- actor, the identical MedicationAdministrations.administered_by_user_id
-- shape.
ALTER TABLE "IpdCharges" ALTER COLUMN "posted_by_user_id" DROP NOT NULL;
