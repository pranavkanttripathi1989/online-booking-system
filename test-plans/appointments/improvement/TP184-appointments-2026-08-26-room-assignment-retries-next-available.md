---
id: TP184
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN164
related: []
---

# TP184 — Test plan: room assignment retries the next available room

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | First room assigned when free | 2 active rooms, room-1 free | `room_id: 'room-1'` |
| 2 | Retries next room when first busy | room-1 busy, room-2 free | `room_id: 'room-2'`, booking succeeds |
| 3 | Rejects with a specific message when every room is busy | room-1 and room-2 both busy | `'No room is free at this time'` |
| 4 | Rejects with the original message when no active rooms exist | `rooms.findMany` returns `[]` | `'No active room available at this clinic'` |
| 5 | Session/hybrid mode unaffected | Existing `create — session/hybrid mode` suite | All 6 pre-existing cases still pass unchanged |
| 6 | Full suite regression | Backend unit + integration | 92/92 / 1474/1474; integration 4/4 / 387/387 unchanged |
| 7 | Lint/typecheck clean | `eslint src/appointments`, `tsc --noEmit` | 0 errors |
