---
id: REQ064
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ030
related: [REQ063]
---

# REQ064 — Booking widget edit UI

## Source

`project-plans/analysis/08-integration-gap-analysis.md` finding A-9 — the last
S3/S4-tier finding from the same fresh integration sweep that produced
A-4 through A-8 (`REQ060`–`REQ063`). Closes real, already-shipped backend
capability from `REQ018`'s own booking-widget scope that never got
frontend UI.

## Current-state gap

`backend/src/booking-widget/booking-widget.resolver.ts` has a real,
tested `updateBookingWidgetConfig(id, input)` mutation alongside
`create`/`deactivate`. `settings/index.jsx`'s Integrations tab only ever
called `createBookingWidgetConfig`/`deactivateBookingWidgetConfig` —
confirmed zero matches for `updateBookingWidgetConfig`. The only way to
change an existing widget's allowed origins was deactivate-and-recreate,
which mints a new `short_link_slug` and breaks anything already embedded
on the org's real site. Lower severity than the other findings in this
batch (annoying, not blocking), but a real, avoidable footgun.

## What shipped

An "Edit" button next to the existing "Deactivate" action on each
booking-widget-config row in `settings/index.jsx`'s Integrations tab,
opening a dialog pre-filled with the row's current allowed origins
(comma-separated, matching the existing "Register" field's own input
convention). Submitting calls the real `updateBookingWidgetConfig`
mutation and refetches — the embed slug (`short_link_slug`) is never
touched, since the input only ever sends `allowed_origins`.

## User stories

- As a manager, I can update which external sites may embed my booking
  widget without losing the embed link I've already shared or pasted
  into an iframe somewhere.

## Acceptance criteria (Given/When/Then)

- **Given** an active booking widget config, **when** a manager edits
  its allowed origins and saves, **then** the real
  `updateBookingWidgetConfig` mutation fires and the row reflects the
  new origins after refetch.
- **Given** the same edit, **then** the row's `short_link_slug` is
  unchanged — confirmed by asserting the original slug is still visible
  after the edit.

## Traceability

`REQ018` (US-BOOK-05, embeddable booking widget) via `REQ030`'s own
platform-integrations feature area — this closes the frontend edit path;
the backend mutation already shipped. No new `FR-*` scope — UI
completion for already-specified backend capability.
