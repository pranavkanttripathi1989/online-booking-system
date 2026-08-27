-- P2-03 -- diagnosis/procedure codes carried on a claim (auto-populated
-- from REQ154's suggestEncounterCodes at submission time, reviewable
-- before the human clicks Submit -- see Claims.diagnosis_codes_json's own
-- schema comment), plus the auto-drafted appeal a rejected claim gets.

ALTER TABLE "Claims" ADD COLUMN "diagnosis_codes_json" JSONB;
ALTER TABLE "Claims" ADD COLUMN "procedure_codes_json" JSONB;

CREATE TABLE "ClaimAppeals" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "denial_category" TEXT NOT NULL,
    "draft_content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimAppeals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClaimAppeals_claim_id_key" ON "ClaimAppeals"("claim_id");
CREATE INDEX "ClaimAppeals_claim_id_idx" ON "ClaimAppeals"("claim_id");

ALTER TABLE "ClaimAppeals" ADD CONSTRAINT "ClaimAppeals_claim_id_fkey"
  FOREIGN KEY ("claim_id") REFERENCES "Claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
