-- BUG047 follow-up: per-user theme (light/dark/system) preference, synced
-- across devices via the myProfile/updateMyProfile pair.
ALTER TABLE "UserProfiles" ADD COLUMN "theme_mode" TEXT;
