---
id: TP166
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN142
related: [REQ102]
---

# TP166 — Test plan: non-clinician staff department membership

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
a well-scoped extension of an already-proven auto-participant-add
pattern.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `staff.service.ts` create — valid `departmentId` | Validated via `DepartmentsService`, persisted as `department_id_ref` |
| 2 | `staff.service.ts` create — cross-org `departmentId` | Rejected |
| 3 | `messages.service.ts` — staff with `department_id_ref` set, zero clinicians in department | Included as a thread participant (the pre-existing early-return this slice removed) |
| 4 | `messages.service.ts` — a profile reachable via both the clinician and staff paths | Added as a participant exactly once, not duplicated |
| 5 | Existing "auto-adds every department member" test | Still passes unchanged (regression guard) |
| 6 | Existing "auto-adds every clinic member" (no-department) test | Still passes unchanged |
