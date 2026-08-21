-- REQ012/PLAN021 — admin/Policies.jsx "Security & Privacy" tab: real
-- persisted config, each field enforced elsewhere (see the schema.prisma
-- comment on ClientOrganizations for exactly where).
ALTER TABLE "ClientOrganizations" ADD COLUMN "mfa_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOrganizations" ADD COLUMN "session_timeout_minutes" INTEGER;
ALTER TABLE "ClientOrganizations" ADD COLUMN "audit_log_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOrganizations" ADD COLUMN "patient_data_export_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOrganizations" ADD COLUMN "ip_whitelist_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientOrganizations" ADD COLUMN "ip_whitelist" TEXT;
