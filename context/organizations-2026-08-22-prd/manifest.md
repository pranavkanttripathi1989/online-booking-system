---
feature: organizations
date: 2026-08-22
ids: [REQ014]
status: in-progress
---

# organizations — 2026-08-22 (PRD-derived, multi-branch hierarchy)

Derived from the CareOS PRD's M1 (Tenant Onboarding & Organization Management) against the existing `organizations`/`clinics`/`rooms` modules. Real gaps: no `Department`/`Resource` entities, the onboarding wizard is still 100% mock-store-backed despite `ClientOrganizations` already having the columns to back a real one, and there is no self-serve trial signup or data-import tooling.

Distinct from `organizations-2026-08-22` (same date, same feature slug, different scope) — that bundle closed `REQ013` Phase B (organizations and public documentation gaps in the test-coverage audit); this bundle is new PRD-derived product scope and uses a disambiguating directory suffix to avoid colliding with it.

This is a requirement-only bundle — no implementation plan, test plan, or test result exists yet.

## Requirement

- [REQ014 — Multi-branch org hierarchy, onboarding wizard, and data migration](../../requirements/organizations/requirement/REQ014-organizations-2026-08-22-multi-branch-hierarchy-and-onboarding.md) — draft

## Related

- [organizations-2026-08-22 bundle](../organizations-2026-08-22/manifest.md) — the unrelated, already-done REQ013 Phase B bundle for this same feature slug and date.
- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — the consolidated cross-feature phase roadmap this requirement is one part of.
