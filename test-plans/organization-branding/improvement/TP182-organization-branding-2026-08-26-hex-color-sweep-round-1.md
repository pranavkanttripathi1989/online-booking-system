---
id: TP182
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN162
related: []
---

# TP182 — Test plan: hex-color sweep round 1

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | `patients/index.jsx` warning reduction | `eslint` before/after | 47 → 18 hex-color warnings |
| 2 | `ClinicianCard.jsx` warning reduction | `eslint` before/after | 26 → 13 hex-color warnings |
| 3 | Only exact-match tokens used | Diff review | Every substituted value's original hex byte-matches the token's real `theme.js` value |
| 4 | Compound CSS strings use a theme callback, not a broken token string | Diff review | `border`/`background`/`outline` values use `(t) => ...` or an in-scope `theme.palette...` reference |
| 5 | No new token invented, no guess | Diff review | Every non-exact-match literal left untouched |
| 6 | Full lint total | `eslint . --report-unused-disable-directives` | 1955 → 1911 |
| 7 | Ratchet lowered and passes | `npm run lint` | `--max-warnings` set to 1911, exits 0 |
| 8 | Build clean | `npm run build` | Succeeds, no syntax errors from theme-callback substitutions |
