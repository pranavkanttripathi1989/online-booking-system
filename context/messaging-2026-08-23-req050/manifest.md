---
id: CTX-messaging-2026-08-23-req050
type: requirement
feature: messaging
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ050
related: [REQ024, PLAN053, TP080, TR079]
---

# messaging — REQ050, thread assignment and SLA timer (2026-08-23)

First vertical slice of `REQ024`. This bundle is a retroactive backfill —
the feature's code was already committed (`742179d`) before any
requirement/plan/test documentation existed for it, referencing an
unregistered "REQ043" in its own comments; `context/messaging-2026-08-22/manifest.md`
(the real, still-`in-progress` bundle for `REQ024`) explicitly says code
shouldn't have shipped yet. This bundle documents what actually happened:
the pre-existing feature, plus a real security defect found and fixed
while writing this doc.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ050 | [thread assignment and SLA timer](../../requirements/messaging/requirement/REQ050-messaging-2026-08-23-thread-assignment-and-sla-timer.md) |
| implementation-plans | PLAN053 | [implementation](../../implementation-plans/messaging/requirement/PLAN053-messaging-2026-08-23-thread-assignment-and-sla-timer.md) |
| test-plans | TP080 | [test plan](../../test-plans/messaging/requirement/TP080-messaging-2026-08-23-thread-assignment-and-sla-timer.md) |
| test-results | TR079 | [results](../../test-results/messaging/requirement/TR079-messaging-2026-08-23-thread-assignment-and-sla-timer.md) |
| test-suggestions | — | skipped — backfilled documentation for already-shipped code, not new exploratory work |

## What this closes

The assignment/SLA half of `REQ024`'s US-MSG-02. SLA escalation, canned
replies (US-MSG-03), and the clinical-record-linkage/emergency-notice
epics remain unbuilt — `REQ024` itself stays `draft`.

## Real finding made while building this (not assumed)

`assignThread()`'s assignee lookup had zero `client_org_id` check — any
thread participant could assign, and thereby grant message-read access
to, a user from a completely different organization. Confirmed by reading
the shipped code directly, not assumed from the PRD or a prior audit.
Fixed the same session this was found, with a unit test proving the
rejection.

## Process note

This bundle exists specifically because the normal order (requirement →
plan → code → test → results) was skipped for the original commit. Filed
here rather than silently left undocumented, matching this project's own
stated principle that a stale or missing index is worse than none.
