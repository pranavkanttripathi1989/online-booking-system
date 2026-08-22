---
id: PLAN033
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG012
related: [BUG007, TP060, TR059]
---

# PLAN033 — Close the tenancy matrix's 10 KNOWN_GAPS domains

Approved via plan mode before implementation. Two corrections were made
during implementation itself (see `BUG012`'s "plan correction found during
implementation" section) — `org-settings` and `notifications` moved from
"real CASES entry" to "EXEMPT" after tracing the matrix runner's actual
per-actor assertion logic found neither fits its generic shape. This document
records the plan as executed, not as originally drafted.

## Per-domain outcome

| Domain | Outcome | allowedRoles | Fixture change |
|---|---|---|---|
| `reviews` | CASES entry | admin, super_admin, manager | New `Reviews` rows, org A/B |
| `cancellation-rules` | CASES entry | admin, super_admin, manager | New `ProductCancellationRules` rows (clinic-scoped, not product-scoped — see below) |
| `availability` | CASES entry + **real fix**: `availabilities` gated | admin, super_admin, manager, staff | New `ClinicianAvailability` rows |
| `analytics` | CASES entry via `getClinics` | manager, admin, super_admin | none — reuses `clinicA`/`B` |
| `blocks` | CASES entry + **real fix**: `spacerBlocks`/`roomBlocks` gated, `getSpacerBlocks` gated + self/org-scoped | admin, super_admin, manager (clinician for `getSpacerBlocks`) | New `SpacerBlocks` rows |
| `dashboard` | CASES entry via `dashboard.upcoming_appointments` | admin, super_admin, staff (no manager) | none — reuses `appointmentA`/`B` |
| `services` | CASES entry via `services` | all 6 roles | none — reuses `productA`/`B` |
| `organizations` | **EXEMPT** | — | — |
| `org-settings` | **EXEMPT** (plan correction) | — | — |
| `notifications` | **EXEMPT** (plan correction) | — | — |

## Steps taken

1. **Verified real frontend callers before gating** (Hard Rule 7): grepped
   `frontend/src/graphql/*.js` and inline `gql` usage for `availabilities`,
   `spacerBlocks`, `roomBlocks`, `getSpacerBlocks`. Found `calendar/index.jsx`
   (nav-listed for `staff`, no route-level `RoleGuard`) calls `availabilities`,
   which is why `staff` is in that gate despite the sibling mutations only
   allowing `manager`/`admin`/`super_admin`. Found `clinician/Dashboard.jsx`
   calls `getSpacerBlocks` self-service, which is why `clinician` is in that
   gate.
2. **Extended `fixture.ts`** with new org-A/org-B rows for `Reviews`,
   `ProductCancellationRules`, `ClinicianAvailability`, `SpacerBlocks`,
   following the file's existing `IDS`/`createMany`-per-table pattern. Hit one
   real schema constraint doing this: `ProductCancellationRules_scope_check`
   forbids setting `product_id` and `clinic_id` together — the fixture rows
   are clinic-scoped only, not product-scoped.
3. **Added the three `@Auth()`/scoping fixes** in `availability.resolver.ts`,
   `blocks.resolver.ts`, and `blocks.service.ts`, each with unit coverage
   (new `blocks.resolver.spec.ts`; extended `blocks.service.spec.ts`;
   corrected — not just extended — `availability.resolver.spec.ts`, which
   had a test asserting the ungated state as intentional).
4. **Added 7 `DomainCase` entries** to `domain-cases.ts` (not 9, per the
   `org-settings`/`notifications` correction).
5. **Added `organizations`, `org-settings`, and `notifications` to `EXEMPT`**
   in `matrix-coverage.int-spec.ts`, each with its own stated reason;
   `KNOWN_GAPS` is now an empty array.
6. **Live-verified** the three fixes against the real running stack with real
   JWTs (not just jest mocks) before considering the slice done — see `TR059`.

## Verification plan

See `TP060`.
