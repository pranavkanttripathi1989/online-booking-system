---
id: PLAN073
type: improvement
feature: platform-nfr
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ018
related: [REQ032, REQ034, REQ022, REQ030, REQ031, REQ015, REQ029, PLAN065, PLAN066, PLAN067, PLAN068, PLAN069, PLAN070, PLAN071, PLAN072]
---

# PLAN073 — Implementation plan: Phase G+2 frontend completion

## Scope

Phase G+2 (PLAN065–072, same session) shipped 8 backend-only domains —
`REQ018` residue (prepayment policy + booking widget), `REQ032` (plan
builder), `REQ034` (DPDP consent + rights requests), `REQ022` (pharmacy
stock ledger), `REQ030` (signed webhooks), `REQ031` (insurance payer
master), `REQ015` (clinician verification + API keys), `REQ029` second
slice (patient report group + scheduled delivery) — every one of them with
an explicit "no frontend UI in this slice" deferral in its own PLAN doc.
This pass closes every one of those deferrals: real, tiered,
theme-token-compliant pages/tabs for all 8, verified against the real
backend via Playwright, not just unit-tested.

Classified as a cross-cutting `improvement` under `platform-nfr` (not a
new per-domain `requirement`) since it adds no new backend capability —
every mutation/query it calls already existed and was already tested;
this pass is purely "give the existing, tested contract a real UI,"
matching the `platform-nfr` precedent for work that touches many domains
at once (F-13's 30-model index migration, BUG009's 7-page wiring fix).

## Design

Seven new/changed surfaces, each following an existing convention rather
than inventing one:

- **`pages/admin/Plans.jsx`** — plan builder (`REQ032`). `useApolloClient()`
  + manual `client.query`/`client.mutate` (the established "new admin
  domain" pattern from `admin/Departments.jsx`, not `useQuery`/`useMutation`
  hooks). One form serves both "new plan" and "new version" via an
  `editingPlanId` toggle. Gated `admin`/`super_admin` at the route (no
  `super_admin` demo account exists in this dev environment — see Testing
  below), with a graceful `/permission/i`-matched info `Alert` when the
  `plans` query itself 403s for an `admin`-only (non-`super_admin`) caller,
  rather than a raw error.
- **`pages/admin/Payers.jsx`** — payer directory + branch empanelment
  (`REQ031`). Directory read is visible to `staff`/`manager`/`admin`/
  `super_admin` (matches `insurance.resolver.ts`'s `@Auth()`); "Add Payer"
  is `super_admin`-only, gated client-side via `hasRole('super_admin')`
  matching the backend's own `createPayer` gate. Empanelment status cycles
  through `active → de_empanelled → blacklisted` via a clickable `Chip`.
- **`pages/admin/RightsRequests.jsx`** — DPDP staff review queue
  (`REQ034`). Status filter, a Resolve dialog (status + notes), explicitly
  never performs an automated erasure/export action itself — matches the
  requirement doc's own "request-queued-for-admin-review, never instant
  self-service deletion" design.
- **`pages/manager/pharmacy/index.jsx`** — batch/stock ledger (`REQ022`).
  Receive-stock form, adjust-stock action, expiry-soon/expired highlighting
  (90-day threshold). Desktop-dense tier per `06-frontend-architecture-and-
  mobile.md`'s tiering model (staff-facing operational tool) — verified at
  1280/1440px.
- **`pages/manager/reports/index.jsx`** — patient report group + scheduled
  reports (`REQ029` 2nd slice). Built as a **new standalone page** rather
  than extending the existing 335-line single-view `pages/analytics/
  index.jsx`, specifically to avoid regression risk in an already-shipped
  page.
- **`pages/settings/index.jsx`** — two new tabs on the existing Settings
  page, matching that file's own established conventions (real MUI
  `<Table>`/`<TableContainer>`, not the raw-`Box`-table pattern used in the
  new `admin/*`/`manager/*` pages above — each file keeps its own local
  table convention rather than being forced into one):
  - **Integrations tab** — booking widget config (`REQ018`'s `US-BOOK-05`
    config half), webhook endpoints (`REQ030`, clickable event-type
    `Chip`s), API keys (`REQ015`). All three "shown-once" secrets
    (webhook signing secret, API key) rendered via a dismissible warning
    `Alert` with monospace styling, matching this codebase's established
    secret-reveal pattern.
  - **Privacy tab** — consent toggles (4 purposes) + data-rights request
    buttons (`REQ034`, patient-facing half). See the `AuthContext` bug
    below — this tab does **not** trust `useAuth()`'s cached `patient.id`.
