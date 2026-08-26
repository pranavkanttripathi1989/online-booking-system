# requirements

| Feature | Requirement | Improvement | Bug | Open | Done | Most recent | Link |
|---|---|---|---|---|---|---|---|
| clinician-dashboard | 0 | 0 | 1 | 0 | 1 | 2026-08-25 | [clinician-dashboard](./clinician-dashboard/README.md) |
| insurance-claims | 1 | 3 | 0 | 1 | 3 | 2026-08-26 | [insurance-claims](./insurance-claims/README.md) |
| clinical-records | 1 | 2 | 0 | 1 | 2 | 2026-08-26 | [clinical-records](./clinical-records/README.md) |
| scheduling-engine | 1 | 1 | 0 | 1 | 1 | 2026-08-26 | [scheduling-engine](./scheduling-engine/README.md) |
| pharmacy | 1 | 2 | 0 | 1 | 2 | 2026-08-25 | [pharmacy](./pharmacy/README.md) |
| prescriptions | 1 | 1 | 0 | 1 | 1 | 2026-08-26 | [prescriptions](./prescriptions/README.md) |
| queue-management | 1 | 3 | 0 | 1 | 3 | 2026-08-26 | [queue-management](./queue-management/README.md) |
| appointments | 1 | 3 | 5 | 2 | 7 | 2026-08-26 | [appointments](./appointments/README.md) |
| organizations | 2 | 4 | 0 | 1 | 5 | 2026-08-26 | [organizations](./organizations/README.md) |
| catalog-master-data | 2 | 4 | 0 | 1 | 5 | 2026-08-26 | [catalog-master-data](./catalog-master-data/README.md) |
| abdm-interop | 1 | 0 | 0 | 1 | 0 | 2026-08-22 | [abdm-interop](./abdm-interop/README.md) |
| compliance-dpdp | 1 | 2 | 0 | 1 | 2 | 2026-08-26 | [compliance-dpdp](./compliance-dpdp/README.md) |
| telemedicine | 1 | 0 | 0 | 1 | 0 | 2026-08-22 | [telemedicine](./telemedicine/README.md) |
| patient-portal | 1 | 2 | 0 | 1 | 2 | 2026-08-26 | [patient-portal](./patient-portal/README.md) |
| messaging | 2 | 5 | 0 | 1 | 6 | 2026-08-26 | [messaging](./messaging/README.md) |
| analytics-reporting | 1 | 0 | 0 | 1 | 0 | 2026-08-24 | [analytics-reporting](./analytics-reporting/README.md) |
| platform-integrations | 1 | 3 | 0 | 1 | 3 | 2026-08-26 | [platform-integrations](./platform-integrations/README.md) |
| subscription-plan-engine | 1 | 0 | 0 | 1 | 0 | 2026-08-24 | [subscription-plan-engine](./subscription-plan-engine/README.md) |
| platform-billing | 1 | 0 | 0 | 1 | 0 | 2026-08-22 | [platform-billing](./platform-billing/README.md) |
| platform-nfr | 1 | 4 | 11 | 1 | 15 | 2026-08-23 | [platform-nfr](./platform-nfr/README.md) |
| security | 4 | 3 | 6 | 2 | 11 | 2026-08-26 | [security](./security/README.md) |
| notifications | 3 | 1 | 0 | 1 | 3 | 2026-08-25 | [notifications](./notifications/README.md) |
| patient-payments | 3 | 3 | 0 | 1 | 5 | 2026-08-26 | [patient-payments](./patient-payments/README.md) |
| communications-policies | 1 | 2 | 0 | 0 | 3 | 2026-08-22 | [communications-policies](./communications-policies/README.md) |
| test-coverage-audit | 1 | 1 | 0 | 0 | 2 | 2026-08-26 | [test-coverage-audit](./test-coverage-audit/README.md) |
| dashboard | 1 | 0 | 0 | 0 | 1 | 2026-08-21 | [dashboard](./dashboard/README.md) |
| organization-branding | 1 | 1 | 0 | 0 | 2 | 2026-08-26 | [organization-branding](./organization-branding/README.md) |
| products | 0 | 0 | 1 | 0 | 1 | 2026-08-21 | [products](./products/README.md) |
| settings | 1 | 0 | 0 | 0 | 1 | 2026-08-21 | [settings](./settings/README.md) |
| staff | 0 | 1 | 0 | 0 | 1 | 2026-08-21 | [staff](./staff/README.md) |
| semble-competitive-gap | 1 | 0 | 0 | 1 | 0 | 2026-08-17 | [semble-competitive-gap](./semble-competitive-gap/README.md) |
| patients | 0 | 0 | 2 | 0 | 2 | 2026-08-26 | [patients](./patients/README.md) |
| test-results | 0 | 0 | 1 | 0 | 1 | 2026-08-26 | [test-results](./test-results/README.md) |
| repo-hygiene | 0 | 2 | 0 | 0 | 2 | 2026-08-26 | [repo-hygiene](./repo-hygiene/README.md) |
| frontend-platform | 0 | 2 | 0 | 0 | 2 | 2026-08-26 | [frontend-platform](./frontend-platform/README.md) |

## PRD-derived requirements (2026-08-22)

The 22 `draft`-status requirements above (`REQ014`–`REQ035`, 19 new feature slugs plus extensions to `security`, `patient-payments`, and `notifications`) were derived from a full read of `PRD-Healthcare-Booking-SaaS-India.md` ("CareOS") against the current codebase. Each document includes a current-state-vs-PRD gap analysis, a phase assignment (PRD Phase 1/MVP, Phase 2/V1 GA, Phase 3/V2), user stories with Given/When/Then acceptance criteria traced back to the PRD's own `FR-*` IDs, and data-model impact.

These are genuinely new product scope, not a rewrite of what's already built — see `project-plans/07-prd-gap-analysis-and-roadmap.md` for the consolidated cross-feature phase roadmap, sequencing rationale, and how this new scope relates to the pre-existing engineering-hardening work in `project-plans/01`–`06`. **`project-plans` P0 (tenant-isolation and database-index fixes) is a hard prerequisite for this entire set** — `REQ035` (Platform NFRs) makes that dependency an explicit, standing constraint on every other requirement here, not an informal recommendation.
