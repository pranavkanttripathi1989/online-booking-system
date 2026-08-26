---
id: CTX-platform-integrations-2026-08-25-req064
type: improvement
feature: platform-integrations
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ064
related: [PLAN091, TP118, TR117]
---

# platform-integrations — Booking widget edit UI (2026-08-25)

Closes `project-plans/analysis/08-integration-gap-analysis.md` finding A-9 — the
last of the gap analysis's own real, actionable findings (`A-10`, `B-3`,
`B-4` remain S4/already-correctly-deferred, no action needed).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ064 | [Booking widget edit UI](../../requirements/platform-integrations/improvement/REQ064-platform-integrations-2026-08-25-booking-widget-edit-ui.md) |
| implementation-plans | PLAN091 | [implementation plan](../../implementation-plans/platform-integrations/improvement/PLAN091-platform-integrations-2026-08-25-booking-widget-edit-ui.md) |
| test-plans | TP118 | [test plan](../../test-plans/platform-integrations/improvement/TP118-platform-integrations-2026-08-25-booking-widget-edit-ui.md) |
| test-results | TR117 | [results — pass, 2/2](../../test-results/platform-integrations/improvement/TR117-platform-integrations-2026-08-25-booking-widget-edit-ui.md) |

## What shipped

An "Edit" action per booking-widget-config row on
`pages/settings/index.jsx`'s Integrations tab, calling the real
`updateBookingWidgetConfig` mutation without ever touching the row's own
`short_link_slug` — closing the "deactivate-and-recreate breaks every
embed" footgun the finding described. New unit case added to the
existing `settings/index.test.jsx`. e2e coverage added as a 5th test to
`frontend/e2e/gap-analysis-a4-a9.spec.js` (renamed from
`gap-analysis-a4-a8.spec.js` to reflect the added scope).

## This closes out the gap analysis's own real, actionable findings

`project-plans/analysis/08-integration-gap-analysis.md`'s "Fix sequencing" list
is now fully worked through: B-1, A-1, B-2, A-2/A-3, A-4 through A-9 all
done. `A-10` is explicitly not a new discovery (already logged
elsewhere as a deliberate scope cut); `B-3`/`B-4` are known, correctly
deferred mock pages with no backend domain to wire to yet.
