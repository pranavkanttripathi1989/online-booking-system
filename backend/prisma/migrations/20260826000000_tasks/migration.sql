-- REQ080 (project-plans/09-next-15-slice-roadmap.md #1) — internal staff
-- follow-up tasks, replacing the last fully-fabricated routed page (F-18
-- residue) with a real backend.

-- CreateTable
CREATE TABLE "Tasks" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "task_type" TEXT NOT NULL DEFAULT 'General',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "due_date" TIMESTAMP(3),
    "assigned_to_user_id" TEXT,
    "patient_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tasks_client_org_id_status_idx" ON "Tasks"("client_org_id", "status");

-- CreateIndex
CREATE INDEX "Tasks_assigned_to_user_id_idx" ON "Tasks"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "Tasks_patient_id_idx" ON "Tasks"("patient_id");

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
