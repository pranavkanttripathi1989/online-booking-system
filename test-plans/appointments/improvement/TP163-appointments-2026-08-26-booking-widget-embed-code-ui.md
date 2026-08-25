---
id: TP163
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN145
related: [REQ105]
---

# TP163 — Test plan: booking-widget embed code UI

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
additive UI on an already-shipped, already-tested backend module.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `validateBookingWidgetEmbed` resolver | Marked `@Public()` |
| 2 | `validateBookingWidgetEmbed` resolver | Delegates to `service.isOriginAllowed(slug, origin)` verbatim |
| 3 | Settings — Embed Code dialog | Clicking "Embed Code" opens a dialog listing real org clinicians |
| 4 | Settings — Embed Code dialog | Selecting a clinician generates a snippet containing the correct `doctor=` id and `widget=` slug |
| 5 | Booking page — not embedded | Renders normally; the embed-validation query is skipped entirely (`window.self === window.top`) |
| 6 (live, deferred) | Booking page — embedded with an invalid origin | Blocking "not authorized" message — not verified live this session (see TR163) |
