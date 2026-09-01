-- REQ179 (IPD slice 1) -- the four NotificationEventType values the IPD ADT
-- core dispatches. Shipped ALONE and applied BEFORE any code references them:
-- a missing enum value makes Prisma's runtime validation reject the whole
-- dispatch() call, throwing out of the awaited Promise.all and failing the
-- caller's entire mutation (the documented break_glass_requested /
-- low_stock_alert / waitlist_slot_available / immunization_due precedent).
--
-- ALTER TYPE ... ADD VALUE cannot run in the same transaction that later uses
-- the value, which is the other reason this is its own migration file.

ALTER TYPE "NotificationEventType" ADD VALUE 'patient_admitted';
ALTER TYPE "NotificationEventType" ADD VALUE 'patient_discharged';
ALTER TYPE "NotificationEventType" ADD VALUE 'bed_transfer_recorded';
ALTER TYPE "NotificationEventType" ADD VALUE 'mlc_police_intimation_due';
