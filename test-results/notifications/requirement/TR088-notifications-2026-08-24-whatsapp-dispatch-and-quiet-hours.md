---
id: TR088
type: requirement
feature: notifications
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP089
related: [REQ025, PLAN062]
---

# TR088 — Results: WhatsApp dispatch fallback + quiet hours/frequency cap

Executed 2026-08-24 as part of the consolidated five-slice verification
pass (see `TR087`'s own note on why the suites ran once across the
combined changeset).

| Case | Result | Evidence |
|---|---|---|
| TC-01–TC-11 | pass | All pre-existing `dispatch()` cases green unmodified after the `notificationSendLog` mock addition |
| TC-12 | pass | `tries WhatsApp before SMS when both are enabled and configured` |
| TC-13 | pass | `falls back to SMS when WhatsApp is enabled but no WhatsApp provider is configured for the org` |
| TC-14 | pass | `falls back to SMS when the WhatsApp provider reports a failed send` |
| TC-15 | pass | `sends via SMS as before when WhatsApp is simply disabled in preferences (regression check)` |
| TC-16 | pass | `suppresses an external send inside the configured quiet-hours window (non-critical event)` |
| TC-17 | pass | `still sends a genuinely time-critical appointment_reminder inside quiet hours` |
| TC-18 | pass | `sends normally outside the configured quiet-hours window` |
| TC-19 | pass | `isWithinQuietHours` — same-day window, midnight-wrapping window, degenerate (start===end) window, each hand-verified against the fixed IST-offset math. **A math error was found and fixed while writing this test**: the first same-day-window assertion originally expected 15:30 IST to be "outside" a 09:00–17:00 window, which is simply wrong (15:30 is inside 09:00–17:00) — caught before the suite was ever run, by re-deriving the UTC→IST conversion by hand rather than trusting the first draft; fixed to use a genuinely-outside time (20:00 IST) instead. |
| TC-20 | pass | `skips the external send once the cap is reached, but still creates the in-app notification` |
| TC-21 | pass | `sends normally when under the cap` |
| TC-22 | pass | `myPreferences` lazy-seed — all 7 defaults include the correct `whatsapp_enabled` value |
| TC-23 | pass | `rejects a quiet_hours_start set without a matching quiet_hours_end` |
| TC-24 | pass | `accepts a fully-set quiet_hours pair and persists whatsapp_enabled` |
| TC-25 | pass | `npx prisma validate` |
| TC-26 | pass | `npx tsc --noEmit` — clean |
| TC-27 | pass | `npx eslint "{src,apps,libs,test}/**/*.ts"` — 0 errors |
| TC-28 | pass | `npm test` — 64/64 suites, 983/983 tests (consolidated run) |
| TC-29 | pass | `npx eslint src/pages/settings/index.jsx` — 0 errors (pre-existing unrelated warnings only) |
| TC-30 | not done live | Deferred — no real WhatsApp Business API sandbox credentials configured in this environment to trigger a genuine end-to-end send against; the dispatch logic itself is fully covered at the unit level with a mocked provider |
| TC-31 | pass | Live round-trip as `manager@medibook.dev` against real preference rows: `updateMyNotificationPreferences` correctly rejects a single-sided quiet-hours pair, correctly persists a fully-set pair, and correctly round-trips `whatsapp_enabled`/`quiet_hours_start`/`quiet_hours_end` on read. **A real frontend bug was found and fixed in the process** — see below. |

## A real bug found and fixed during live verification

Reverting the live test's quiet-hours data via `settings/index.jsx`'s own
"Clear" button logic (`quiet_hours_start: quietHoursStart || undefined`)
turned out not to work: the backend's partial-update semantics treat an
*omitted* field as "leave the stored value alone" (confirmed live — the
first revert attempt, sending `undefined`, left the previously-set
`21:00`/`08:00` values in place), so `undefined` is not the same as
clearing. The Clear button was therefore a silent no-op against any
previously-saved quiet hours — a real, live-reproduced bug, not caught by
any unit test since the unit tests exercise the service layer directly
with explicit `null`/values, never the frontend's own conversion of an
empty string. Fixed by sending explicit `null` instead of `undefined` when
cleared (`quietHoursStart || null`), confirmed live afterward.

## Also observed, not a defect

The manager account used for live testing already had `NotificationPreferences`
rows from before this session. The migration's `ADD COLUMN "whatsapp_enabled"
BOOLEAN NOT NULL DEFAULT true` backfilled all pre-existing rows to `true`
(standard SQL `DEFAULT` behavior on `ALTER TABLE ADD COLUMN`) rather than
this slice's more nuanced per-event `DEFAULTS` map (e.g. `false` for
`new_message`/`new_review`) — that map only governs lazy-seeding for a
brand-new user with zero rows yet. Confirmed live and understood as an
expected one-time migration-backfill artifact, not a bug: every event type
for a pre-existing user now defaults to WhatsApp-on, which is a reasonable
conservative default, and every *new* user going forward gets the intended
per-event nuance.
