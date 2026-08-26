---
id: TP167
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN153
related: [REQ113]
---

# TP167 — Test plan: retention enforcement extension (consents)

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
mirrors the already-proven `test_results` enforcement pattern exactly.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `retentionPolicies.findMany` query | Now includes `'consents'` in the supported data-class list |
| 2 | Consents purge — a policy for `consents` | Soft-deletes rows past the cutoff, scoped to the policy's org |
| 3 | Consents purge — cutoff basis | Revoked consent uses `revoked_at`; still-granted consent uses `granted_at` |
| 4 | Unsupported data class (`clinical_records`, `messages`) | Untouched, as before |
| 5 | `consent.service.ts#myConsents` | Excludes soft-deleted (retention-purged) rows |
