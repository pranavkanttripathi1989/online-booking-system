---
id: PLAN053
type: requirement
feature: messaging
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ050
related: []
---

# PLAN053 — Implementation plan: thread assignment and SLA timer

## Files touched (this session's portion — the fix and backfill only)

- `backend/src/messages/messages.service.ts` — cross-tenant fix in `assignThread()`
- `backend/src/messages/messages.service.spec.ts` — fixture fix + new cross-tenant test
- `requirements/messaging/requirement/REQ050-*.md` (new, this doc's parent)
- `implementation-plans/messaging/requirement/PLAN053-*.md` (this file, new directory)
- `test-plans/messaging/requirement/TP080-*.md` (new directory)
- `test-results/messaging/requirement/TR079-*.md` (new directory)
- `context/messaging-2026-08-23-req050/manifest.md` (new)

The feature's own code (`assignThread`, migration, entity/resolver/frontend
fields) was already committed in `742179d` before this plan was written —
see `REQ050`'s "provenance" section for why the plan is retroactive.

## Design decision — the fix

**Check the assignee's `client_org_id` against the thread's, not the
caller's.** The caller is already implicitly org-scoped (must be a thread
participant, and participant rows only ever exist within the thread's own
org per `createThread`'s derivation logic) — the actual missing check was
on the *assignee* side, since nothing stopped a caller from naming a user
id belonging to any other tenant. Comparing against `thread.client_org_id`
(not `user.client_org_id`) also correctly handles an org-less
platform-operator caller (`admin`/`super_admin`) assigning within a
specific org's thread — the relevant org is the thread's, not the caller's,
which may be `null`.

**Fetch order matters for the test to mean what it says.** Moved the
`messageThreads.findUnique` call before the assignee lookup (previously
assignee-then-thread) — otherwise a test asserting "assignee not found"
could pass for the wrong reason (thread not found, checked earlier) rather
than actually exercising the assignee-rejection branch, which is exactly
what happened to the pre-existing "rejects an assignee that does not
exist" test until this session fixed its mock to supply a valid thread.

## Verification

- `npx jest messages.service --maxWorkers=2` — 18/18 pass (3 new: the
  cross-tenant rejection, plus the two pre-existing tests' fixtures
  corrected to supply `client_org_id` so they exercise the intended
  same-org happy path rather than accidentally relying on `undefined !==
  'org-a'` being false).
- `npx jest --maxWorkers=2` (full backend suite) — 760/760 pass; the one
  pre-existing, unrelated `@nestjs/schedule` compile failure is untouched
  by this fix (confirmed present before this session started).
- `npx tsc --noEmit` — 0 new errors.
- `npx eslint src/messages` — 0 errors, 0 warnings.
- `npx prisma generate` — run to fix a real, separate finding: the
  Prisma Client committed in `742179d` had never been regenerated after
  the schema/migration change, so the suite failed to even compile
  (`assigned_to_user_id`/`sla_due_at` unknown on the generated types) until
  this was run. Not a source-code change — the derived client artifact was
  simply stale relative to `schema.prisma`.
