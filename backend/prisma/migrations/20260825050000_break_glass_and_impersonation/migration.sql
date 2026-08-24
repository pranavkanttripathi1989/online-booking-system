-- REQ053 (US-SEC-05/US-SEC-06) — break-glass access + impersonation audit trail

-- AlterTable
ALTER TABLE "AuditLogs" ADD COLUMN     "acting_as_user_id" TEXT;

-- CreateTable
CREATE TABLE "BreakGlassGrants" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "grantee_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "BreakGlassGrants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationSessions" (
    "id" TEXT NOT NULL,
    "client_org_id" TEXT NOT NULL,
    "real_actor_user_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "ImpersonationSessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BreakGlassGrants_grantee_user_id_expires_at_idx" ON "BreakGlassGrants"("grantee_user_id", "expires_at");

-- CreateIndex
CREATE INDEX "BreakGlassGrants_client_org_id_granted_at_idx" ON "BreakGlassGrants"("client_org_id", "granted_at");

-- CreateIndex
CREATE INDEX "ImpersonationSessions_real_actor_user_id_expires_at_idx" ON "ImpersonationSessions"("real_actor_user_id", "expires_at");

-- CreateIndex
CREATE INDEX "ImpersonationSessions_target_user_id_idx" ON "ImpersonationSessions"("target_user_id");

-- AddForeignKey
ALTER TABLE "AuditLogs" ADD CONSTRAINT "AuditLogs_acting_as_user_id_fkey" FOREIGN KEY ("acting_as_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakGlassGrants" ADD CONSTRAINT "BreakGlassGrants_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakGlassGrants" ADD CONSTRAINT "BreakGlassGrants_grantee_user_id_fkey" FOREIGN KEY ("grantee_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationSessions" ADD CONSTRAINT "ImpersonationSessions_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationSessions" ADD CONSTRAINT "ImpersonationSessions_real_actor_user_id_fkey" FOREIGN KEY ("real_actor_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationSessions" ADD CONSTRAINT "ImpersonationSessions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
