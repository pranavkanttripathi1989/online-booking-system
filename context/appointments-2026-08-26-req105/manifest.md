---
id: CTX-appointments-2026-08-26-req105
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ105
related: [PLAN145, TP163, TR163]
---

# appointments — REQ105: booking-widget embed code UI (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ105 | [booking-widget embed code UI](../../requirements/appointments/improvement/REQ105-appointments-2026-08-26-booking-widget-embed-code-ui.md) |
| implementation-plans | PLAN145 | [implementation plan](../../implementation-plans/appointments/improvement/PLAN145-appointments-2026-08-26-booking-widget-embed-code-ui.md) |
| test-plans | TP163 | [verification plan](../../test-plans/appointments/improvement/TP163-appointments-2026-08-26-booking-widget-embed-code-ui.md) |
| test-results | TR163 | [verification results — pass](../../test-results/appointments/improvement/TR163-appointments-2026-08-26-booking-widget-embed-code-ui.md) |

## What shipped

New `@Public()` `validateBookingWidgetEmbed(slug, origin)` query
delegating to the already-existing `isOriginAllowed()` helper (built by
`REQ018` but never called until now). New "Embed Code" action on each
widget-config row in `settings/index.jsx`'s Integrations tab — a dialog
picking a real clinician and generating a copyable `<iframe>` snippet.
Best-effort, UX-level referrer-based origin check on the public booking
page when loaded with a `?widget=` param inside an iframe (explicitly
not a security boundary — that would need a server `X-Frame-Options`/CSP
change, out of scope).

## Verification

Backend: 2/2 suites, 11/11 tests, `tsc --noEmit` clean. Frontend: 2/2
suites, 14/14 tests (10 pre-existing regression-free + 4 new), `eslint`
clean. Live embedded-origin verification deferred — the shared dev
backend had uncommitted, in-progress changes from a parallel session at
verification time; restarting it risked disrupting that session.
