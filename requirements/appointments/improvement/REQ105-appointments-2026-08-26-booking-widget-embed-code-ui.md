---
id: REQ105
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ018
related: []
---

# REQ105 — Booking-widget "Embed Code" admin UI + real origin enforcement

## Why this slice

`REQ018`'s US-BOOK-05 shipped the booking-widget's config half
(`backend/src/booking-widget/`): an org admin can register allowed
iframe-embedding origins and gets a generated `short_link_slug` per
config, editable from `settings/index.jsx`'s Integrations tab. Nothing
was ever built to let the admin actually *see* a usable embed snippet —
and, on inspection, nothing resolves `short_link_slug` anywhere either.
`booking-widget.service.ts` already has an `isOriginAllowed(slug,
origin)` helper with its own comment saying it exists for exactly "a
future slice that adds a server-verified embed token" — this is that
slice.

Also found while reading `booking/index.jsx` (the actual embeddable
public booking page): it has no clinic-level entry point, only a
per-clinician one (`?doctor=<clinicianId>` query param, added by
`BUG011`). So a widget's embed snippet is necessarily for one specific,
admin-chosen clinician at that clinic — not a "pick any doctor here"
widget. This is a deliberate scope decision, not an oversight.

## What's in scope

- A public GraphQL query that validates a `(slug, origin)` pair against
  the real `isOriginAllowed()` helper — its first real caller.
- A new "Embed Code" action on each widget-config row in the
  Integrations tab, opening a dialog: pick a real clinician belonging to
  that config's clinic, get a copyable `<iframe>` snippet pointing at
  `/appointments/book?doctor=<id>`, and a "Preview" link.
- Best-effort client-side origin enforcement on `/appointments/book`
  itself: when loaded inside an iframe (`window.self !== window.top`)
  with a widget context, check the embedding origin via
  `document.referrer` against the new validation query and show a
  blocking "not authorized to embed this" message if it fails. This is
  explicitly a UX-level friendly error, not a security boundary — the
  real boundary is the browser's own `X-Frame-Options`/CSP
  `frame-ancestors`, which this slice does not add (a separate,
  larger, cross-cutting change to `main.ts`'s helmet config affecting
  every page, out of scope here).

## Acceptance criteria

- Given an admin with an active widget config, when they click "Embed
  Code" and pick a clinician, then they see a real, copyable iframe
  snippet using that config's real `short_link_slug`-adjacent id and the
  chosen clinician.
- Given a widget config with no `clinic_id` set, when the admin opens
  "Embed Code", then the clinician picker shows every clinician in
  their org (not scoped to one clinic), matching the DTO's own
  `clinic_id?` optionality.
- Given the booking page loaded inside an iframe from an origin NOT in
  the config's `allowed_origins`, when `document.referrer` is available,
  then a blocking message is shown instead of the booking flow.
- Given `document.referrer` is unavailable (stripped by the embedding
  page's own referrer policy), then the booking flow renders normally —
  this is a known, accepted limitation, not a bug to chase.

## Deliberately out of scope

- Server-enforced `X-Frame-Options`/CSP `frame-ancestors` per-origin
  (would need a global helmet config change affecting every route).
- Multi-clinician/clinic-level widget picker inside the embedded page
  itself (the underlying booking wizard doesn't support it yet).
- Any change to `short_link_slug` generation/rotation.
