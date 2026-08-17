-- AlterTable
ALTER TABLE "UserProfiles" ADD COLUMN "department" TEXT;
ALTER TABLE "UserProfiles" ADD COLUMN "job_title" TEXT;
ALTER TABLE "UserProfiles" ADD COLUMN "notes" TEXT;
ALTER TABLE "UserProfiles" ADD COLUMN "staff_status" TEXT NOT NULL DEFAULT 'active';
