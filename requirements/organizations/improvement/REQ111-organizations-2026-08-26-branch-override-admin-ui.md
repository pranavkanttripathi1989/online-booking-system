---
id: REQ111
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ055
related: [PLAN151, TP162, TR162]
---

# REQ111 — Admin UI for per-branch product price overrides

## Source

`REQ055` (org→branch masters cascade) shipped the full backend for
per-branch product overrides — `ProductBranchOverrides`, the
`productBranchOverrides`/`setProductBranchOverride` operations,
`resolveServicePrice()`'s 4th argument — but its own scope explicitly
deferred the admin UI: *"Admin UI; the `appointments.service.ts`
list-preview call site (N+1 risk, documented as a named follow-up)"*
were both named as deliberately not built. Today the only way to set a
branch override is a raw GraphQL mutation call — no manager or admin can
reach this feature through the app at all.

## User story

**As** a clinic manager with multiple branches, **I want** to see and
set a different price for a service at a specific branch (or mark it
"skip" so that branch never offers it) **so that** I don't have to ask
an engineer to run a mutation by hand every time a branch needs its own
pricing.

### Acceptance criteria

- **Given** an org-level master service (`clinic_id: null`) on
  `manager/services/index.jsx`, **when** a manager opens its new
  "Branch pricing" action, **then** they see every branch in their org
  with its current stance (Inherit / Override / Skip) and, for an
  Override row, its price.
- **Given** a service that is already clinic-scoped (created directly
  at one branch, not an org-level master), **when** a manager views its
  card, **then** the "Branch pricing" action is disabled with an
  explanation, matching the backend's own real rejection rule
  (`product.clinic_id != null` → "This service is not an org-level
  master and cannot be overridden per branch").
- **Given** a manager sets a branch to "Override" with no price
  entered, **when** they try to save, **then** the UI rejects it
  client-side with the same message the backend would give
  ("An override requires at least a price, category, or channel
  value"), not a raw GraphQL error.
- **Given** a save succeeds, **when** the dialog is reopened, **then**
  it reflects the real, persisted stance (not an optimistic local-only
  update).

## Scope

- A new "Branch pricing" `IconButton` per service `Card` on
  `manager/services/index.jsx`, opening a `Dialog` listing every branch
  in the caller's org (via the existing `CLINICS_QUERY`) with its
  current override stance for that service (via the existing
  `productBranchOverrides` query).
- Per-branch controls: a mode select (Inherit / Override / Skip) and,
  for Override, a flat price field. Saves call the existing
  `setProductBranchOverride` mutation, one call per changed row.
- Disabling the action entirely for a non-master service, matching the
  backend's real rule.

## Deliberately out of scope

- **Category/channel-level override editing** — the backend already
  supports `override_category_pricing`/`override_channel_pricing` on
  `SetProductBranchOverrideInput`, but building full parity UI for
  per-category/per-channel branch pricing (mirroring `REQ016`'s own
  category/channel pricing editor) is a larger, separate follow-up.
  This slice covers the flat-price override only.
- **The `appointments.service.ts` list-preview N+1** — `REQ055`'s own
  named follow-up, unrelated to this UI and not touched here.
- Bulk/multi-branch editing in one action (e.g. "set this price at all
  branches") — out of scope, one branch at a time only.
