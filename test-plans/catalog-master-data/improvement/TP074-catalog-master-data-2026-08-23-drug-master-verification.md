---
id: TP074
type: improvement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ044
related: [PLAN047, TR073]
---

# TP074 — Verification for the drug master reference table

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `findAll()` for a normal org caller | `where.OR = [{client_org_id:null},{client_org_id:<theirs>}]` |
| TC-02 | `findAll()` for a platform operator | No `OR` filter — sees everything |
| TC-03 | A platform-seeded row and an org row both returned | Each correctly marked `is_platform_seeded` |
| TC-04 | `findOne()` on a platform-seeded row, any org caller | Visible |
| TC-05 | `findOne()` on the caller's own org's custom row | Visible |
| TC-06 | `findOne()` on another org's custom row | `NotFoundException`, never confirms existence |
| TC-07 | `create()` by a normal org caller | Stamped with their own `client_org_id` |
| TC-08 | `create()` by a platform operator | `client_org_id` omitted (writes NULL — platform-seeded) |
| TC-09 | `update()` by a normal caller on their own custom row | Succeeds |
| TC-10 | `update()` by a normal caller on a platform-seeded row | `ForbiddenException`, no write attempted |
| TC-11 | `update()` by a platform operator on a platform-seeded row | Succeeds |
| TC-12 | `remove()` by a normal caller on another org's row | `NotFoundException` |
| TC-13 | `remove()` | Soft-delete (`is_deleted: true`), not a hard delete |
| TC-14 | Full backend suite + `tsc --noEmit` + `eslint` | Clean |
| TC-15 | `npx prisma db seed` re-run against the already-seeded dev database | Creates exactly the 6 new drugs, skips every other block |
| TC-16 | Live: manager account queries `drugs` | All 6 platform-seeded drugs visible |
| TC-17 | Live: manager creates a custom drug, then attempts to edit a platform-seeded one | Create succeeds; edit rejected with `Cannot modify a platform-seeded drug` |
| TC-18 | Live: platform admin queries `drugs` after the manager's custom-drug create | Sees the manager's custom drug too (platform operators see everything) |

## How this was checked

TC-01–13 via Jest unit tests in `drugs.service.spec.ts` against a mocked
`PrismaService`. TC-14 via the backend container's own `npx jest
--maxWorkers=2`, `npx tsc --noEmit`, `npx eslint`. TC-15–18 live, against
the real dev database and a real running backend — real GraphQL mutations
via `curl` with real login tokens for `manager@medibook.dev` and
`admin@medibook.dev`, and a direct `psql` inspection/cleanup of the test
row created during TC-17/18.
