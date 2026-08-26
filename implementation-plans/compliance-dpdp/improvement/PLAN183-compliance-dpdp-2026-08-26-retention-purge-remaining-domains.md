---
id: PLAN183
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ143
related: [TP203, TR203]
---

# PLAN183 — Implementation plan: DPDP retention-purge, remaining domains re-investigated

## Change

No application code change. This slice's own deliverable is the
investigation and its documented conclusion — matching the batch plan's
own explicit allowance for this slot ("if all three blockers are still
genuinely unresolved, this may need to become an open-question entry
rather than a shipped slice").

**Investigation steps taken, in order:**

1. Read `REQ073`'s own three-blocker account fresh, rather than trusting
   the batch plan's restatement of it.
2. Checked the current `Consents` model in `backend/prisma/schema.prisma`
   directly — found `is_deleted` already present, contradicting the
   batch plan's premise. Traced it to `REQ113` (same day, earlier in
   this session, before this 10-slice batch started) — already closed,
   nothing to redo.
3. Re-confirmed `clinical_records`' blocker is unchanged (a legal-review
   question named in `REQ034`'s own doc — out of this session's reach).
4. Re-investigated `messages` fresh rather than re-citing `REQ073`'s own
   summary verbatim: read `messages.service.ts#createThread()` directly
   and confirmed the multi-org-participant scoping gap is real and
   structural (no validation that all `participant_ids` share
   `client_org_id`), and read `MessageThreads`/`Messages` in
   `schema.prisma` directly and confirmed neither has an `is_deleted`
   column at all — a second, independent blocker `REQ073`'s own prose
   didn't separately call out.

**`context/open-questions.md`**: new entry #18, spelling out the two
independent `messages` blockers (policy-ownership ambiguity for a
cross-participant thread; the missing schema column) and the specific
decision needed from the user, per Hard Rule 10 — not inventing an
answer to either.

**`requirements/compliance-dpdp/improvement/REQ143-...md`**: records the
full investigation and its outcome.

## Testing

Not applicable — no code changed. The investigation's own "test" was
reading the current schema and service code directly rather than
trusting a prior document's restatement of it, which is exactly what
surfaced the stale `consents` premise and the second `messages` blocker.

## Documentation

`REQ143` (this requirement), `PLAN183` (this plan), `TP203`/`TR203`
(the investigation's own verification record), a context bundle, and
index updates across all five doc roots plus the `compliance-dpdp`
feature README.
