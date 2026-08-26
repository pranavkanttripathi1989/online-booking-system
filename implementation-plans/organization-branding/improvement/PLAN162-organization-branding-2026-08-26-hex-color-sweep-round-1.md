---
id: PLAN162
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ122
related: [TP182, TR182]
---

# PLAN162 — Implementation plan: hex-color sweep round 1

## Method

1. Extracted the exact set of `'#RRGGBB'` values literally present in
   `theme.js`'s `COLORS` object and `palette` block, mapped each to its
   safe `sx`-token-path equivalent (e.g. `#1A73E8` → `'primary.main'`,
   `#E8EAED` → `'divider'`, `#5F6368` → `'text.secondary'`).
2. Ranked every file by hex-color lint-warning count; for the top files,
   cross-checked how many of their literals exactly matched that table.
3. Converted only exact matches. `color`/`bgcolor`/`backgroundColor`/
   `borderColor` values became plain token-path strings (`'primary.main'`);
   compound CSS strings (`border: '1px solid #hex'`, gradient
   `background`, `outline`) became a theme-callback function
   (`(t) => \`1px solid ${t.palette.divider}\``) or, where the component
   already had a `theme` variable from `useTheme()` in scope
   (`ClinicianCard.jsx`), a direct template-literal reference to it —
   MUI's `sx` prop only resolves token-path strings for a specific set
   of simple style keys, not substrings inside a composite value.
4. Left every non-exact-match literal untouched — no new token was
   invented and no "close enough" guess was made.

## Change

**`frontend/src/pages/patients/index.jsx`**: 19 substitutions across
merge-review borders, header text, the "Add Patient" gradient button,
search/filter chips, the A-Z alphabet filter, the results table header/
rows/avatar, and two icon-button colours. 47 → 18 hex-color warnings.

**`frontend/src/components/Clinicians/ClinicianCard.jsx`**: 10
substitutions across the availability heatmap, the card border/hover,
the clinician-type chip, the services chips, and the "View Profile"
button. Left the `NAME_COLOURS` avatar-hash array untouched — a
deliberate multi-value palette for visually distinguishing clinicians
by name-hash, not a branding bypass. 26 → 13 hex-color warnings.

**`frontend/package.json`**: `lint` script's `--max-warnings` lowered
1955 → 1911, matching the measured new total.

## Testing

`npx eslint src/pages/patients/index.jsx
src/components/Clinicians/ClinicianCard.jsx`: 0 errors on both; hex-color
warning counts confirmed via direct count (47→18, 26→13).

`npx eslint . --report-unused-disable-directives`: 1911 total warnings
(down from 1955), 0 errors.

`npm run lint`: exits 0 against the new `--max-warnings 1911` threshold.

`npm run build`: succeeds cleanly — confirms the theme-callback function
substitutions for compound CSS strings are syntactically valid and
don't break the production bundle.

## Documentation

`REQ122` (this requirement), `PLAN162` (this plan), `TP182`/`TR182`
(verification), a context bundle, and index updates across all five doc
roots plus the `organization-branding` feature README.
