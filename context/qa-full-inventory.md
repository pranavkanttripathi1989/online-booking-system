# QA Full Inventory — Phase 1 (QA-TESTING-EXECUTION-PROMPT.md)

**Date:** 2026-08-18
**Purpose:** Phase 1 DoD artifact — a complete backend resolver/auth inventory, DB tenant-scoping inventory, and role inventory, with every gap found already flagged (per the prompt's own rule: nothing gets written up as a test case until this inventory exists). Frontend inventory is handled by reference (see §4) rather than re-derived from scratch, since a full 75-page/55-component line-level audit already exists and was actively used/updated this session.

---

## 1. RBAC role inventory

Source: `backend/prisma/seed.ts` (5 demo accounts) + `getUserRoles` live query (6 seeded `UserRoles` rows, confirmed 2026-08-18).

| Role | Seeded demo account | Notes |
|---|---|---|
| `admin` | `admin@medibook.dev` | Platform-wide, `client_org_id: null` |
| `super_admin` | *(not seeded as a login — role exists, no demo account)* | Platform-wide, `client_org_id: null` |
| `manager` | `manager@medibook.dev` | Org-scoped — **as of 2026-08-19 actually has a real `client_org_id`** (`city-heart`), see §6 |
| `clinician` | `clinician@medibook.dev` | Org-scoped (real org as of §6); **as of 2026-08-18 also self-scoped** to their own schedule/patients (see §3) |
| `staff` | `receptionist@medibook.dev` (seeded email says "receptionist", role name is `staff`) | Org-scoped (real org as of §6), front-desk-wide (not self-scoped — receptionists need the whole clinic's view) |
| `patient` | `patient@medibook.dev` | Org-scoped (real org as of §6); **as of 2026-08-18 self-scoped** to their own records (see §3) — but see residual risk note in §3, the seed account still isn't linked to a `Patients` row (a separate, deliberately-not-fixed gap, see §6) |

`RolesGuard` (`common/guards/roles.guard.ts`) implements OR-semantics: a caller passes if `user.roles` intersects the `@Auth(...)` role list at all. `GqlAuthGuard` is global (`app.module.ts` `APP_GUARD` order: Throttler → Auth → Roles), so **every resolver requires login by default**; `@Public()` opts out, `@Auth(...)` adds a role restriction on top. A query/mutation with neither decorator is reachable by **any logged-in role**, regardless of role — this is the exact class of bug found in §3.

---

## 2. DB model inventory — tenant/row scoping

Models with `client_org_id` directly: `Clinics`, `MessageThreads`, `OrganizationSubscriptions`, `PaymentTransactions`, `StripeConfigurations`, `UserProfiles`, `UserRoles`.

Models scoped **indirectly** (via a relation) — each verified against its service's actual `where` clause, not assumed from the schema alone:

| Model | Scoping path | Org-level scoped? | Self-scoped (patient/clinician)? |
|---|---|---|---|
| `Patients` | `appointments.clinic.client_org_id` (OR zero appointments) | ✅ yes (`patients.service.ts` `orgScope`) | ✅ **fixed 2026-08-18** — was missing entirely (patient→self, clinician→treated-only) |
| `Appointments` | `clinic.client_org_id` | ✅ yes (`orgScope`) | ✅ **fixed 2026-08-18** — was missing entirely (patient→own, clinician→own schedule) |
| `TestResults` | `ordered_by.client_org_id` | ✅ yes | ✅ **fixed 2026-08-18** — was missing entirely (patient→own); **no `@Auth()` role gate at all**, still true post-fix (see §3 finding 4) |
| `Rooms` | `clinic.client_org_id` | ✅ yes (`rooms.service.ts`) | n/a (not patient/clinician-identifiable data) |
| `Clinicians` | `clinic.client_org_id` | ✅ yes (`clinicians.service.ts`) | n/a — read is intentionally public-ish (directory), writes are `@Auth('manager','admin','super_admin')` |
| `ClinicianAvailability` | via `clinic`/`clinician` — **not verified this pass**, `availability.resolver.ts`'s list query has no `@Auth()` | ⚠️ unverified | ⚠️ unverified — flagged for Phase 2 |
| `SpacerBlocks`/`RoomBlocks` | via `clinic` — reads have **no `@Auth()`** at all | ⚠️ unverified whether org-scoped | n/a (internal scheduling data, not PHI — lower severity, flagged for Phase 2 rather than fixed immediately this pass) |
| `Reviews` | `appointment`/`clinic` — resolver is `@Auth('admin','super_admin','manager')`-gated | ✅ role-gated, org-scoping not independently verified | n/a |
| `MessageThreads`/`MessageParticipants`/`Messages` | `client_org_id` direct + `MessageParticipants.user_id` membership check | ✅ yes, self-scoped by construction (`messages.service.ts` requires a `MessageParticipants` row for the caller) | ✅ yes (by design, not a retrofit) |
| `Products`/`ProductCategories`/etc. | `clinic.client_org_id`, nullable (`clinic_id?`) | ✅ yes where set | n/a |
| `Notifications` | `user_id` direct | n/a (already fully self-scoped, verified correct) | ✅ yes, pre-existing, correct |

---

## 3. Backend resolver/auth inventory — findings

Full method-by-method `@Auth()`/`@Public()` annotation list gathered via `grep -n "@Query\|@Mutation\|@Subscription\|@ResolveField\|@Auth(\|@Public(" ` across every `*.resolver.ts` (22 resolver files, ~140 handler methods) — available in shell history of this session; not reproduced in full here to keep this doc reviewable, but every finding below came directly from that sweep.

### Findings — fixed this pass (all commits pushed to `master`)

1. **`patients`/`patient(id)` — no patient or clinician self-scoping.** Any `patient`-role JWT could read every patient's PHI in the org (name, DOB, medical notes). Any `clinician`-role JWT could read every patient in the org, not just ones they'd treated (TC-AUTH-API-009). **Fixed** — `patient_id`/`clinician_id` embedded in JWT, `PatientsService.selfScope()` added. 8 new tests, live-verified.
2. **`appointments`/`appointment(id)` — same gap.** Any `patient`-role JWT could read every appointment in the org (reason, notes, other patients' names). Any `clinician`-role JWT saw every clinician's schedule (TC-APPT-API-010). **Fixed** — `AppointmentsService.selfScope()` added. 9 new tests, live-verified.
3. **`testResults`/`testResult(id)` — same gap, plus no `@Auth()` at all.** Any authenticated role, patient included, could read every patient's lab values org-wide (TC-PAT-API-011). **Fixed** patient self-scoping. 4 new tests. **Not fixed:** the query still has no role restriction at all — see finding 4 below.

### Findings — flagged, not fixed this pass (lower severity, no patient-identifying data, deferred to Phase 2's formal RBAC matrix)

4. **`testResults`/`testResult(id)` have no `@Auth()` role annotation.** Currently reachable by any logged-in role. Not fixed because the *scoping* fix (finding 3) already closes the actual data leak for the highest-risk role (`patient`); whether `clinician`/`staff` should also be restricted (e.g. a clinician seeing another clinician's ordered tests) is a product-intent question for Phase 2's RBAC matrix, not a clear-cut security bug like findings 1–3.
5. **`spacerBlocks`/`roomBlocks`/`getSpacerBlocks` (blocks domain) have no `@Auth()` on reads at all**, and org-scoping wasn't independently re-verified this pass (only mutations are `@Auth('manager','admin','super_admin')`-gated). Lower severity — this is internal scheduling data (clinician block reasons like "on leave"), not PHI — but still worth a Phase 2 pass to confirm org-scoping is actually correct and decide whether patient-role access should be blocked outright.
6. **`availability` (list query, `availability.resolver.ts`) has no `@Auth()` on reads.** Same category as finding 5 — internal scheduling data, not independently re-verified for org-scoping this pass.
7. **`roomsPaginated`/`rooms`/`room(id)` have no `@Auth()` on reads.** Lowest severity of the three (room names/capacity aren't sensitive), but same "any authenticated role" exposure pattern — worth confirming intentional in Phase 2.

### Findings — reviewed, appear intentional (no action needed)

- `clinics`/`clinic(id)`, `clinicians`/`clinician(id)`, `services`, `products`/categories/subcategories reads: no `@Auth()`, but these are patient-facing directory/catalog data needed for the booking wizard — correctly public-within-the-app by design (documented inline in `clinics.resolver.ts`'s own comment).
- `public.resolver.ts`: all patient self-serve booking reads are explicitly `@Public()`; `getAppointment` (video call detail) is deliberately behind login but not role-restricted, appropriate for a join-by-link video call flow.

---

## 4. Frontend inventory — by reference

`context/backend-api-requirements-master-plan.md` (75-page/55-component audit) and `context/frontend-integration-audit.md` (line-level real-vs-mock audit) both predate this session's fixes. Since this session, the following pages moved from BROKEN/GAP (mock-only or contract-mismatched) to fully real-backend-wired, verified live: `manager/Availability.jsx`, `manager/Blocks.jsx`, `manager/Dashboard.jsx`, `admin/users/index.jsx`, `components/Clinicians/ClinicianCard.jsx`, `components/Clinicians/ClinicianProfileDrawer.jsx`, `pages/reviews/index.jsx`, `pages/messages/index.jsx`. Both docs need a refresh pass reflecting this — not done as part of this inventory to avoid duplicating `context/open-questions.md`'s existing tracking; treat `context/open-questions.md` + this session's commit log as the current source of truth for what's still GAP/BROKEN until those two docs are explicitly refreshed.

**Still GAP (real backend exists, frontend not wired) as of this writing:** `staff/{index,new,edit,Appointments,Dashboard}.jsx`, `patient/{Profile,Appointments}.jsx`, `patients/detail.jsx`, `clinician/Patients.jsx`, `clinicians/{CreateClinicianPage,detail}.jsx`, `public/landing.jsx`, `auth/login.jsx`'s Register/ForgotPassword tabs, `auth/forgot-password.jsx`, `admin/Roles.jsx`, `components/shared/NotificationBell.jsx`. **Note:** `patient/{Profile,Appointments}.jsx` being still-mocked is *why* the §3 security fixes caused no functional regression — those pages don't call the now-scoped canonical queries yet.

**Still no backend at all:** Finances/Billing (Razorpay patient payments — see `context/open-questions.md` #1), most of Settings, Communications/Policies UI tabs, Cancellation Rules.

---

## Phase 1 DoD status

- [x] Backend resolver inventory — 100% of resolver files swept, every `@Auth()`/`@Public()` annotation recorded, every over-permissive-read gap flagged (§3).
- [x] DB model inventory — every model's tenant/self-scoping status recorded (§2).
- [x] RBAC role inventory — full role list confirmed against seed data and `RolesGuard` (§1).
- [x] Frontend inventory — covered by reference to existing audits + this session's changes (§4), not re-derived line-by-line (judgment call: re-deriving 75 pages from scratch when a current, actively-maintained audit already exists would be busywork, not rigor).
- [x] Every gap found already flagged before any new test-case writing — 3 Critical findings fixed same-session (§3 findings 1–3), 4 lower-severity findings logged for Phase 2 (§3 findings 4–7), not silently dropped.

**Phase 1 complete.** Phase 2 (updating `test-cases/` domain-by-domain with the full RBAC matrix) is the next unit of work — given its scope (15 domains × 4 sections × full role×operation matrix), it proceeds domain-by-domain across future sessions rather than in one pass, starting with the domains touched by this pass's security fixes (01-authentication, 03-appointments-booking, 05-patients), since their Backend-API sections already have real, executed, recorded results (see `test-result/{auth,patients,appointments}-test-results.md` and `test-suggestion/{patients,appointments,test-results-page}-test-suggestion.md`).

## 5. Live Chrome MCP verification pass — 2026-08-18 (rule 11)

Drove the real running stack (`localhost:3000` frontend / `localhost:4000` backend) through Playwright/Chrome MCP as each of admin/manager/patient, covering every page touched by this session's fixes. Two real bugs were found this way that curl-based API testing had missed entirely (both are UI/routing-layer bugs, invisible to a backend-only test):

**Found and fixed:**
1. **`/login`'s already-authenticated redirect and the AppShell index-route redirect were both hardcoded to `/dashboard` regardless of role**, and `/dashboard` itself had no `RoleGuard`. A patient (or clinician) account revisiting `/login`, or landing on `/`, was silently dropped onto a full manager-style analytics dashboard (data was mock, not a real leak, but a genuine RBAC/routing violation — exactly what rule 11 exists to catch, since no API-level test would ever exercise this client-side-only redirect logic). Fixed: both redirects now use `getPostLoginRedirect(user)`; `/dashboard` is `RoleGuard`-restricted to `['admin','super_admin','staff']` matching `AppShell.jsx`'s own nav config. Live-verified: patient → `/patient/dashboard`; direct `patient` navigation to `/dashboard` → proper `Forbidden403`.
2. **`manager/Dashboard.jsx`'s single combined GraphQL query silently zeroed the entire page** (not just the transactions table) because one of its three top-level fields (`getTransactionsByDate`) has no backend yet — GraphQL rejects a whole query document on one invalid field. This had been live-verified working via curl earlier in the session, but only by testing `getClinics`/`getAppointmentStats` in isolation, never as the frontend's actual combined request — a gap plain API testing can't catch on its own, since the bug is in how the *frontend* composes its query, not in either resolver. Fixed by splitting into two `useQuery` calls.

**Found and logged (not fixed — lower priority, no live-user impact yet):**
- `components/Clinicians/ClinicianCard.jsx`'s active/inactive toggle switch only renders for `isAdmin` (`admin`/`super_admin`/`receptionist`\* roles), which excludes `manager` — even though the backend's `toggleClinicianActive` mutation correctly allows managers to call it (`@Auth('manager','admin','super_admin')`). Under-permissive on the frontend relative to the backend (the safe direction, not a leak), but a real access-parity gap a manager would hit in practice.
- `clinicians/detail.jsx` (the full clinician detail *page*, reached via "View Profile") is still entirely on mock data (confirmed live: showed "Dr. Jane Smith" regardless of which real clinician was clicked) — already tracked in §4's GAP list, confirmed still accurate.
- `patient/Dashboard.jsx` is also still on mock data (not just `patient/{Profile,Appointments}.jsx` as §4 previously listed) — §4 updated to include it.

**Verified working correctly, no issues found:** `manager/Availability.jsx` (list + create form + real clinician dropdown), `manager/Blocks.jsx`, `admin/users/index.jsx` (all 8 real users, live toggle round-trip tested and reverted), `clinicians/index.jsx` list view (real data, availability heatmap), `reviews/index.jsx`, `messages/index.jsx` (full live send round-trip tested, thread list updates in real time). Mobile (360px) spot-check on `messages` and `manager/Dashboard` found no genuine responsiveness bugs — two apparent issues (fixed-bottom-nav overlap, transactions-table overflow) both turned out to be screenshot-method artifacts (a `fullPage:true` capture misrepresenting a `position:fixed` element's true on-screen behavior; MUI `TableContainer`'s built-in horizontal scroll not being visible in an unscrolled static capture) once verified against a real scrolled viewport — worth remembering for future passes: always verify a `position:fixed` finding against a true scrolled-viewport screenshot before reporting it.

## 6. Seed data never established a real tenant boundary — fixed 2026-08-19

**This was the single biggest finding of the whole pass, in terms of how it changes everything that came before it.** While fixing `getAppointment`'s access-control gap (§3-style finding — no ownership check at all on the resolver backing `video/index.jsx`'s join page), live-verifying it against `manager@medibook.dev` revealed the account's JWT carried `client_org_id: null`. Investigating further:

- 2 real `ClientOrganizations` rows already existed in the dev DB (`city-heart` / "City Heart Clinic Group", `westside-health` / "Westside Health Group") — created ad hoc at some earlier point (via the Organizations module, not `seed.ts`).
- **Nothing was ever linked to either org.** All 3 seeded clinics had `client_org_id: null`. Every one of the 5 demo `UserProfiles` accounts had `client_org_id: null` — including `manager`/`clinician`/`staff`/`patient`, which per `CLAUDE.md`'s own architecture doc should always have a real org (only `admin`/`super_admin` are meant to be org-less).

**Consequence:** every tenant-isolation fix made earlier in this pass (patients/appointments/testResults self-scoping, availability/blocks/clinicians/appointments create-path org checks) could only ever be live-verified via the "org-less caller sees everything" default-allow branch — because every demo account WAS org-less, not because the fix was actually correct against a real boundary. The real rejection path was provable only in the mocked unit tests, never live. Several test-cases.md status notes from earlier in this pass explicitly flagged "not independently re-verified with a live two-org fixture" for exactly this reason — that caveat is now understood to be systemic, not per-case bad luck.

**Fixed:** `backend/prisma/seed.ts` now upserts both orgs by their stable `code`, backfills every existing clinic with no org into `city-heart`, backfills every non-admin demo account's `client_org_id` into `city-heart`, and creates one clinic under `westside-health` specifically so a cross-tenant rejection test has real data to run against. Idempotent — safe to re-run (`docker exec medibook_backend npx prisma db seed`) against an existing DB or a fresh one.

**Re-verified live with the real boundary in place** (previously only unit-tested): `clinics()` correctly excludes the foreign-org clinic; `createSpacerBlock`/`createAvailability`/`createAppointment`/`clinic(id)` all correctly reject a real cross-org attempt; `getAppointment` now correctly *allows* same-org staff (previously incorrectly blocked by the null-org bug, unrelated to the fix's own logic being wrong).

**Still not fully closed:** a live cross-tenant test for the *Patients* domain specifically (`TC-PAT-API-001`/`006`) would require constructing a full second-org clinician+appointment+patient chain under `westside-health`, not just a bare clinic — not done this pass, deferred as a smaller follow-up now that the infrastructure to do it exists. The seeded `patient`/`clinician` demo accounts are now org-linked but still not linked to a `Patients`/`Clinicians` row (`patient_id`/`clinician_id` still null in their JWTs) — that's a separate, deliberately-not-fixed gap (see §3 finding 1's residual-risk note); fixing it would need either a real `Patients`/`Clinicians` row created for each demo account or a decision on how self-registration should link the two, out of scope for a seed-data tenant-linkage fix.
