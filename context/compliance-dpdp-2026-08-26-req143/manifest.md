---
id: CTX-compliance-dpdp-2026-08-26-req143
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ143
related: [PLAN183, TP203, TR203]
---

# compliance-dpdp — REQ143: DPDP retention-purge, remaining domains re-investigated (2026-08-26)

Tenth and final slice of the next 10-slice batch
(`project-plans/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ143 | [Retention-purge remaining domains](../../requirements/compliance-dpdp/improvement/REQ143-compliance-dpdp-2026-08-26-retention-purge-remaining-domains.md) |
| implementation-plans | PLAN183 | [implementation plan](../../implementation-plans/compliance-dpdp/improvement/PLAN183-compliance-dpdp-2026-08-26-retention-purge-remaining-domains.md) |
| test-plans | TP203 | [verification plan](../../test-plans/compliance-dpdp/improvement/TP203-compliance-dpdp-2026-08-26-retention-purge-remaining-domains.md) |
| test-results | TR203 | [verification results — pass](../../test-results/compliance-dpdp/improvement/TR203-compliance-dpdp-2026-08-26-retention-purge-remaining-domains.md) |

## What shipped

No application code — the batch plan's own explicit allowance for this
slot ("if all three blockers are still genuinely unresolved, this may
need to become an open-question entry rather than a shipped slice — an
acceptable outcome, not a failure to force past").

**The batch plan's own premise turned out stale**: `consents` (one of
the three named blocked domains) was already closed by `REQ113`, earlier
the same day, before this batch started — confirmed by reading the
current schema and `RetentionPurgeService` directly rather than trusting
the plan's restatement. `clinical_records` remains blocked on its
already-logged legal-review question, unchanged.

**`messages` was re-investigated fresh, not just re-cited**, and found
to have two independent blockers, not one: `createThread()`'s own org
derivation has no check that every participant shares one org (the
"whose retention clock governs a shared thread" question is
structurally real, not theoretical), and neither `Messages` nor
`MessageThreads` has an `is_deleted` column at all — a second blocker
`REQ073`'s own original prose didn't separately name. Logged as
`context/open-questions.md` #18 with the specific decision needed,
rather than inventing a design.

## Verification

No test suite run — no code changed. Every claim in this slice's own
account is backed by a direct read of the current schema/service code,
not a restatement of a prior document.
