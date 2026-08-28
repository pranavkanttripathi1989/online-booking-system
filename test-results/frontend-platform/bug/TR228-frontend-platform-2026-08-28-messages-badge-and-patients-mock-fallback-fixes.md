---
id: TR228
type: bug
feature: frontend-platform
created: 2026-08-28
updated: 2026-08-28
status: pass
parent: TP228
related: [BUG041, BUG043, PLAN208]
---

# TR228 — Results for PLAN208

Executed 2026-08-28/29 against the real dev stack via Chrome DevTools
MCP.

| # | Case | Result |
|---|---|---|
| 1 | `/messages` sidebar badge | Pass — "Messages 1" (real), matching the one visible thread's own unread indicator |
| 2 | `/patients` real data | Pass — "137 patients", real rows |
| 3 | `/patients` no-match search | Pass — "0 patients", `No patients match "zzznonexistentpatientxyz"` |
| 4 | Lint | Pass — 0 new errors |

4/4 pass. `BUG041`, `BUG043` both marked `done`.
