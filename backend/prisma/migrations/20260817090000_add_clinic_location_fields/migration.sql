-- AlterTable
ALTER TABLE "Clinics"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "postcode" TEXT,
  ADD COLUMN "timezone" TEXT DEFAULT 'Asia/Kolkata';
