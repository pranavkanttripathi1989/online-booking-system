-- REQ058 (US-MSG-01/US-MSG-03) -- department/branch-scoped threads, message
-- attachments, canned replies

-- AlterTable
ALTER TABLE "MessageThreads" ADD COLUMN "thread_type" TEXT NOT NULL DEFAULT 'staff_internal';
ALTER TABLE "MessageThreads" ADD COLUMN "department_id" TEXT;
ALTER TABLE "MessageThreads" ADD COLUMN "clinic_id" TEXT;

-- CreateTable
CREATE TABLE "MessageAttachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_ref" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedReplies" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CannedReplies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageThreads_department_id_idx" ON "MessageThreads"("department_id");

-- CreateIndex
CREATE INDEX "MessageThreads_clinic_id_idx" ON "MessageThreads"("clinic_id");

-- CreateIndex
CREATE INDEX "MessageAttachments_message_id_idx" ON "MessageAttachments"("message_id");

-- CreateIndex
CREATE INDEX "CannedReplies_client_org_id_is_deleted_idx" ON "CannedReplies"("client_org_id", "is_deleted");

-- AddForeignKey
ALTER TABLE "MessageThreads" ADD CONSTRAINT "MessageThreads_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThreads" ADD CONSTRAINT "MessageThreads_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachments" ADD CONSTRAINT "MessageAttachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachments" ADD CONSTRAINT "MessageAttachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CannedReplies" ADD CONSTRAINT "CannedReplies_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CannedReplies" ADD CONSTRAINT "CannedReplies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
