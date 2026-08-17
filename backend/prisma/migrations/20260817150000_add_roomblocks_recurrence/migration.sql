-- AlterTable
ALTER TABLE "RoomBlocks" ADD COLUMN "recurrence_type" "RecurrenceType" NOT NULL DEFAULT 'single';
ALTER TABLE "RoomBlocks" ADD COLUMN "recurrence_days" JSONB;
ALTER TABLE "RoomBlocks" ADD COLUMN "end_date" TIMESTAMP(3);
