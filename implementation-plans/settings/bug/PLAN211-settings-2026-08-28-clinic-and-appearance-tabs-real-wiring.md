---
id: PLAN211
type: bug
feature: settings
created: 2026-08-28
updated: 2026-08-29
status: done
parent: null
related: [BUG044]
---

# PLAN211 — Settings' "Clinic" and "Appearance" tabs: real wiring

## Design decision (asked, not guessed)

`AskUserQuestion` on which clinic the "Clinic" tab edits, given multi-branch
orgs already have `/manager/clinics`. User chose: **the org's primary
clinic** (`is_primary: true`), matching `REQ041`'s existing "head office"
convention. Multi-branch orgs keep managing other locations via
`/manager/clinics`.

## Clinic tab

New `GET_CLINICS_FOR_SETTINGS`/`UPDATE_CLINIC_FOR_SETTINGS` gql operations,
matching the canonical `CLINICS_QUERY`/`UPDATE_CLINIC_MUTATION` field
selections verbatim (Hard Rule 7). `canManageClinic = hasRole('manager') ||
hasRole('admin') || hasRole('super_admin')`. `loadClinic()` finds the caller's
`is_primary` clinic (falls back to the first if none is flagged), populates
real form state; `handleSaveClinic()` calls the real mutation and only shows
success after it resolves, surfacing a real error otherwise.

Currency and "Default Slot Duration" fields dropped entirely — no real
per-clinic field exists for either (`Clinics` has no currency column; slot
duration is derived from the service, not stored on the clinic). Timezone
list replaced with the real IANA list already used by
`manager/clinics/edit.jsx` (`Asia/Kolkata` etc.), not the fake `UTC/IST/EST/
PST/CET/GST` abbreviation set.

Role gating: the "Clinic" `<Tab>` itself is now conditionally rendered
(`canManageClinic`), not just its content — a `'patient'`/`'clinician'`
account no longer sees the tab at all (SURF-20). Each `<Tab>` was given an
explicit `value={N}` so hiding one doesn't renumber the rest. A `useEffect`
clamps `tab` back to `0` if a stale deep link (mirroring `login.jsx`'s own
`navigate('/settings', {state:{tab}})` pattern) ever points a non-managing
caller at the now-hidden index 4.

## Appearance tab

`fontSize`/`accent`/`compact`/`rtl` persist to `localStorage
['medibook_appearance_prefs']` (this bug's own acceptance criteria: "server-
side or at minimum localStorage"), hydrated on mount, written only on
`Save Appearance`, which reports success only after the write succeeds
(catches a `localStorage` throw and shows a real error instead). RTL applies
live via `document.documentElement.dir`.

**Theme mode was pulled out of this tab's own local state during the same
session and given a much larger fix — see `BUG047`/`PLAN212`.** It turned
out the "Appearance tab doesn't persist" finding was one symptom of a
bigger, pre-existing problem (no real dark-mode mechanism existed anywhere
in the app at all, and the header's own separate dark-mode button was
equally fake). The Theme radio group here now reads/writes the shared
`useThemeMode()` context directly — applies immediately, no "Save" needed,
with an inline caption saying so.

## Testing

4 new tests in `settings/index.test.jsx`: Clinic tab absent for a
non-managing role; a stale deep link to index 4 redirects instead of
rendering an invalid `Tabs` value; Appearance save persists to
`localStorage` and confirms only after the write; a previously-saved font
size rehydrates instead of always defaulting. `npx eslint` and the full
existing suite (9/9) pass. Live-verified against the real dev stack — see
`TR231`.
