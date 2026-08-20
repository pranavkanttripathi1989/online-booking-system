---
id: TR038
type: requirement
feature: communications-policies
created: 2026-08-20
updated: 2026-08-20
status: passed
parent: REQ006
related: [PLAN009, TP039]
---

# Test result — Cancellation Rules backend (REQ006/PLAN009/TP039)

**Outcome: PASS.** Committed together with this document — see `git log` for the exact commit SHA (same commit that adds `backend/src/cancellation-rules/`).

## Unit tests

`docker exec medibook_backend npx jest cancellation-rules` — 15/15 passed.

Full backend regression: `docker exec medibook_backend npm test` — **38 suites / 420 tests, all green**, no regressions from the schema change (`Clinics`/`ClientOrganizations` back-relations added).

`docker exec medibook_backend npm run lint` — clean.

## Live e2e verification (real backend, not mocks)

All 9 steps in TP039's live-verification section executed via authenticated GraphQL calls against the running `medibook_backend` container, using the real seeded `admin@medibook.dev` and `manager@medibook.dev` accounts and the real seeded foreign-org clinic (Westside FC Road Clinic). All passed as specified, including the cross-tenant rejection (`"Clinic not found"`) and the org-anchor-preserved-on-global-switch behavior. Test rows deleted after verification; dev DB confirmed back to 0 rows in `ProductCancellationRules`.

## Compile verification

`docker logs medibook_backend` confirmed `Found 0 errors` after both migrations + `prisma generate` (run inside the container — `node_modules` is an anonymous Docker volume, not bind-mounted from the host, so a host-side `prisma generate` alone does not update the container's copy) + `docker restart medibook_backend`.

## Scope note

This closes only the Cancellation Rules tab of REQ006. Notification Templates and Security-settings tabs remain open, blocked on the feature-overlap questions already logged against REQ006/REQ005.
