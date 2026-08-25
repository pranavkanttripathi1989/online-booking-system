---
id: PLAN145
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ105
related: []
---

# PLAN145 — Booking-widget embed code UI + real origin enforcement

## Backend — no schema change

`backend/src/booking-widget/booking-widget.service.ts` already has
`isOriginAllowed(slug, origin)` (private-ish, unused). Add one new
`@Public()` query, following `public.resolver.ts`'s exact convention
(camelCase, no auth):

```ts
// backend/src/booking-widget/booking-widget.resolver.ts
@Public()
@Query(() => Boolean)
validateBookingWidgetEmbed(
  @Args('slug') slug: string,
  @Args('origin') origin: string,
) {
  return this.bookingWidgetService.isOriginAllowed(slug, origin);
}
```

`isOriginAllowed` must be widened from effectively-private to a real
method the resolver can call — check its current visibility modifier
before implementing. No DTO/entity change. No migration.

## Frontend

**`frontend/src/pages/settings/index.jsx`** (Integrations tab, Booking
Widget block):
- New "Embed Code" `Button`/`IconButton` per row (only for `is_active`
  configs, matching the existing Edit/Deactivate visibility rule).
- New dialog state (`embedOpen`, `embedWidget`, `embedClinicianId`,
  `embedClinicians`).
- On open: if `embedWidget.clinic?.id` exists, query clinicians filtered
  to that clinic (reuse the existing clinicians query shape already
  imported elsewhere in this file or `graphql/queries.js` — verify exact
  field name before reuse, per Hard Rule 7); else query all org
  clinicians.
- Snippet template:
  ```html
  <iframe src="${window.location.origin}/appointments/book?doctor=${clinicianId}&widget=${slug}"
    width="100%" height="800" style="border:none" title="Book an appointment"></iframe>
  ```
- Copy button using `navigator.clipboard.writeText` with a fallback
  toast if unavailable (some sandboxed/non-HTTPS contexts lack it).
- "Preview" link: opens the same URL in a new tab.

**`frontend/src/pages/booking/index.jsx`**:
- Add a small effect: if `window.self !== window.top` (inside an
  iframe) and a `?widget=<slug>` param is present, read
  `document.referrer`, extract its origin, and call
  `validateBookingWidgetEmbed(slug, origin)` (new inline `@Public`
  query, no auth needed — matches this page's existing unauthenticated
  `OptionalAuthShell` context). If `document.referrer` is empty, skip
  the check entirely (render normally — documented limitation). If the
  check returns `false`, render a blocking `Alert` instead of the
  wizard.

## Testing

- `booking-widget.resolver.spec.ts`: new case — `validateBookingWidgetEmbed`
  delegates to `service.isOriginAllowed(slug, origin)`; is `@Public()`
  (no `@Auth` decorator — assert via reflector, same pattern as every
  other gating test in this repo).
- `booking-widget.service.spec.ts`: confirm existing `isOriginAllowed`
  coverage (inactive config → false; unknown slug → false; origin not
  in list → false; matching origin → true) — add any missing case.
- Frontend: extend `settings/index.test.jsx` with an "Embed Code" flow
  case (open dialog, pick clinician, snippet contains the right doctor
  id and origin).
- Live verification: generate a real snippet for a real seeded
  clinician, load `/appointments/book?doctor=<id>&widget=<slug>` in a
  new tab directly (not embedded — `document.referrer` will be empty,
  confirming the "skip when unavailable" path).

## Commits

Two: backend (`validateBookingWidgetEmbed` query + tests), frontend
(Embed Code dialog + booking-page referrer check + tests), matching
this session's per-slice convention.
