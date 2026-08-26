---
id: TP203
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN183
related: []
---

# TP203 — Test plan: DPDP retention-purge, remaining domains re-investigated

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | `consents` premise check | Read `Consents` model in `schema.prisma` | `is_deleted` present, contradicting the batch plan's stale premise |
| 2 | `consents` enforcement check | Read `RetentionPurgeService`'s `SUPPORTED_DATA_CLASSES` | `consents` already included, enforcing identically to `test_results` |
| 3 | `clinical_records` blocker unchanged | Re-read `REQ034`'s own note | Still a legal-review question, no new information found |
| 4 | `messages` org-scoping check | Read `messages.service.ts#createThread()` | No validation that every `participant_ids` entry shares `client_org_id` — the multi-org concern is structurally real |
| 5 | `messages` schema check | Read `MessageThreads`/`Messages` in `schema.prisma` | Neither has an `is_deleted` column |
| 6 | Open question logged | `context/open-questions.md` | New entry #18, spelling out both `messages` blockers and the decision needed, per Hard Rule 10 |
| 7 | No invented answer | Review `REQ143`'s own doc | No purge design decision made for `messages` without a stakeholder call |
