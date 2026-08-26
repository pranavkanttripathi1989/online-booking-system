---
id: REQ143
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ073
related: []
---

# REQ143 — DPDP retention-purge enforcement, remaining domains re-investigated

## Why this slice

`REQ073` shipped a daily retention-purge sweep enforcing only
`test_results` of its four documentable data classes, naming
`clinical_records`, `consents`, and `messages` as blocked — each on a
distinct, real reason, not one shared "not built yet" note. The batch
plan for this slice was scoped against that original three-way blocker
list. Before touching any code, re-read `REQ073`'s own account of each
blocker fresh, since the batch plan's own premise ("only `test_results`
is enforced today") turned out to already be stale.

## What was found before writing anything

**`consents` is already closed — by `REQ113`, earlier the same day,
before this batch started.** `Consents.is_deleted` exists in the
current schema; `RetentionPurgeService` already enforces it identically
to `test_results` (retention clock: `revoked_at` if set, else
`granted_at`). Confirmed by reading the current schema and
`RetentionPurgeService` directly, not by trusting `REQ073`'s own
(now-outdated) prose. This slice does not re-do that work — it's
already shipped, tested, and documented under `REQ113`.

**`clinical_records` remains blocked on the same reason, unchanged.**
`REQ034`'s own requirement doc flags a real statutory-retention-vs-
erasure tension for clinical records specifically — a legal-review
question, not a technical one. No new information this slice found
changes that; not re-litigated further.

**`messages` was re-investigated fresh, not just re-cited, and found to
have a deeper blocker than `REQ073`'s own prose described.** Confirmed
two independent problems, not one:

1. **The multi-party scoping question is structurally real, not just
   theoretical.** `messages.service.ts#createThread()` derives
   `MessageThreads.client_org_id` from *one* participant (the caller,
   or the first org-linked participant found) and never validates that
   every `participant_ids` entry shares that org — a cross-org thread
   is not prevented by anything in the schema or the service today.
   "Whose `RetentionPolicies` row governs a shared thread" has no
   well-defined answer as the data model stands.
2. **There is no `is_deleted` column on `Messages` or `MessageThreads`
   at all** — confirmed by reading both models directly. Unlike
   `consents` (where the only blocker was exactly this kind of missing
   column, closed by `REQ113` in one small, additive change), `messages`
   would need the column *and* a resolved answer to (1) *and* a
   granularity decision (purge individual messages, or cascade a whole
   thread) before a purge could be written at all.

## Outcome

**No domain closed this slice.** Both remaining candidates
(`clinical_records`, `messages`) are genuinely blocked — one on a legal
question, one on a design/schema question neither reducible to a small
mechanical fix the way `consents` was. Logged as
`context/open-questions.md` #18 per Hard Rule 10, with the specific
scoping question spelled out for whoever makes the call, rather than
inventing an answer. This is the batch plan's own explicitly allowed
outcome for this slice ("if all three blockers are still genuinely
unresolved, this may need to become an open-question entry rather than
a shipped slice — an acceptable outcome, not a failure to force past"),
adjusted for the one blocker (`consents`) that turned out already
resolved before this slice started.

## Deliberately out of scope

- Adding `is_deleted` to `Messages`/`MessageThreads` speculatively,
  ahead of the multi-party scoping decision — would be schema churn
  without a clear consumer, the same discipline `REQ113`'s own doc used
  to justify picking `consents` over the other two in the first place.
- Any change to `clinical_records` — its blocker is unrelated to this
  slice's own investigation and needs a legal review this session
  cannot provide.
