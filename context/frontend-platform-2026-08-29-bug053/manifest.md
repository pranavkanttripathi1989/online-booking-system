---
id: CTX-frontend-platform-2026-08-29-bug053
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG051
related: [BUG053, PLAN221, TP241, TR241]
---

# Org accent color doesn't cascade everywhere it should (2026-08-29)

Found live by the user via two rounds of annotated screenshots: the
Calendar page's "New Booking" button rendered purple/indigo (the org's
real branding accent, per BUG051) while the sidebar header and other
buttons around it stayed teal; a second round showed the accent correctly
reaching the Settings > Appearance page while a Google-blue floating "+"
button (Appointments list) and "Save Clinic Settings" button (Settings >
Clinic) stayed off-brand blue instead.

BUG051's mechanism was never the problem — it's confirmed correct
end-to-end (the "New Booking" button already read `theme.palette.primary`
live). The actual defect: most of the rest of the app never adopted it,
holding fixed `#006D77`/`#00858F` teal literals or a copy-pasted
Google-blue gradient regardless of the org's real branding.

An Explore agent audited the whole `frontend/src` tree first
(`FRONTEND_RULES.md`'s own UI-2 waiver register cross-checked against
every hit, so a genuine deliberate exception — marketing panels, terminal/
code viewers, fixed sidebar chrome, color pickers, per-item identity
palettes, physical-output surfaces — was never mistaken for a bug); a
direct repo-wide grep for the two literal patterns then found several more
real offenders the audit's own read-window missed. Both were reconciled
before any fix was written, per the user's explicit "check all backend and
frontend files, don't skip anything" instruction.

Fixed in five phases (see `PLAN221` for the full file-by-file account):
`layouts/AppShell.jsx`'s sidebar header/nav chrome and `App.jsx`'s global
loaders (Phase 1, highest blast radius); booking/appointment residue
including the exact Google-blue FAB from the screenshot (Phase 2); three
role-dashboard greeting banners (Phase 3); a `secondary_color` wiring
(already exposed end-to-end by the backend, zero backend change needed)
into `theme.palette.secondary` (Phase 4); and `CalendarView.css`'s
FullCalendar overrides via a new `--mb-primary-rgb` CSS custom property,
the same "DOM-attribute hook for a 3rd-party stylesheet" pattern BUG047
already established for light/dark mode (Phase 4.5).

Three genuinely semantic, non-brand-tracking cards on
`appointments/detail.jsx` (Notes=purple, Timeline=amber, Clinician=green)
were explicitly identified and left untouched — confirmed live-verified
unchanged, not silently glossed over.

## Documents

- `requirements/frontend-platform/bug/BUG053-*.md` (done)
- `implementation-plans/frontend-platform/bug/PLAN221-*.md`
- `test-plans/frontend-platform/bug/TP241-*.md`
- `test-results/frontend-platform/bug/TR241-*.md`

## Verification

New unit tests: `layouts/AppShell.test.jsx`, a new describe block in
`pages/appointments/index.test.jsx`, a new describe block in
`pages/clinician/Dashboard.test.jsx`, `context/ThemeContext.test.jsx`
extended for `secondaryColor`. Full lint clean (0 errors, 0
`no-hardcoded-colors`) across every touched file; production build +
`npm run size` green. Live-verified against the real dev stack as
`manager@medibook.dev` and `clinician@medibook.dev` on the real "City
Heart Clinic Group" org (`primary_color: #080075`) — every fixed surface
renders the real accent, every deliberately-excluded surface confirmed
unchanged. See `TR241` for the full per-page account.

## Not done this pass, stated not hidden

`FRONTEND_RULES.md` §22's AppShell exception count (still says "38
accepted exceptions", predating this fix) was not re-audited/corrected in
this pass — a follow-up doc-hygiene item, not a functional gap.
