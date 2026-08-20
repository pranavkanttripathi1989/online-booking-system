-- REQ006 remainder: admin/Communications.jsx's Global Settings tab (email
-- sender identity only -- the SMS provider/API-key half deliberately
-- excluded, see context/open-questions.md #6) and admin/Policies.jsx's
-- Booking Policies tab (No-Show Fee / Slot Buffer / Max Reschedules /
-- Retention only -- Cancellation Policy/Late Fee excluded as an overlap
-- with ProductCancellationRules, see context/open-questions.md #7).
-- Defaults match the mock UI's current hardcoded values so existing orgs
-- see the same numbers they see today, with no backfill needed.

ALTER TABLE "ClientOrganizations"
  ADD COLUMN "email_from_name" TEXT NOT NULL DEFAULT 'HealthSync',
  ADD COLUMN "email_from_address" TEXT,
  ADD COLUMN "email_reply_to" TEXT,
  ADD COLUMN "email_include_branding" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "no_show_fee_paise" INTEGER NOT NULL DEFAULT 8500,
  ADD COLUMN "slot_buffer_minutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "max_reschedules_per_month" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "data_retention_years" INTEGER NOT NULL DEFAULT 7;
