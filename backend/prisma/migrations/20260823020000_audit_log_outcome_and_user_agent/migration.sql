-- P3.6 (project-plans/06-execution-plan.md): AuditLogs already had
-- resource_id/details columns that nothing ever populated, and no outcome/
-- user_agent columns at all -- success and failure writes were
-- indistinguishable. Both new columns are nullable: existing historical
-- rows genuinely have no known outcome/user_agent, and a null accurately
-- represents "not recorded" rather than a backfilled guess. Every new row
-- from AuditLogInterceptor going forward always supplies both.
ALTER TABLE "AuditLogs" ADD COLUMN "outcome" TEXT;
ALTER TABLE "AuditLogs" ADD COLUMN "user_agent" TEXT;
