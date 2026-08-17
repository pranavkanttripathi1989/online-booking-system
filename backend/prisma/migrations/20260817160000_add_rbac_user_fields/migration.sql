-- AlterTable
ALTER TABLE "UserRoles" ADD COLUMN "code" TEXT;
ALTER TABLE "UserProfiles" ADD COLUMN "last_login_at" TIMESTAMP(3);
ALTER TABLE "UserProfiles" ADD COLUMN "avatar_url" TEXT;

-- Backfill code for already-seeded system roles (slug of name; harmless no-op
-- for a fresh database with no rows yet).
UPDATE "UserRoles" SET "code" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '_', 'g')) WHERE "code" IS NULL;
