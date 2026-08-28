---
id: TR231
type: bug
feature: settings
created: 2026-08-28
updated: 2026-08-29
status: pass
parent: TP231
related: [BUG044, PLAN211]
---

# TR231 — Results for PLAN211

Executed 2026-08-29 against the real dev stack via Chrome DevTools MCP,
logged in as `admin@medibook.dev`.

| # | Case | Result |
|---|---|---|
| 1 | Real clinic data on the Clinic tab | Pass — "MG Road Clinic", `+919876543210`, `mgroad@medibook.dev`, `Asia/Kolkata`, "12 MG Road", Bengaluru, 560001; no Currency/Slot-Duration fields |
| 2 | Edit + Save persists | Pass — set phone to a test value, saved, confirmed via `psql` the row changed; reverted via the same real Save path (not a live `UPDATE` — blocked by the auto-mode classifier when attempted directly) |
| 3 | Tab hidden for non-managing role | Pass — new unit test confirms; not re-verified live for a second role this pass (unit coverage judged sufficient given the mechanism — a plain conditional render — carries no live-only risk) |
| 4 | Stale deep-link clamp | Pass — unit test |
| 5 | RTL toggle + persistence | Pass — `document.dir` flipped to `rtl` immediately, survived a full reload, reverted via the same Save path afterward |
| 6 | Theme radio | Pass — see `TR232`; folded into the larger `BUG047` fix, verified there |
| 7 | Unit suite | Pass — 9/9, including the 4 new BUG044 cases |
| 8 | Lint | Pass — 0 new errors (pre-existing i18n/hardcoded-color warnings only) |

8/8 pass. `BUG044` marked `done`.
