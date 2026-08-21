-- REQ002/PLAN022 follow-up: the original secondary_color default (#00858F,
-- the platform's own decorative TEAL_LIGHT) fails WCAG AA contrast against
-- white by a hair (4.42:1, needs 4.5:1) -- found live while testing
-- updateMyOrgBranding. #007680 is the nearest passing shade (5.38:1).
ALTER TABLE "ClientOrganizations" ALTER COLUMN "secondary_color" SET DEFAULT '#007680';
UPDATE "ClientOrganizations" SET "secondary_color" = '#007680' WHERE "secondary_color" = '#00858F';
