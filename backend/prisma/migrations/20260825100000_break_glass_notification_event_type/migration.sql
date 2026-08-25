-- REQ053 (US-SEC-05) — break-glass.service.ts's request() dispatches a
-- notification with event_type 'break_glass_requested', a value that never
-- existed on this enum. Every requestBreakGlassAccess call for an org with
-- any admin/manager to notify threw a PrismaClientValidationError out of
-- the awaited Promise.all, failing the whole mutation. Found live via a
-- real e2e run against a real org with a real admin/manager.
ALTER TYPE "NotificationEventType" ADD VALUE 'break_glass_requested';
