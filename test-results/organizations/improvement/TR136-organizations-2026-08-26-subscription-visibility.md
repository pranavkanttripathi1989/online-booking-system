---
id: TR136
type: improvement
feature: organizations
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP137
related: [PLAN110]
---

# TR136 — Test results: subscription read-back visibility

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP137 case outcomes

All 10 cases pass. Cases 1-4 in `organizations.service.spec.ts`'s new
`getSubscription` describe block; cases 5-7 in
`organizations.resolver.spec.ts`'s existing `it.each` role-gating table
plus a new `organizationSubscription` describe block; cases 8-9 verified
live against the real dev stack (not mocked-Prisma); case 10 verified by
direct code read of the new Dialog JSX (loading/error/empty/populated
branches all present and gated on the correct state combination) — no
browser-automation tool was available this session for a live Playwright
pass of this specific dialog; the existing `admin-organizations.spec.js`
e2e spec was not extended for this slice (out of scope — this is a small
additive read-only panel, not a new domain).

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `backend: npx tsc --noEmit` (scoped, first pass) | Clean |
| `backend: npx jest src/organizations --maxWorkers=2` (scoped, first pass) | 2/2 suites, 39/39 tests |
| `backend: npx jest --maxWorkers=2` (full suite) | 84/84 suites, 1324/1324 tests |
| `backend: npm run test:int` (from host) | 4/4 suites, 369/369 tests |
| `backend: eslint "{src,apps,libs,test}/**/*.ts"` | Clean |
| `backend: npx tsc --noEmit` (full) | Clean |
| `frontend: eslint src/pages/admin/Organizations.jsx` | 0 errors, 14 warnings (pre-existing hex-literal pattern, matches the file's own existing `is_active` Chip) |
| `frontend: npm run build` | Clean, 3m51s |
| Container compile (`docker restart` + `docker logs`) | "Found 0 errors. Watching for file changes." |

## Live verification against the real dev stack

Logged in as `admin@medibook.dev` over real GraphQL (`login` mutation,
real JWT). Queried `organizationSubscription` for two real seeded orgs
(City Heart Clinic Group, Westside Health Group) — both returned `null`,
confirming the "No subscription on file" empty state matches real data
(zero orgs in the current dev DB have a subscription row, since
admin-created orgs never go through the self-serve onboarding wizard
that would populate one).

Temporarily inserted one `SubscriptionPlans` row (₹5,000/mo, ₹50,000/yr,
5 clinics, 50 users) and one linked `OrganizationSubscriptions` row
(status `active`, billing cycle `monthly`) for City Heart Clinic Group
via direct SQL. Re-queried `organizationSubscription` over real GraphQL
— returned the correct populated shape, with `price_monthly` correctly
converted from the stored `500000` paise to `5000` rupees. Reverted both
rows via direct `DELETE` SQL immediately after; confirmed zero residue
via a follow-up `SELECT count(*)` on both tables.

## No new issues found

Unlike several prior slices this session, no real bug was found or
fixed in the process — this is a small, additive, read-only query
against an already-correct existing schema, matching the pattern this
document's own `PLAN110` predicted (Two of the eight `REQ054`/`REQ058`
slices in Phase G+3 held with no design bugs when a prior pass's own
fix patterns were applied proactively — the same `@Auth('admin',
'super_admin')` gate and `null`-on-missing convention already proven on
this exact resolver were applied from the start here, not discovered
via a failing test).
