-- P2-05 -- a completed bulk patient import's own audit record. Result-log
-- only; the raw CSV content and column mapping are never persisted (see
-- the schema's own comment on ImportJobs for why).

CREATE TABLE "ImportJobs" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "imported_rows" INTEGER NOT NULL,
    "error_rows" INTEGER NOT NULL,
    "row_errors_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportJobs_client_org_id_idx" ON "ImportJobs"("client_org_id");

ALTER TABLE "ImportJobs" ADD CONSTRAINT "ImportJobs_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportJobs" ADD CONSTRAINT "ImportJobs_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "UserProfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
