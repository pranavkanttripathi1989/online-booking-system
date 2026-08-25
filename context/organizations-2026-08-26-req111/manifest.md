---
id: CTX-organizations-2026-08-26-req111
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ111
related: [PLAN151, TP162, TR162]
---

# organizations — REQ111: branch-override admin UI (2026-08-26)

Slice 3 of the reconciled 14-slice batch (`project-plans/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ111 | [branch-override admin UI](../../requirements/organizations/improvement/REQ111-organizations-2026-08-26-branch-override-admin-ui.md) |
| implementation-plans | PLAN151 | [implementation plan](../../implementation-plans/organizations/improvement/PLAN151-organizations-2026-08-26-branch-override-admin-ui.md) |
| test-plans | TP162 | [verification plan](../../test-plans/organizations/improvement/TP162-organizations-2026-08-26-branch-override-admin-ui.md) |
| test-results | TR162 | [verification results — pass, 4/4](../../test-results/organizations/improvement/TR162-organizations-2026-08-26-branch-override-admin-ui.md) |

## What shipped

`REQ055` shipped the full branch-override backend but no admin UI. This
slice adds: one new `ServiceType.clinic_id` GraphQL field exposure (no
service-layer change — the value already flows through `toGraphQL()`'s
spread), and a new "Branch pricing" icon button + dialog on
`manager/services/index.jsx`, disabled for a clinic-scoped (non-master)
service with an explanatory tooltip, listing every branch with its
current stance (Inherit/Override/Skip) and a flat-price field for
Override, with client-side validation mirroring the backend's own
rejection rule.

## Verification

New `manager/services/index.test.jsx` (this page had no prior unit
coverage) — 4/4 passing. `tsc --noEmit` clean.
