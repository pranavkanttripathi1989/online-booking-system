-- REQ043/REQ024 -- shared-inbox assignment + SLA timer for message threads.
-- Both columns nullable: an unassigned thread has no owner and no clock
-- running yet. sla_due_at is set once on first assignment, not recomputed
-- on reassignment.

-- AlterTable
ALTER TABLE "MessageThreads" ADD COLUMN "assigned_to_user_id" TEXT;
ALTER TABLE "MessageThreads" ADD COLUMN "sla_due_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MessageThreads_assigned_to_user_id_idx" ON "MessageThreads"("assigned_to_user_id");

-- AddForeignKey
ALTER TABLE "MessageThreads" ADD CONSTRAINT "MessageThreads_assigned_to_user_id_fkey"
  FOREIGN KEY ("assigned_to_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
