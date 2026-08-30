-- REQ168 (P2-12) -- a new NotificationEventType value must exist in the DB
-- enum before notification-trigger.service.ts's own Prisma-validated
-- dispatch() call can use it (break_glass_requested/low_stock_alert/
-- immunization_due precedent). Kept as its own migration, applied before
-- any code references it -- ALTER TYPE ... ADD VALUE cannot be used in
-- the same transaction it is added in.

ALTER TYPE "NotificationEventType" ADD VALUE 'chronic_registry_recall_due';
