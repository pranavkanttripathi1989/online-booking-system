---
id: REQ122
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ077
related: [PLAN162, TP182, TR182]
---

# REQ122 — Theme-token hex-color sweep, round 1

## Why this slice

`REQ077` shipped the `no-hardcoded-colors` lint rule as a ratchet only —
a gate that stops the count from growing, not a fix for the 1955
existing violations it measured. `CLAUDE.md`'s own design-system note is
explicit about the consequence: `REQ002`'s real, shipped org-branding
feature (logo, primary/secondary colour pickers, server-side WCAG-AA
contrast validation, propagated into `AppShell`) **cannot actually
re-theme the product**, because most files bypass the theme it feeds.
This slice is the first real reduction pass, not just the gate.

## Scope correction, found before starting

The original batch plan named "~12 files" as the target. Investigated
before touching anything: `frontend/src/theme/theme.js` only exports a
strict, small set of exact hex→token mappings (verified by extracting
every literal `'#RRGGBB'` value from the real `COLORS` object and the
`palette` block — not guessed from the file's own header comment, which
turned out to itself be stale in one place: it lists `#9AA0A6` as "Text
3", but the actual `COLORS.ink500` constant is `#80868B` — a real,
pre-existing drift between the theme's own documentation and its code).
Many of the highest-warning-count files (`calendar/index.jsx` 150,
`finances/index.jsx` 115, `appointments/detail.jsx` 112) turned out to
use dozens of *distinct* hex values with no existing token at all —
converting those correctly would mean either inventing new tokens
(a design decision, not a mechanical sweep) or guessing a "close enough"
semantic mapping, which risks a visual regression with no way to verify
it live this session (no browser tool available). Rather than either
skip the finding again or risk shipping wrong mappings across 12 files,
this slice did an **exact-match-only sweep**: a hex literal was only
converted when its value is byte-identical to a real token already
defined in `theme.js`. Two files had the highest concentration of exact
matches — `pages/patients/index.jsx` (40 of 47 warnings) and
`components/Clinicians/ClinicianCard.jsx` (13 of 26, after excluding a
deliberate multi-value avatar-hash palette, not a branding bypass) —
and both were swept completely.

## What shipped

- `pages/patients/index.jsx`: 47 → 18 hex-color warnings (29 fixed).
- `components/Clinicians/ClinicianCard.jsx`: 26 → 13 (13 fixed).
- Frontend lint total: 1955 → 1911 warnings. `package.json`'s
  `--max-warnings` ratchet lowered from 1955 to 1911 to lock the
  improvement in, matching this repo's own "ratcheted, may only go
  down" convention.
- `npm run build` confirmed clean (no syntax regressions from the
  theme-callback substitutions used for compound CSS strings like
  `border: '1px solid #hex'` and gradient `background` values, which
  MUI's `sx` prop doesn't resolve as simple token paths the way
  `color`/`bgcolor`/`borderColor` do).

## What remains, deliberately not attempted here

Every hex literal left in both swept files has no exact token
equivalent — genuinely undefined shades (`#9AA0A6`, `#F1F3F4`,
`#F5C6C2`, gender-badge colours, a deliberate multi-value avatar-hash
palette) that would need a real design decision (add a token to
`theme.js`, or confirm an existing token is "close enough") before
converting, not a mechanical substitution. The ten remaining
highest-warning files (`calendar`, `finances`, `appointments/detail`,
`AppShell`, `messages`, `clinician/Calendar`, `appointments/index`,
`auth/login`, `RecentAppointmentsTable`, `staff/edit`) are untouched —
sized for their own future slice(s) with either new tokens defined
first or a live-browser verification pass, not blind substitution.
