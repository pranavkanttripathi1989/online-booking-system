---
id: REQ110
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ054
related: [PLAN150, TP169, TR169]
---

# REQ110 — Package transfer between patients

## Why this slice

`REQ054` (multi-sitting service packages, US-CAT-01) shipped purchase and
redemption but deliberately deferred "partial-sitting packages, package
transfer/refund/renewal" as P1 scope. This slice builds ONLY package
**transfer**: a patient who purchased a multi-sitting package (e.g. "10
Physio Sessions") can transfer their remaining unused sittings to a
different patient in the same organization — a real, common front-desk
request (a parent buys a package, later wants to move the remaining
sittings to their child's own patient record).

Investigated the real `PatientPackages` model
(`backend/prisma/schema.prisma`) and the existing `redeemPackageSitting`
mutation (`backend/src/appointment-payments/appointment-payments.service.ts`)
before scoping this — `sittings_remaining` is a maintained running total
(decremented inside the same transaction as redemption, the established
`DrugBatches.quantity_remaining` pattern from `REQ022`), not computed on
read, so a transfer only needs to move ownership of the existing row, not
recompute anything.

**Found and folded in, not a new discovery for this doc alone**:
`PackagesService#patientPackages()`'s existing read query uses the banned
`user.client_org_id ? {...} : {}` tenant-scoping ternary (the F-01/BUG004
bug class — an org-less caller sees every org's patient packages). Fixing
this to use `isSameOrg`/`orgScope` conventions is included in this slice's
scope since it's the exact method being extended.

## User story

As front-desk/manager staff, when a patient asks to move their unused
package sittings to a family member's own patient record, I can transfer
the package so the new patient can redeem the remaining sittings and the
original patient no longer can.

## Acceptance criteria

- **Given** a patient package with `sittings_remaining > 0`, not expired,
  belonging to the caller's org, **when** staff transfers it to a second
  patient in the same org, **then** the package's `patient_id` changes to
  the new patient, the new patient can redeem remaining sittings, and the
  original patient can no longer see or redeem it.
- **Given** a patient package with `sittings_remaining === 0`, **when**
  transfer is attempted, **then** it is rejected — nothing left to
  transfer.
- **Given** an expired patient package, **when** transfer is attempted,
  **then** it is rejected.
- **Given** a target patient belonging to a different organization,
  **when** transfer is attempted, **then** it is rejected (cross-tenant
  IDOR, Hard Rule 6).
- **Given** a successful transfer, **then** an append-only
  `PackageTransferLog` row records who transferred it, from/to patient,
  and the sittings count at time of transfer (this codebase has no
  generic audit-log write for domain actions per `REQ056`'s own note —
  matching `StockMovements`' precedent instead).
- **Given** the existing `patientPackages()` read query, **when** called
  by an org-less caller, **then** it returns only that caller's own
  scope (platform operator: all; everyone else: fails closed) — not the
  banned ternary's "see everything" behavior.

## In scope

- `transferPackage` mutation.
- New `PackageTransferLog` table (append-only).
- Fixing `patientPackages()`'s tenant-scoping ternary.
- A "Transfer" action in the frontend wherever a patient's purchased
  packages are already visible to staff.

## Deliberately out of scope

- Partial-sitting packages (a separate, larger `REQ054` residue item).
- Package refund (money-handling, its own review).
- Package renewal (a purchase-flow variant, its own review).
- A transfer-count limit — no cap imposed; every transfer is logged, so
  abuse is auditable rather than blocked outright.
