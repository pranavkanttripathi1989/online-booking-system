---
id: TR075
type: requirement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP076
related: [REQ046, PLAN049]
---

# TR075 — Results: tax depth (HSN, GST exemption)

Executed 2026-08-23 in the same isolated worktree as `TR074`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `defaults is_tax_exempt to false when not supplied` |
| TC-02 | pass | `honours an explicit is_tax_exempt: true override` |
| TC-03 | pass | `defaults is_tax_exempt to true when not supplied` |
| TC-04 | pass | `honours an explicit is_tax_exempt: false override` |
| TC-05 | pass | Full suite: Test Suites: 3 passed, Tests: 65 passed, 65 total (`products.service.spec.ts`, `services.service.spec.ts`, `services.resolver.spec.ts`) |
| TC-06 | pass | `npx prisma validate` — "The schema ... is valid" |
| TC-07 | pass | `npx prisma migrate deploy` against `postgres_test` (port 5433) — applied cleanly, alongside two other pending migrations from prior sessions that had not yet reached that database (`clinics_one_primary_per_org`, `drugs`) |
| TC-08 | pass | `npx tsc --noEmit` — 0 new errors (2 pre-existing unrelated errors remain, same as `TR074`) |
| TC-09 | pass | `npx eslint src/products src/services` — 0 errors, 0 warnings |
| TC-10 | pass | Covered by TC-05 |

## Notes

- `postgres_test` is now current through migration
  `20260823060000_products_tax_depth` inclusive — a useful side effect for
  whoever next runs `npm run test:int` on this host.
- No live GraphQL-level verification (no frontend consumer exists for
  these two fields yet, per `REQ046`'s "what this does not do" — nothing
  to drive end-to-end beyond what the unit suite already proves against
  real Prisma-generated types).
