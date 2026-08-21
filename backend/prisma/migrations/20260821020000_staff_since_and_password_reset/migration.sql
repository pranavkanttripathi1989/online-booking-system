-- context/open-questions.md #3 — real, backdatable staff employment start
-- date, distinct from created_at. No column needed for the password-reset
-- decision (writes to the existing `password` column).
ALTER TABLE "UserProfiles" ADD COLUMN "staff_since" TIMESTAMP(3);
