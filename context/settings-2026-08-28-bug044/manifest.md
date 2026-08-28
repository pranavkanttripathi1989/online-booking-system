---
id: CTX-settings-2026-08-28-bug044
type: bug
feature: settings
created: 2026-08-28
updated: 2026-08-29
status: done
parent: null
related: [BUG044, PLAN211, TP231, TR231]
---

# Settings' "Clinic" and "Appearance" tabs — real wiring (2026-08-28/29)

The last of the 18 findings from the 2026-08-28 five-role Chrome QA sweep.
Both tabs were fully fabricated — Clinic showed hardcoded US placeholder
data with a USD currency picker; Appearance's accent-color state had no
persistence at all. Both now real: Clinic reads/writes the org's primary
clinic (`is_primary`, per an explicit `AskUserQuestion` choice, matching
`REQ041`'s existing convention) and is hidden entirely for non-managing
roles; Appearance persists to `localStorage`.

Verifying the Appearance fix live surfaced a second, larger, pre-existing
bug the user found directly — toggling "Dark" did nothing, and the
`AppShell` header had its own separate, equally broken dark-mode button.
That turned into its own bundle: `frontend-platform-2026-08-29-bug047`.

## Documents

- `requirements/settings/bug/BUG044-*.md` (done)
- `implementation-plans/settings/bug/PLAN211-*.md`
- `test-plans/settings/bug/TP231-*.md`
- `test-results/settings/bug/TR231-*.md`
