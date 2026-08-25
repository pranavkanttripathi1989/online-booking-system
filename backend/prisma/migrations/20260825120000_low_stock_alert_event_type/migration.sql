-- REQ022 (US-PHR-09, scoped) -- a new NotificationEventType value must
-- exist in the DB enum before notification-trigger.service.ts's own
-- Prisma-validated dispatch() call can use it (CLAUDE.md's own documented
-- break_glass_requested precedent for this exact bug class).

ALTER TYPE "NotificationEventType" ADD VALUE 'low_stock_alert';
