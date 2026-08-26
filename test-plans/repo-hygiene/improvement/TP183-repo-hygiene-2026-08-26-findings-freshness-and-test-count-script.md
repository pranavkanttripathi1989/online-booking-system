---
id: TP183
type: improvement
feature: repo-hygiene
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN163
related: []
---

# TP183 — Test plan: findings freshness + test-count script

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | F-10 status accurate | Read `audit-log.interceptor.ts` + `AuditLogs` model | Every claim in the new status line matches real code |
| 2 | F-17 status accurate | Read `AppointmentPayments` model | GST fields present as claimed |
| 3 | F-20 status accurate | Grep all three named files | Every `<Table>` nested inside `<TableContainer>` |
| 4 | F-32 status accurate | Read `REQ103`'s own doc + `jest.config.js` | `isolatedModules: true` present, `CLAUDE.md` callout present |
| 5 | Script measures backend unit | `node scripts/test-count-status.mjs` | Prints a dated, accurate suite/test count matching a direct `npx jest` run |
| 6 | Script measures integration with the flag | `node scripts/test-count-status.mjs --integration` | Prints an accurate count matching a direct `npm run test:int` run |
| 7 | Script degrades honestly without the flag | `node scripts/test-count-status.mjs` (no flag) | States integration was skipped and how to include it, not silently omitted |
| 8 | CLAUDE.md pointers replace stale numbers | Read the two touched command lines | No hand-typed suite/test count remains on either line |
