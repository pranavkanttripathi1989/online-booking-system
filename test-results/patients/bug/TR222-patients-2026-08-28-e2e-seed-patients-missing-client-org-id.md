---
id: TR222
type: bug
feature: patients
created: 2026-08-28
updated: 2026-08-28
status: pass
parent: TP222
related: [BUG040, PLAN202]
---

# TR222 — Results for BUG040 (e2e seed patients missing `client_org_id`)

Executed 2026-08-28 against the isolated `--profile e2e` stack
(`medibook_backend_e2e`:4001, `medibook_frontend_e2e`:3101,
`medibook_postgres_e2e`), during a manual QA pass on real seeded data
per explicit user request.

## Results

| # | Case | Result |
|---|---|---|
| 1 | `npx tsc --noEmit` | Pass — clean |
| 2 | Fresh reseed | Pass — `[seed-e2e] done. clinicians: 5, patients: 200, appointments: 2000, payments: 264` |
| 3 | `/patients` as `manager@medibook.dev` | Pass — "200 patients", real rows (Anita Sharma, Riya Kumar, Kavya Rao, Aadhya Menon, ...) |
| 4 | `/appointments` | Pass — "1,060 upcoming appointments", 1–20 of 1060, real names throughout |
| 5 | `/manager/dashboard` | Pass — 200 total appointments (30D), ₹79,500 gross revenue, 121 active patients, non-zero everywhere |

All 5/5 pass. Before the fix, case 3 showed the `patients/index.jsx`
hardcoded mock fallback ("Alice Johnson" etc., 14 rows) instead of an
honest empty state against the real, then-`client_org_id: null` seeded
data — that separate frontend defect is logged as `BUG041`, not fixed by
this change.

No regression risk to the dev-facing `master` seed (`backend/prisma/
seed.ts`) or its own suites — `seed-e2e.ts` is used exclusively by the
isolated e2e Docker Compose profile.
