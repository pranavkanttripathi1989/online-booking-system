---
id: PLAN090
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ063
related: []
---

# PLAN090 — Implementation plan for the webhook delivery log UI

Technical implementation plan for `REQ063`. No backend change —
`webhookDeliveryLog` already exists and is already tested.

## Backend facts confirmed before designing the UI

- `webhookDeliveryLog(endpoint_id)` returns `WebhookDeliveryLogEntry[]`:
  `id`, `event_type`, `status`, `http_status` (nullable), `attempted_at`,
  `response_snippet` (nullable). Gated `manager`/`admin`/`super_admin` —
  the same gate already governing this tab's other webhook actions, so
  no new role check was needed on the frontend beyond what already
  guards the Integrations tab's visibility.
- `settings/index.jsx` fetches all of its Integrations-tab data
  imperatively via `useApolloClient()`'s `client.query()`, not
  declarative `useQuery` hooks (this page's own established pattern
  across every tab) — the delivery log follows the same
  `client.query({..., fetchPolicy: 'network-only'})` shape as every
  sibling load function on this page, rather than introducing a
  different data-fetching style for one dialog.

## Frontend — `frontend/src/pages/settings/index.jsx`

New inline `GET_WEBHOOK_DELIVERY_LOG` query. A "Delivery Log" button
added to each webhook endpoint row (next to the existing "Deactivate"
action, both now inside a `Stack` since a row can show one or both). New
`deliveryLogFor`/`deliveryLog`/`deliveryLogLoading` state and a
`viewDeliveryLog(endpoint)` handler that queries
`GET_WEBHOOK_DELIVERY_LOG` on open, matching the imperative-fetch
pattern above. A new `Dialog` (placed alongside this page's other
dialogs) renders the endpoint's URL, a loading spinner while fetching, a
real empty state when there are no deliveries yet, or a table of
event/status/HTTP-status/timestamp rows, newest data as returned by the
backend (no client-side re-sort — the resolver's own ordering is
trusted, matching how every other list on this page is rendered as-is).

## Testing (see `TP117`)

- New `frontend/src/pages/settings/index.test.jsx`: real empty state
  when a webhook has no deliveries yet; real delivery attempts
  (including a failed one) render inside the dialog. Required mocking
  every query this page's several `useEffect`s fire unconditionally on
  mount (profile, sessions, notification preferences, break-glass
  grants, org branding, patient link, integrations) — all fired
  regardless of which tab is initially selected, so all had to be
  covered even though the test only exercises the Integrations tab.
- e2e coverage added to `frontend/e2e/gap-analysis-a4-a8.spec.js`: a
  manager creates a real webhook endpoint pointed at a deliberately
  unreachable URL, a real `appointment.created` event fires from a
  fixture booking, and the Delivery Log dialog shows the real `failed`
  attempt — the same live-verification pattern this codebase's own
  Phase G+2 pass first established for webhook delivery.

## What this does not close

No manual "retry delivery" action (the backend has no such mutation —
`REQ030`'s own P1 scope explicitly deferred retry/backoff entirely, best
-effort/synchronous delivery only). No delivery-log pagination — the
backend query returns the full history unpaginated; acceptable at this
scale, flagged as a future concern if a single endpoint accumulates a
very large delivery history.
