---
id: REQ050
type: requirement
feature: messaging
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ024
related: []
---

# REQ050 — Shared-inbox thread assignment and SLA timer

First vertical slice of `REQ024` (direct messaging). Targets the
assignment/SLA half of US-MSG-02 — *"As a Front Desk staff member, I want
incoming patient messages routed to a shared inbox with assignment and an
SLA timer, so that no patient question sits unanswered because 'someone
else probably saw it.'"*

## Provenance — this doc is retroactive

The code (`assignThread()`, the `MessageThreads.assigned_to_user_id`/
`sla_due_at` columns, the frontend assignee picker) was written and
committed to `master` (`742179d`) as pre-existing in-progress work picked
up mid-session, referencing "REQ043" in its own code comments — but no
`REQ043` document was ever written, no implementation plan existed, and
`context/messaging-2026-08-22/manifest.md` (the real, still-`in-progress`
bundle for this feature) explicitly states *"this is a requirement-only
bundle... the next step is entering plan mode... not proceeding straight
to code."* Code shipped anyway. This document — `REQ050`, not `REQ043`,
since `REQ043` was never registered and this session's next free id is
050 — is the backfill `CLAUDE.md`'s working loop requires, written after
the fact rather than before, and paired with a real defect found and fixed
while backfilling it (see below).

## What was already built (before this session touched it)

- `MessageThreads.assigned_to_user_id`/`sla_due_at` (migration
  `20260823060000_message_threads_assignment_and_sla`).
- `MessagesService.assignThread()` — caller must be a thread participant;
  the assignee is added as a participant (so assignment grants a real way
  to respond, not just a label); a 24h SLA clock starts on first
  assignment only, never reset on reassignment.
- `assignThread` mutation, `frontend/src/pages/messages/index.jsx`'s
  assignee picker + SLA-status chip.

## What this session found and fixed

**A real, live cross-tenant gap in `assignThread`, found while backfilling
this doc and cross-checking the code against `CLAUDE.md` Hard Rule 6**
("a create/write mutation that takes an id in its input must validate it
belongs to the caller's org"). `assignThread`'s assignee lookup
(`userProfiles.findFirst({where: {id: assigneeUserId, is_deleted: false}})`)
never checked `client_org_id` at all. Since the assignee is then upserted
as a `MessageParticipants` row in the same transaction, any authenticated
participant of a thread could assign — and thereby grant message-read
access to — a user from a **completely different organization**. Fixed:
the assignee's `client_org_id` must match the thread's, or the rejection
is the same generic "Assignee not found" a nonexistent id gets — matching
this codebase's `assertSameOrg()` convention of never confirming
cross-tenant existence. A new unit test pins this (`messages.service.spec.ts`,
"rejects an assignee who belongs to a different org than the thread").

## What this does not do

- **No SLA escalation.** US-MSG-02's own acceptance criteria includes "an
  unassigned message past its SLA is escalated" — no escalation mechanism
  (notification, re-routing, visual alarm beyond the chip's color) exists.
  The chip only reflects overdue-vs-on-track status when viewed; nothing
  proactively surfaces it.
- **No canned replies** (US-MSG-03) — separate, unbuilt user story.
- **No clinical-record linkage or emergency-notice epics** — separate,
  larger `REQ024` scope, still fully unbuilt.
- **Caller-side tenant scoping relies entirely on participant membership**,
  not an explicit `client_org_id` check on the caller — this matches every
  other method in `messages.service.ts` (`thread`, `sendMessage`,
  `markThreadRead`), none of which check org directly either; participant
  rows are only ever created within one org today via `createThread`'s own
  org-derivation logic. This is a pre-existing architectural pattern, not
  something this slice introduces or was asked to redesign.
