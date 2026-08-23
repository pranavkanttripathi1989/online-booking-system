---
id: CTX-organizations-2026-08-23-req041
type: improvement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ041
related: [REQ014, PLAN046, TP073, TR072]
---

# organizations — REQ041, head-office branch designation (2026-08-23)

First vertical slice of `REQ014` (multi-branch org hierarchy). The
org→branch level of the PRD hierarchy already existed (`Clinics.client_org_id`);
this slice makes the pre-existing but dead `Clinics.is_primary` field
actually mean something, enforced at the database level.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ041 | [head-office branch designation](../../requirements/organizations/improvement/REQ041-organizations-2026-08-23-head-office-branch-designation.md) |
| implementation-plans | PLAN046 | [implementation](../../implementation-plans/organizations/improvement/PLAN046-organizations-2026-08-23-head-office-branch-designation.md) |
| test-plans | TP073 | [verification plan](../../test-plans/organizations/improvement/TP073-organizations-2026-08-23-head-office-branch-verification.md) |
| test-results | TR072 | [verification results](../../test-results/organizations/improvement/TR072-organizations-2026-08-23-head-office-branch-verification.md) |
| test-suggestions | — | skipped — a well-scoped slice against an already-proven pattern |

## What this closes

First slice of `REQ014`. `Departments`/`Resources`/onboarding-wizard
changes/service-master inheritance remain unbuilt.

## Notable verification

The partial unique index (`clinics_one_primary_per_org`) was proven live
against the real database — not just unit-tested — by attempting to bypass
the application layer entirely with a raw `UPDATE` statement while a
different clinic was already primary in the same org; Postgres rejected it.
