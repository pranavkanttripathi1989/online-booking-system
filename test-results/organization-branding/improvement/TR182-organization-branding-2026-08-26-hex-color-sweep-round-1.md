---
id: TR182
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP182
related: []
---

# TR182 — Test results: hex-color sweep round 1

All 8 `TP182` cases pass.

`npx eslint src/pages/patients/index.jsx`: 0 errors; hex-color warnings
47 → 18 (confirmed by direct count before and after).

`npx eslint src/components/Clinicians/ClinicianCard.jsx`: 0 errors;
hex-color warnings 26 → 13.

`npx eslint . --report-unused-disable-directives`: 1911 total warnings
(down from the pre-slice baseline of 1955), 0 errors.

`npm run lint` (against the updated `--max-warnings 1911`): exit code 0.

`npm run build`: succeeds — `✓ built in 58.76s`, no errors.

## No backend change

This slice touched only frontend `sx` colour values and
`package.json`'s lint script — zero backend/GraphQL impact.

## Live verification

Not performed against a real browser — no browser-automation tool
available this session (consistent with several other slices in this
batch). Risk assessed as low: every substitution is an exact-value
token swap (verified byte-identical to the original hex in `theme.js`'s
own definitions), not a semantic guess, so the rendered colour should
be pixel-identical to before. `npm run build`'s clean compile is the
strongest available confirmation without a live pass.
