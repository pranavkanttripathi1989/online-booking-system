---
id: CTX-appointments-2026-08-23-bug019
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: open
parent: BUG019
related: [REQ018, BUG011, BUG014, platform-nfr-2026-08-23-bug018]
---

# appointments — BUG019, realistic volume hides today's appointments (2026-08-23)

Found while running the full e2e suite against the new isolated stack's
2,000-appointment realistic dataset (`platform-nfr-2026-08-23-bug018`) — a
real, previously-undiscoverable defect, since the shared dev stack's ~4
appointments could never have surfaced it.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG019 | [realistic volume hides today's appointments](../../requirements/appointments/bug/BUG019-appointments-2026-08-23-realistic-volume-hides-todays-appointments.md) |
| implementation-plans | — | not written — deliberately deferred, see below |
| test-plans | — | not written |
| test-results | — | not written |

## Why no implementation-plan/test-plan/test-result

Per this session's own working rule ("if a failure is a real app bug
unrelated to seed data, document it as a new BUG rather than trying to
force the seed to work around it"), this was documented rather than fixed.
The fix touches a shared resolver default (`appointments()`'s `orderBy` and
lack of a date window) consumed by multiple pages beyond the two that
surfaced this — fixing it safely needs its own plan and its own regression
pass, not a same-pass patch. `status: open` reflects that honestly; no
`implementation-plans`/`test-plans`/`test-results` doc exists because no
implementation was attempted.

## What this does not do

Does not touch `backend/prisma/seed-e2e.ts` to route around this — Anita
Sharma's fixture appointment stays exactly where a real "today" appointment
would realistically be scheduled, on purpose.
