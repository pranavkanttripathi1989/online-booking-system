---
id: TP231
type: bug
feature: settings
created: 2026-08-28
updated: 2026-08-29
status: approved
parent: PLAN211
related: [BUG044]
---

# TP231 — Test plan for PLAN211

| # | Case | Expected |
|---|---|---|
| 1 | `manager@medibook.dev` opens Settings → Clinic | Real clinic name/phone/email/address/city/PIN/timezone — no hardcoded placeholder text, no Currency field, no Default Slot Duration field |
| 2 | Edit a Clinic field, Save | Real mutation fires; success only shown after it resolves; DB reflects the change |
| 3 | `patient@medibook.dev` / `clinician@medibook.dev` opens Settings | No "Clinic" tab in the tab strip at all |
| 4 | Navigate to Settings with a stale `state:{tab:4}` as a non-managing role | Lands on Profile (tab 0), no crash, no invalid `Tabs` value warning |
| 5 | Settings → Appearance, toggle RTL, Save | `document.dir` flips live; `localStorage['medibook_appearance_prefs']` contains the change; reload keeps it |
| 6 | Settings → Appearance → Theme radio | Applies immediately (no Save needed); persists across reload; drives the same theme as the `AppShell` header toggle (see `TP232`) |
| 7 | Unit suite | `settings/index.test.jsx` 9/9 pass |
| 8 | `npx eslint` on `settings/index.jsx` | 0 new errors |
