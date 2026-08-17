-- AlterTable
ALTER TABLE "UserRoles" ADD COLUMN "client_org_id" TEXT;
ALTER TABLE "UserRoles" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex
DROP INDEX "UserRoles_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "org_role_name" ON "UserRoles"("client_org_id", "name");

-- AddForeignKey
ALTER TABLE "UserRoles" ADD CONSTRAINT "UserRoles_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "ClientOrganizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
