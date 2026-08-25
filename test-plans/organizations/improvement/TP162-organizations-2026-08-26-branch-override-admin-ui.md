---
id: TP162
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN151
related: [REQ111]
---

# TP162 — Test plan: branch-override admin UI

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
frontend-only slice against an already-proven, already-tested backend
(`REQ055`). Going straight to this approved test plan.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | Org-level master service (`clinic_id: null`) | "Branch pricing" button enabled |
| 2 | Clinic-scoped service (`clinic_id` set) | "Branch pricing" button disabled, with an explanatory tooltip |
| 3 | Dialog opened against an existing override row | Seeded with the real persisted mode + price, not defaulted to Inherit |
| 4 | Setting a row to Override with no price, then Save | Client-side validation error shown; `setProductBranchOverride` NOT called |
| 5 (backend) | `ServiceType.clinic_id` field | Present on the GraphQL type, matches the underlying `Products.clinic_id` value exactly (no service-layer change needed — `toGraphQL()`'s spread already passes it through) |
