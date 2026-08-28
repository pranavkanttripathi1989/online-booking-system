---
id: BUG044
type: bug
feature: settings
created: 2026-08-28
updated: 2026-08-29
status: done
parent: null
related: [PLAN211, TP231, TR231]
---

# BUG044 — Settings' "Clinic" tab is 100% fabricated: hardcoded US/USD placeholder data, and "Save" does nothing real

## Source

Found live during a Chrome-DevTools-driven staff-role QA sweep, logged
in as `receptionist@medibook.dev` (org: "City Heart Clinic Group", real
branding correctly shown in the sidebar/header). Opening Settings →
Clinic showed:

- Clinic Name: **"MediCare Clinic"** — not the real org name
- Contact Phone: **"+1 555-100-0000"** — a US format, not India's fixed
  `+91` (`FRONTEND_RULES.md` FORM-4)
- Contact Email: **"admin@medicareclinic.com"** — a generic placeholder
- Address: **"123 Health Avenue, Medical District, MH 400001"** —
  generic placeholder, not the real clinic's address
- Currency: a dropdown defaulting to **"USD"**, offering `USD/EUR/GBP/
  INR/AED` — this codebase's own Hard Rule 9 fixes money as INR/paise;
  a per-clinic currency picker defaulting to USD contradicts that
  directly

## What's wrong, exactly

`frontend/src/pages/settings/index.jsx` lines 2079–2161 (the "Clinic"
`TabPanel`): every field is a MUI `TextField`/`select` with a literal
`defaultValue` — "MediCare Clinic", "+1 555-100-0000",
"admin@medicareclinic.com", "123 Health Avenue, Medical District, MH
400001", `Currency` defaulting to `"USD"`. There is no `useQuery`, no
GraphQL operation, no real data source anywhere in this tab — it is not
a mock *fallback*, there is no real path at all.

Worse: the tab's "Save Clinic Settings" button calls the shared
`handleSave('Clinic settings')` (line 944):

```js
const handleSave = (context = 'Changes') => {
  setSaved(`${context} saved successfully!`)
  setTimeout(() => setSaved(null), 2500)
}
```

— a pure client-side no-op. A real staff/manager/admin user who edits
these fields and clicks Save sees a genuine "Clinic settings saved
successfully!" confirmation while **nothing is persisted anywhere**.
This is the exact failure mode `FRONTEND_RULES.md` STATE-10/BOOK-19
warn against generalized to a settings form: false success feedback on
a completely fabricated write.

Not investigated as part of this finding: whether a real backend domain
for per-clinic settings (name/phone/email/address/timezone/slot
duration) already exists elsewhere in this codebase (e.g. `clinics`
module) that this tab could be wired to, or whether this needs new
backend scope — that's for whoever picks this up to determine before
fixing.

**The "Clinic" tab is also shown to every role, including `'patient'`
— confirmed live logged in as `patient@medibook.dev`.** `settings/
index.jsx` has zero role-based tab filtering anywhere in the file (no
`roles.includes(...)` gate on the tab list) — every account sees the
identical seven tabs (Profile, Account & Security, Notifications,
Appearance, Clinic, Integrations, Privacy, ...). A "Clinic Information"
editing tab (name/phone/email/address/currency/slot-duration) makes no
sense on a patient or clinician account at all, independent of the
fabricated-data problem above — this is a second, distinct gap
(missing role gating on the tab set itself), not just wrong content in
a tab shown to the right audience.

**The "Appearance" tab has the identical fabricated-data defect, same
root cause.** Its
"Save Appearance" button (line 2064) also calls the bare `handleSave`
directly with no mutation — `onClick={() => handleSave('Appearance
settings')}`. Its accent-color picker (`const [accent, setAccent] =
useState('#1565C7')`, line 937) is plain component state with no
`localStorage` persistence either, so a page reload silently reverts
the selection while the button just claimed "saved successfully." This
codebase's own established pattern (`handleSaveBranding`, line 916:
real `client.mutate(UPDATE_ORG_BRANDING)` first, `handleSave(...)` only
called after success) shows the correct shape every other tab on this
page uses — Clinic and Appearance are the two that were apparently
never finished.

## Acceptance criteria

- The "Clinic" tab reads real data for the caller's actual clinic
  (name, phone in `+91` format, email, address, timezone, slot
  duration) — no hardcoded `defaultValue`.
- The currency field either reflects Hard Rule 9 (INR, paise) or is
  removed if this codebase has no real per-clinic currency concept.
- "Save Clinic Settings" calls a real mutation and only shows success
  once the write actually succeeds; failure shows a real error, not the
  fabricated always-succeeds toast.
- Live-verified: editing a real field, saving, reloading the page, and
  confirming the change persisted.
- "Appearance" tab's accent-color selection persists (server-side or at
  minimum `localStorage`) and "Save Appearance" only confirms success
  once that persistence actually happens.
- The "Clinic" (and any other org-admin-scoped) tab is gated to the
  roles that actually manage clinic-level settings — not shown at all
  to `'patient'` or `'clinician'` accounts.

## Resolution

See `PLAN211`/`TP231`/`TR231`. Both tabs now real; the "Clinic" `<Tab>`
itself is now conditionally rendered, not just its content. Verifying the
Appearance fix live surfaced a second, larger, pre-existing bug (the
Theme radio's toggle did nothing anywhere in the app) — filed and fixed
separately as `BUG047`, since it turned out to be an app-wide theme-
architecture problem, not scoped to this page.
