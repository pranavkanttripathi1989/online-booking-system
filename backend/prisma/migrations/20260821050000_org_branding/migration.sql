-- REQ002/PLAN022: Settings -> Clinic -> Branding (logo + primary/secondary color)
ALTER TABLE "ClientOrganizations" ADD COLUMN "logo_url" TEXT;
ALTER TABLE "ClientOrganizations" ADD COLUMN "primary_color" TEXT NOT NULL DEFAULT '#006D77';
ALTER TABLE "ClientOrganizations" ADD COLUMN "secondary_color" TEXT NOT NULL DEFAULT '#00858F';
