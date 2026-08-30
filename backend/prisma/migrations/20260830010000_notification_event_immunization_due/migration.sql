-- REQ167 (P2-11) -- a new NotificationEventType value must exist in the DB
-- enum before notification-trigger.service.ts's own Prisma-validated
-- dispatch() call can use it (CLAUDE.md's own documented
-- break_glass_requested/low_stock_alert precedent for this exact bug class).
-- Kept as its own migration, applied before any code references it, since
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction it is
-- added in.

ALTER TYPE "NotificationEventType" ADD VALUE 'immunization_due';
