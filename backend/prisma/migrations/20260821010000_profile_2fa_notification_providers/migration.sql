-- PLAN016 (REQ005 remainder) — Profile tab fields (DOB, Gender, Bio,
-- structured India address) and real TOTP 2FA on UserProfiles.
ALTER TABLE "UserProfiles" ADD COLUMN "date_of_birth" TIMESTAMP(3);
ALTER TABLE "UserProfiles" ADD COLUMN "gender" TEXT;
ALTER TABLE "UserProfiles" ADD COLUMN "bio" TEXT;
ALTER TABLE "UserProfiles" ADD COLUMN "address_structured" JSONB;
ALTER TABLE "UserProfiles" ADD COLUMN "totp_secret_encrypted" TEXT;
ALTER TABLE "UserProfiles" ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserProfiles" ADD COLUMN "totp_backup_codes" JSONB;

-- PLAN017 (REQ008) — multi-provider OTP/SMS configuration per org.
CREATE TABLE "NotificationProviderConfig" (
  "id" TEXT NOT NULL,
  "client_org_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "credentials_encrypted" TEXT NOT NULL,
  "sender_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationProviderConfig_client_org_id_channel_key"
  ON "NotificationProviderConfig"("client_org_id", "channel");

ALTER TABLE "NotificationProviderConfig" ADD CONSTRAINT "NotificationProviderConfig_client_org_id_fkey"
  FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
