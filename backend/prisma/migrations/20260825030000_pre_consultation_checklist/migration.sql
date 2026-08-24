-- REQ051 (US-QUE-06) — mandatory pre-consultation checklist gating "call next"

-- CreateTable
CREATE TABLE "ChecklistItems" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "product_id" TEXT,
    "label" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistCompletions" (
    "id" TEXT NOT NULL,
    "checklist_item_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "completed_by_user_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistCompletions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItems_clinic_id_product_id_idx" ON "ChecklistItems"("clinic_id", "product_id");

-- CreateIndex
CREATE INDEX "ChecklistCompletions_appointment_id_idx" ON "ChecklistCompletions"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistCompletions_checklist_item_id_appointment_id_key" ON "ChecklistCompletions"("checklist_item_id", "appointment_id");

-- AddForeignKey
ALTER TABLE "ChecklistItems" ADD CONSTRAINT "ChecklistItems_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItems" ADD CONSTRAINT "ChecklistItems_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletions" ADD CONSTRAINT "ChecklistCompletions_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "ChecklistItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCompletions" ADD CONSTRAINT "ChecklistCompletions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
