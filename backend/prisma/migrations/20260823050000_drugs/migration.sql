-- REQ044/REQ016 -- drug master reference table. client_org_id null =
-- platform-seeded (visible to every tenant); non-null = a tenant's own
-- custom addition (visible only to that tenant). No real licensed drug
-- database is wired up yet (PRD Open Question 4, unresolved) -- ships the
-- schema plus a small manually-curated seed set per REQ016's own fallback
-- recommendation.

-- CreateTable
CREATE TABLE "Drugs" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT,
  "name" TEXT NOT NULL,
  "composition" TEXT,
  "strength" TEXT,
  "form" TEXT,
  "schedule_class" TEXT,
  "hsn" TEXT,
  "gst_rate" DOUBLE PRECISION,
  "manufacturer" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Drugs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Drugs_client_org_id_is_deleted_idx" ON "Drugs"("client_org_id", "is_deleted");

-- AddForeignKey
ALTER TABLE "Drugs" ADD CONSTRAINT "Drugs_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
