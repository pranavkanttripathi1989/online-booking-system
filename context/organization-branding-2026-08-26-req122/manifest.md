---
id: CTX-organization-branding-2026-08-26-req122
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ122
related: [PLAN162, TP182, TR182]
---

# organization-branding — REQ122: hex-color sweep round 1 (2026-08-26)

Ninth slice of the next 10-slice batch (`project-plans/analysis/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ122 | [Hex-color sweep round 1](../../requirements/organization-branding/improvement/REQ122-organization-branding-2026-08-26-hex-color-sweep-round-1.md) |
| implementation-plans | PLAN162 | [implementation plan](../../implementation-plans/organization-branding/improvement/PLAN162-organization-branding-2026-08-26-hex-color-sweep-round-1.md) |
| test-plans | TP182 | [verification plan](../../test-plans/organization-branding/improvement/TP182-organization-branding-2026-08-26-hex-color-sweep-round-1.md) |
| test-results | TR182 | [verification results — pass](../../test-results/organization-branding/improvement/TR182-organization-branding-2026-08-26-hex-color-sweep-round-1.md) |

## What shipped

The first real reduction against `REQ077`'s ratchet-only gate: an
exact-match-only sweep (a hex literal converted only when byte-identical
to a real `theme.js` token — no new tokens invented, no semantic
guesses) across the two files with the highest concentration of exact
matches, `pages/patients/index.jsx` (47→18 warnings) and
`components/Clinicians/ClinicianCard.jsx` (26→13). Total frontend lint
warnings: 1955→1911; the `--max-warnings` ratchet lowered to match.

**Scope correction, documented not hidden**: the original "~12 files"
plan was narrowed after investigation showed the highest-warning files
use dozens of distinct hex values with no existing token — converting
those safely needs new tokens defined first (a design decision) or live
visual verification (no browser tool available this session), not a
blind sweep. This slice did what could be done both safely and
completely.

## Verification

Frontend: `eslint` 0 errors on both touched files; full-repo warning
count reduced 1955→1911; `npm run lint` passes against the lowered
ratchet; `npm run build` succeeds cleanly. No backend change. Live
browser verification not performed — risk assessed low since every
substitution is an exact-value token swap, not a guess.
