-- REQ179 (IPD slice 5) -- the one new NotificationEventType value the
-- pre-auth-utilization sweep dispatches. Shipped ALONE and applied BEFORE
-- any code references it, the exact break_glass_requested / low_stock_alert
-- / mlc_police_intimation_due precedent: a missing enum value makes
-- Prisma's runtime validation reject the whole dispatch() call, failing the
-- caller's entire mutation (or, for a sweep, the whole Promise.all).
--
-- ALTER TYPE ... ADD VALUE cannot run in the same transaction that later
-- uses the value, which is the other reason this is its own migration file.

ALTER TYPE "NotificationEventType" ADD VALUE 'preauth_enhancement_needed';
