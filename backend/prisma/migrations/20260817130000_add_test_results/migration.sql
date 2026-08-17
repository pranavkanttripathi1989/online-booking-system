-- CreateEnum
CREATE TYPE "TestResultStatus" AS ENUM ('pending', 'processing', 'completed');

-- CreateTable
CREATE TABLE "TestResults" (
    "id" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "patient_id" TEXT,
    "test_name" TEXT NOT NULL,
    "test_type" TEXT NOT NULL,
    "ordered_by_name" TEXT NOT NULL,
    "ordered_by_user_id" TEXT,
    "date_ordered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_completed" TIMESTAMP(3),
    "status" "TestResultStatus" NOT NULL DEFAULT 'pending',
    "values" JSONB NOT NULL DEFAULT '[]',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResults_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TestResults" ADD CONSTRAINT "TestResults_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestResults" ADD CONSTRAINT "TestResults_ordered_by_user_id_fkey" FOREIGN KEY ("ordered_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
