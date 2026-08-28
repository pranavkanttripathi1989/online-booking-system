---
id: TP232
type: bug
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN212
related: [BUG047, BUG044]
---

# TP232 — Test plan for PLAN212

| # | Case | Expected |
|---|---|---|
| 1 | Click the `AppShell` header "Dark mode" button on any page | Whole app (top bar, sidebar-adjacent chrome, page content, cards) switches to dark palette immediately |
| 2 | Reload after toggling dark | Dark mode persists |
| 3 | Toggle dark via the header, then open Settings → Appearance | Theme radio shows "Dark" selected — same shared state, not two disconnected toggles |
| 4 | Toggle "Light"/"Dark"/"System" from Settings → Appearance | Applies immediately app-wide, no Save click needed |
| 5 | Dashboard in dark mode | Header greeting card and the 4 KPI cards render with dark surfaces and legible text — no stray white cards |
| 6 | Settings page in dark mode | "Settings" `h4` heading and its subtitle are legible, not near-invisible dark-grey-on-dark |
| 7 | `theme/theme.js` | Deleted; no remaining import anywhere in `frontend/src` |
| 8 | `npx eslint` on every touched file | 0 new errors |
| 9 | `npx jest src/pages/settings/index.test.jsx` in isolation | 9/9 pass |
| 10 | `npm run build` | Succeeds |