- **`App.jsx`/`layouts/AppShell.jsx`** — 5 new routes
  (`/admin/plans`, `/admin/payers`, `/admin/rights-requests`,
  `/manager/pharmacy`, `/manager/reports`) and matching sidebar entries.

## Real bugs found and fixed

Three, all found via the Playwright pass, not unit tests — matching this
codebase's own repeated finding that live/e2e testing surfaces bugs unit
tests structurally cannot:

1. **`settings/index.jsx` missing the `CircularProgress` import** — used in
   the new Privacy tab's loading state but never added to the MUI import
   block. Crashed the *entire* Settings page (all 7 tabs, not just
   Privacy) with `CircularProgress is not defined` for every visitor,
   confirmed via a direct headless-browser console capture (`page.on
   ('pageerror', ...)`) since the failure rendered a blank page with no
   visible error. Fixed by adding it to the existing import line.
2. **`/admin/payers` and `/admin/rights-requests` were routed inside the
   `admin`/`super_admin`-only `RoleGuard` block**, but their own backend
   resolvers (`insurance.resolver.ts`'s `payers`/`payerEmpanelments`,
   `consent.resolver.ts`'s `rightsRequests`/`resolveRightsRequest`) are
   `@Auth('manager', 'admin', 'super_admin')` — a real manager, the actual
   day-to-day caller for both features, got the app's own "403 Access
   Forbidden" page before ever reaching the route. This is the exact
   frontend-route-vs-backend-contract mismatch Hard Rule 7 warns about,
   caught because a Playwright test logging in as Manager hit a route
   guard, not a GraphQL error. Fixed by moving both routes into the
   existing "admin OR manager" `RoleGuard` block (the same one
   `/admin/communications`/`/admin/policies` already use, for the
   identical reason — a manager is the real caller for an org-scoped
   feature, not an org-less admin/super_admin).
3. **A genuine, pre-existing `AuthContext.jsx` bug, not scoped to this
   session's new code**: `login()` caches `medibook_user` in
   `localStorage` straight from `LOGIN_MUTATION`'s response, which selects
   `user { id name email roles clinician {...} }` — **no `patient` field
   at all** (`graphql/mutations.js`). `AuthContext`'s own mount effect
   (`useEffect(() => { if (token && !localStorage.getItem
   ('medibook_user')) fetchMe() }, [])`) only calls the fuller `ME_QUERY`
   (which *does* select `patient { id full_name }`) when no cached user
   exists yet — and a fresh login always populates that cache first. Net
   effect: **`useAuth().user.patient.id` is permanently `undefined` for
   any freshly-logged-in patient session**, for the life of that session,
   regardless of whether the account is actually linked to a `Patients`
   row. Confirmed independently of any frontend code via a direct curl
   repro (link a patient in DB → fresh login → `me { patient { id } }`
   returns correctly) proving the *backend* is fine and the bug is purely
   in the frontend's login-time caching. `pages/patient/Family.jsx` never
   hits this because it doesn't read `user.patient.id` at all — its
   `MY_DEPENDANTS_QUERY` is self-scoped server-side from the caller's own
   JWT `patient_id` claim. **Not fixed at the `AuthContext` level** (out
   of scope for this pass — a core auth-caching change needs its own
   reviewed slice, not a rider on a frontend-completion pass); worked
   around locally in `settings/index.jsx`'s Privacy tab by adding a
   dedicated `GET_MY_PATIENT_LINK` query (`{ me { patient { id } } }`,
   `fetchPolicy: 'network-only'`) that resolves the patient link fresh on
   tab load instead of trusting the cached value. **Any future
   patient-facing feature that reads `useAuth().user.patient.id` will hit
   the same bug** — flagged here, not silently worked around everywhere;
   the real fix is a follow-on `AuthContext` slice (see Open questions).

## Testing

Real-backend Playwright spec, `frontend/e2e/phase-g2-frontend-completion.
spec.js` — one `test.describe` per surface, 7 tests total, all against the
real `medibook_backend`/`medibook_postgres`, no mocks:

- Admin Plans: asserts the graceful permission message for an `admin`-role
  (non-`super_admin`) caller — no `super_admin` demo account exists in
  `seed.ts`, so this is the real, meaningful assertion available here.
- Admin Payers / Rights Requests: real GraphQL round trips, a real
  `RequestDataRightsInput` fixture created/resolved through the UI.
- Manager Pharmacy: a real stock-receive through the UI form.
- Manager Reports: real stat cards + a real scheduled-report creation.
- Settings Integrations: creates a real booking widget config, webhook
  endpoint, and API key in one test, asserting each shown-once secret.
- Settings Privacy: patient fixture linked/unlinked via direct `psql`
  around the test (same discipline as `patient-family-and-dedup.spec.js`
  — the seeded `patient@medibook.dev` account is unlinked by default),
  toggles a consent switch, files a rights request.

Frontend: `npm run lint` (167 warnings, exactly matching the pre-session
baseline — zero net-new; see the e2e-spec cleanup below), `npm test`
(68/68, 8/8 suites), `npm run build` (clean), `node scripts/
check-page-data-wiring.mjs` (0 new fabricated pages). Backend (unaffected
— no backend files touched this pass, run per Hard Rule 3 regardless):
`npx jest --maxWorkers=2` (1053/1053, 73/73 suites), `npm run test:int`
(315/315, 4/4 suites — must run from the **host**, not `docker exec
medibook_backend`, since its `postgres_test` connection is hardcoded to
`localhost:5433`, a host-side port mapping the container's own network
namespace can't resolve), `eslint` (clean), `tsc --noEmit` (clean).

One real bug in the e2e spec itself, found by the lint ratchet catching
it: the Payers/Pharmacy `beforeAll` blocks fetched a `token`/`clinicId`/
`drugId`/`batchId` via GraphQL that the (UI-driven) test bodies never
actually used — 5 genuine `no-unused-vars` warnings, not pre-existing
drift (verified by stashing each touched file and re-linting the original
committed version, which showed the identical pre-existing warning count
in every case except this new spec file). Fixed by deleting the unused
fixture code rather than suppressing the lint rule.

## Environment note

This pass hit severe, unrelated environment instability mid-session: the
host machine rebooted partway through (`uptime` dropping from ~11h to
~10min) and entered a startup-storm load spike (`load average` peaking at
116.53, normal is single digits) that made Docker Desktop's daemon and
individual containers (`medibook_backend`, `medibook_frontend`) repeatedly
appear "Up" while actually wedged/unresponsive — the same container
force-remove-and-recreate recovery already documented in CLAUDE.md for
`medibook_backend` was needed for `medibook_frontend` too this session, a
first. Not a defect in this slice's own code; recorded here since it cost
real wall-clock time and the recovery pattern (quit Docker Desktop
entirely, relaunch, `docker rm -f` the wedged container, `docker compose
up -d` it fresh) is worth knowing before assuming a "hung" container needs
debugging rather than a clean restart.

## Open questions / deferred

1. **The `AuthContext.jsx` login-caching bug** (see above) needs its own
   reviewed slice — fixing it properly likely means either widening
   `LOGIN_MUTATION`'s `user` selection to include `patient { id }` (small,
   but every login-response consumer needs re-checking for shape
   assumptions) or changing the mount effect to always call `fetchMe()`
   once shortly after login regardless of cache state (small behavior
   change, extra round trip on every login). Logged, not fixed here.
2. **Sidebar visibility for `/admin/payers`/`/admin/rights-requests`**:
   `AppShell.jsx`'s `ADMIN_CHILDREN` nav section (where both new sidebar
   entries live) is gated behind `isAdmin` (`admin`/`super_admin` only) —
   a manager, who the routes now correctly allow, still can't discover
   either page from the sidebar, only by direct URL. This is a **pre-
   existing** gap shared by `/admin/communications`/`/admin/policies`
   (also manager-accessible routes with no manager-visible sidebar entry)
   — not introduced by this pass, and not fixed here to stay scoped;
   flagged for a future slice that fixes the sidebar's own role-gating
   for the whole `ADMIN_CHILDREN` section at once, not per-entry.
