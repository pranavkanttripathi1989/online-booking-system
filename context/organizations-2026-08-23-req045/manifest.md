---
id: CTX-organizations-2026-08-23-req045
type: requirement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ045
related: [REQ014, REQ041, PLAN048, TP075, TR074]
---

# organizations — REQ045, onboarding wizard real backend (2026-08-23)

Second vertical slice of `REQ014`, after `REQ041` (head-office
designation). Wires the pre-existing `/get-started` self-serve signup
wizard — mock-only since the mock-data era — onto a new
`organization-onboarding` backend module, using schema columns
(`ClientOrganizations.owner_user_id`/`onboarding_status`/`onboarding_step`/
`trial_ends_at`, `SubscriptionPlans`, `OrganizationSubscriptions`) that had
been live since Phase 3.5 planning but never had a resolver.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ045 | [onboarding wizard, real backend](../../requirements/organizations/requirement/REQ045-organizations-2026-08-23-onboarding-wizard-real-backend.md) |
| implementation-plans | PLAN048 | [implementation](../../implementation-plans/organizations/requirement/PLAN048-organizations-2026-08-23-onboarding-wizard-real-backend.md) |
| test-plans | TP075 | [test plan](../../test-plans/organizations/requirement/TP075-organizations-2026-08-23-onboarding-wizard-real-backend.md) |
| test-results | TR074 | [results](../../test-results/organizations/requirement/TR074-organizations-2026-08-23-onboarding-wizard-real-backend.md) |
| test-suggestions | — | skipped — a well-scoped slice against an already-proven pattern (matches `REQ041`/`PLAN044`-`PLAN047`'s transaction+resolver shape) |

## What this closes

`REQ014`'s US-ORG-02 (the onboarding wizard). Combined with `REQ041`,
two of `REQ014`'s user stories now have a real backend; Departments/
Resources, CSV import, and team-invite remain unbuilt, larger scope.

## Notable verification gap — read before trusting this end to end

The unit suite (10/10, `TR074`) exercises every branch of the transaction
and validation logic with a mocked Prisma client. A live run of the full
four-mutation wizard sequence against a real, migrated `postgres_test`
database was **not** completed this session — the host was running roughly
16 unrelated Docker containers under heavy concurrent load, and every shell/
docker command took 30s-2min even for trivial reads. This is logged as a
deferred follow-up in `TR074`, not silently skipped. Run it before treating
`REQ045` as proven wire-to-wire.
