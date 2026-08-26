-- REQ106 -- a new NotificationEventType value must exist in the DB enum
-- before waitlist.service.ts's own dispatch() call can use it (CLAUDE.md's
-- own documented break_glass_requested precedent for this exact bug class).
-- Applied in its own migration, before the table-creation migration below,
-- so the enum value exists before any code path can reference it.

ALTER TYPE "NotificationEventType" ADD VALUE 'waitlist_slot_available';
