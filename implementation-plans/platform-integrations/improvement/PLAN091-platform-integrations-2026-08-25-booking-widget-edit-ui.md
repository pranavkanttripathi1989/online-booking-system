---
id: PLAN091
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ064
related: []
---

# PLAN091 — Implementation plan for the booking widget edit UI

Technical implementation plan for `REQ064`. No backend change —
`updateBookingWidgetConfig` already exists and is already tested.

## Backend facts confirmed before designing the UI

- `BookingWidgetConfigInput` is shared between `create` and `update` —
  `allowed_origins` (required array of URLs), optional `clinic_id`,
  optional `short_link_slug`. The update mutation takes `(id, input)`;
  omitting `short_link_slug` from the edit payload leaves the existing
  one untouched server-side (confirmed via `booking-widget.service.ts`'s
  own `update()` — a partial-update convention, not "clear if omitted",
  matching this codebase's own documented convention for most mutations).
- `updateBookingWidgetConfig` returns the same
  `BookingWidgetMutationResultType` shape (`success`/`userErrors`/
  `config`) as `create` — the frontend's existing `submitWidget()`
  error-handling pattern (`if (!data?.X?.success) throw new
  Error(data?.X?.userErrors?.[0]?.message ?? ...)`) was reused verbatim
  for the new `submitEditWidget()`.

## Frontend — `frontend/src/pages/settings/index.jsx`

New inline `UPDATE_BOOKING_WIDGET` mutation. New `editingWidget`/
`editWidgetOrigins` state, `openEditWidget(w)` (pre-fills the origins
field from the row's own current `allowed_origins`), and
`submitEditWidget()` (calls the mutation with only `allowed_origins` in
the input — `short_link_slug` deliberately omitted so the existing slug
is never touched). An "Edit" button added next to "Deactivate" on each
widget-config row (both now in a `Stack`, matching the same row-actions
pattern already used for the webhook-endpoints table's own "Delivery
Log"/"Deactivate" pair added in this same batch). A new `Dialog` shows
the row's `short_link_slug` as read-only context text so the manager can
see it isn't changing, plus the editable origins field.

## Testing (see `TP118`)

- New case added to the existing `frontend/src/pages/settings/index.test.jsx`:
  editing a widget's origins calls the real mutation with the correct
  `{id, input: {allowed_origins}}` shape (no `short_link_slug` sent),
  and the row reflects the new origins with the same slug after
  refetch.
- e2e coverage added as a 5th test to the shared
  `frontend/e2e/gap-analysis-a4-a9.spec.js` (renamed from
  `gap-analysis-a4-a8.spec.js` to reflect the added scope): a manager
  creates a real widget config, edits its origins through the UI, and
  confirms both the new origin and the original (unchanged) embed slug
  are visible afterward.

## What this does not close

No `clinic_id` reassignment via this edit dialog (the input field
exists on the backend but the existing "Register" form never collected
it either — out of scope, matching the pre-existing create flow's own
scope).
