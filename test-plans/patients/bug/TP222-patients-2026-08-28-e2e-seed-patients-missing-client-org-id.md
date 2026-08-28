---
id: TP222
type: bug
feature: patients
created: 2026-08-28
updated: 2026-08-28
status: approved
parent: PLAN202
related: [BUG040]
---

# TP222 — Test plan for BUG040 (e2e seed patients missing `client_org_id`)

This is a fixture-only fix (no service/resolver code changed — the
scoping logic itself was already correct and already tested by `TP128`).
Verification is live, against the real reseeded e2e stack, not a new
unit spec.

| # | Case | Expected |
|---|---|---|
| 1 | `npx tsc --noEmit` against `backend/` | Clean |
| 2 | Fresh reseed (`postgres_e2e` tmpfs cleared, `backend_e2e` restarted) | `[seed-e2e] done.` with `patients: 200` logged, no errors |
| 3 | Log in as `manager@medibook.dev`, open `/patients` | "200 patients", real seeded rows rendered — not the hardcoded `MOCK_PATIENTS` fallback |
| 4 | Same session, open `/appointments` | "1,060 upcoming appointments" (1–20 of 1060 total), real patient + clinician names per row |
| 5 | Same session, open `/manager/dashboard` | Analytics Overview shows non-zero: 200 total appointments (30D), ₹79,500 gross revenue, 121 active patients, populated trend chart |

## Full-suite gate (Hard Rule 3)

Not applicable — no backend/frontend source changed, only a seed
fixture used exclusively by the isolated `--profile e2e` stack. Confirmed
`npx tsc --noEmit` clean; the dev-facing `npm test`/`npm run test:int`
suites do not exercise `seed-e2e.ts` at all.
