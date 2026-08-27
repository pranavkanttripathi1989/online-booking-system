---
id: REQ147
type: improvement
feature: subscription-plan-engine
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ032
related: [REQ032, PLAN066]
---

# REQ147 — Entitlement guard (US-PLAN-03)

## Source

`project-plans/phase-plans/01-phase1-close-the-gates.md` slice **P1-04**,
closing `REQ032`'s own `US-PLAN-03` — the one piece of the plan-builder
requirement deliberately left unstarted, per `CLAUDE.md`'s own standing
caution: *"do not start with the entitlement guard itself — start with
the plan-builder data model and versioning... and treat the guard's
integration into the shared chain as its own reviewed step."*

## What shipped, in the order the caution asked for

1. **The entitlement data model** — `ClientOrganizations.plan_id`
   (nullable, no real org has one assigned yet), a real FK to `Plans`.
   Distinct from the older `OrganizationSubscriptions`/`SubscriptionPlans`
   pair (self-serve-onboarding billing, already read-back by an earlier
   slice) — this links to the newer, versioned `Plans`/`PlanVersions`
   catalog (`REQ032`) that actually carries `feature_flags_json`/
   `quotas_json`, the real entitlement source.
2. **The read path** — `EntitlementsService` (`resolveEntitlements`/
   `hasFeature`/`getQuota`), Redis-cached per org (5-minute TTL as a
   safety net) with **explicit invalidation**, not just TTL expiry: on a
   direct org→plan assignment change, and on any edit to a plan's own
   catalog data (a new version, or `is_active` toggled) — the latter
   invalidates every org currently on that plan, not just one.
3. **The guard, integrated as its own reviewed step, opt-in per
   resolver** — `EntitlementGuard` + `@RequiresFeature('key')`,
   deliberately **not** registered in `app.module.ts`'s global
   `APP_GUARD` array (unlike `RolesGuard`/`PermissionsGuard`). It only
   ever runs where a resolver explicitly attaches
   `@UseGuards(EntitlementGuard)` — by construction, this change cannot
   over- or under-gate any resolver it wasn't deliberately attached to,
   which is exactly the risk the standing caution named.

## Two concrete, live-verified proofs of concept — not a blanket rollout

Matching the schema's own `PlanVersions.feature_flags_json`/`quotas_json`
comments verbatim (they already named `pharmacy` and
`max_clinician_seats` as examples, written when `REQ032` first shipped):

- **Feature flag**: `pharmacy.receiveStock` gated behind
  `@RequiresFeature('pharmacy')`. An org with no plan (every real org
  today) stays fully unrestricted; an org on a plan whose current
  version sets `pharmacy: false` is blocked with a clear
  `ForbiddenException` naming the feature.
- **Quota**: `clinicians.create` checks `max_clinician_seats` against
  the target clinic's org's current clinician count before allowing a
  new one, when a quota is actually configured for that org.

Every other resolver in the application — including every other
pharmacy mutation and every other write path — is completely unaffected.
Extending coverage to more modules remains a deliberate, incremental,
per-module decision, not something this slice attempts to finish.

## Frontend

- **Admin**: `admin/Organizations.jsx` gained a plan-assignment dialog
  (a new icon button per org row) — assigns or clears
  `ClientOrganizations.plan_id` via the new `assignOrgPlan` mutation,
  admin/super_admin-gated matching this resolver's existing convention.
- **Manager**: `manager/pharmacy/index.jsx`'s "Receive Stock" button is
  **replaced**, not disabled, by an upgrade prompt (`UI-11`: never a
  dead button with no explanation; `SURF-20`'s spirit adapted for a
  paywall — a real call-to-action explaining why and how to upgrade,
  not simply absent, since hiding a paywalled feature entirely would
  prevent an org from ever discovering it exists to upgrade into) when
  `myEntitlements` reports `pharmacy: false`.
- **Clinician-quota UI**: deliberately not built as a separate
  proactive "X of Y seats used" widget — logged as an explicit,
  reasoned scope cut, not an oversight. The backend's own clear
  `ForbiddenException` message already reaches the user via
  `CreateClinicianPage.jsx`'s existing generic mutation error handling
  (`enqueueSnackbar(err.message, ...)`), which was confirmed to work
  end-to-end for this exact message live. A dedicated pre-emptive usage
  display is real, valuable future work, not required for this slice's
  own "a blocked user is told why" exit criterion.

## Live verification (not just unit tests)

Performed against the real dev stack, on a real org with 27 real
clinicians and zero plan assigned:

1. Created a real `Plan` + `PlanVersion` (`pharmacy: false`,
   `max_clinician_seats: 1`) via `createPlan`.
2. Assigned it to the real org via `assignOrgPlan` — confirmed
   `myEntitlements` flipped from `is_gated: false` to `true` for a real
   `manager` session, **with no manual cache-clear needed** (the
   explicit invalidation on assignment worked instantly).
3. `receiveStock` — confirmed blocked with the real
   `EntitlementGuard`-produced error, before the mutation ever reached
   the service layer (the fake clinic/drug ids passed never surfaced
   their own "not found" errors — the guard rejected first).
4. `createClinician` — confirmed blocked with the real quota message,
   correctly reporting the actual current count (27) against the
   configured limit (1).
5. Cleared the assignment (`assignOrgPlan(planId: null)`) — confirmed
   `myEntitlements` returned to `is_gated: false` instantly, proving
   invalidation works in both directions.
6. Cleanup: the test plan deactivated (no `deletePlan` mutation
   exists), the temporarily-promoted `super_admin` test account (this
   dev DB has no seeded `super_admin` account at all — `createPlan`
   requires one) reverted back to `admin`.

## Deliberately out of scope

- Rolling `EntitlementGuard`/`@RequiresFeature` out to any other
  module — each is its own, separately-reviewed decision from here,
  matching this slice's whole point.
- `US-PLAN-04` (trials) — no phase-plan slice currently scopes it.
- A dedicated, proactive usage-vs-quota display component — see above.
- A super_admin seed account for this dev environment — the live
  verification above worked around its absence by temporarily
  reassigning an existing account's role and reverting it; a real seed
  account is a separate, small follow-up if `createPlan`/`setPlanActive`
  need regular hands-on testing going forward.

## Exit criteria (from the phase-plan slice)

- [x] A tier limit actually blocks — both the feature-flag and quota
  mechanisms, live-verified against the real stack.
- [x] A blocked user is told why and how to upgrade — the
  `ForbiddenException` messages name the specific feature/limit; the
  pharmacy page's own upgrade prompt names the concrete next step
  ("ask your organization admin to upgrade").
