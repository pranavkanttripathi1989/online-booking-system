---
id: TR073
type: improvement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP074
related: [PLAN047, REQ044]
---

# TR073 — Results: drug master reference table

All 18 cases in `TP074` pass.

- Unit: 13 new tests in `drugs.service.spec.ts` (new file). Full backend
  suite: **732/732 tests, 56 suites** (up from 719/55 before this slice).
  `tsc --noEmit`/`eslint` clean.
- `npx prisma db seed` re-run against the real, already-seeded dev
  database: created exactly `Paracetamol, Amoxicillin, Metformin,
  Amlodipine, Cetirizine, Azithromycin`, and every other seed block
  (roles, demo accounts, email templates) correctly logged `skip
  (exists)` — confirmed the seed script's idempotency holds with this
  addition.
- Live, against the real running backend:
  - `manager@medibook.dev` queried `drugs` → all 6 platform-seeded rows
    returned, each `is_platform_seeded: true`.
  - Same account created a real custom drug (`Custom Org Drug E2E`) →
    `is_platform_seeded: false`, correctly org-scoped.
  - Same account attempted `updateDrug` on a platform-seeded row →
    rejected: `{"message":"Cannot modify a platform-seeded drug",
    "extensions":{"code":"FORBIDDEN"}}`.
  - `admin@medibook.dev` (platform operator) queried `drugs` → the
    manager's custom drug was visible (platform operators see every
    tenant's rows, matching every other domain's convention).
  - Test row deleted via `psql` afterward.

## What this does not close

- Packages, per-category pricing, tax depth — other pieces of `REQ016`,
  not attempted.
- No frontend page — deliberate scope decision recorded in `REQ044`
  (no existing consumer needs a drug picker; `pharmacy`/`prescriptions`
  are themselves still unbuilt).
