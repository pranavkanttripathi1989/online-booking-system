# Phase 4 — Core Catalog Modules

## Live browser verification pass (2026-08-17, post-Increment-2)

Everything below was previously verified only via `curl` against the real backend. This pass used a real Chromium browser (Playwright MCP — see the Node-upgrade story two sections down) driven against the live Docker stack to confirm the actual UI, not just the API contract. Full detail: `test-plan/phase4-backend-integration-test-plan.md`, `test-result/phase4-backend-integration-test-results.md`, `test-suggestion/phase4-backend-integration-test-suggestion.md`.

**Confirmed working end-to-end in a real browser, zero console errors:** Auth (real login, not the mock demo-account shortcut), Dashboard's graceful degradation when the unbuilt analytics backend 400s, Clinics (list/create/edit/detail, Rooms tab), Rooms (create, `room_number`→`name` mapping), Organizations (list/create/edit, India address round-trip including State+Pincode, server-side code normalization), role-based access (patient can read Clinics but not create; manager cannot create an Organization; no-token requests are rejected).

**A real bug found and fixed live, not just documented:** `/admin/room-types` and `/admin/clinician-types` had a complete write-path break — their inline GraphQL operations expected a `{success, userErrors}` wrapper with distinctly-named input types (`CreateRoomTypeInput`, etc.) that the Lookups module never actually implemented (it returned the entity directly, using one shared `LookupInput`). Create/Update/Delete were **100% non-functional** for both pages — this had never been caught because the Increment 1 `curl` verification only exercised the canonical `LookupInput`-shaped contract, never the frontend's actual inline queries. Fixed: `dto/lookup.input.ts` split into 4 explicitly-named input types, added `LookupMutationResultType`, added the missing `deleteRoomType`/`deleteClinicianType` mutations (hard delete — no `is_deleted` column on these two models, and no FK risk since `Rooms.room_type`/`Clinicians.clinician_type` are plain strings). Full create→delete cycle re-verified live afterward. See `test-result/phase4-backend-integration-test-results.md`'s `BUG-P4-001` for complete root-cause detail.

**Three gaps found and left open, tracked in `test-suggestion/phase4-backend-integration-test-suggestion.md`** rather than fixed on the spot, each because it needs a decision bigger than a one-line patch: `manager/rooms/index.jsx`'s pre-existing contract collision (still unresolved, now with an explicit recommendation to rewrite it against the canonical contract); Organizations' pincode-validation error surfaces as a generic "Bad Request Exception" instead of the real message (systemic — `ValidationPipe` rejections bypass every resolver's `{success, userErrors}` catch, needs a global exception filter, not a per-field fix); Apollo cache staleness after `createClinic` (a newly-created clinic doesn't appear in other pages' dropdowns until a hard refresh — missing `refetchQueries`).

**Also confirmed, not a bug:** `/patients` hangs indefinitely on a loading spinner — but Patients has no backend yet (Phase 6), so this is out of scope for Phase 4 testing and just noted for whoever picks up that phase.

**Tooling note:** this session's Chrome/browser MCP setup required installing Node 24 LTS into a user-owned directory (`~/.n`, not `/usr/local` — the system default Node 18.13 was never touched) since both `chrome-devtools-mcp` and `@playwright/mcp` require Node ≥20. Playwright MCP is the one that actually connected; `chrome-devtools-mcp` was registered but never showed connected tools in this session.

## Increment 2 — Organizations (`ClientOrganizations` admin CRUD)

Status: **built, migrated, live-verified.** Scope explicitly bounded to the Phase 4 admin-CRUD path only — **not** the Phase 3.5 self-serve onboarding wizard (`startOrganizationOnboarding`/`selectOnboardingPlan`/etc., a separate transactional multi-step flow already scoped in `context/backend-implementation-plan.md` Phase 3.5 and currently mock-only in `frontend/src/mocks/store.js`). An admin-created org here gets `onboarding_status: completed`, `owner_user_id: null` — matching `test-suggestion/organization-onboarding-test-suggestion.md`'s explicit note that admin-CRUD and self-serve onboarding are two intentionally distinct paths into the same table.

**Grounding read before building** (per the standing "analyze before building" convention): `context/backend-implementation-plan.md` Phase 3.5, `test-cases/12-admin-rbac/test-cases.md` (`TC-ADMIN-UNIT-008` code normalizer, `TC-ADMIN-UNIT-013`/`API-011` India address shape, `TC-ADMIN-API-010` duplicate code, `TC-ADMIN-API-012` admin-only guard, `TC-ADMIN-E2E-006`, `TC-ADMIN-FE-013` search debounce), `test-suggestion/organization-onboarding-test-suggestion.md`, `requirements/organization-branding-and-management-requirements.md` §4 (confirmed branding is out of scope here — mock-only, Settings→Clinic tab, unrelated to this CRUD module), `frontend/src/pages/admin/Organizations.jsx` (the only real consumer), `schema.prisma`'s `ClientOrganizations` model.

### What was built

| File | Purpose |
|---|---|
| `backend/src/organizations/{organizations.module,organizations.service,organizations.resolver}.ts` | `organizationsPaginated(search)`, `createOrganization`, `updateOrganization`, `deleteOrganization` (soft delete) |
| `entities/organization.entity.ts` | `Organization`, nested `OrganizationAddress`, `OrganizationsPaginated`/`OrganizationPageInfo`, `OrganizationMutationResult`/`UserError` |
| `dto/organization.input.ts`, `dto/organization-address.input.ts` | `OrganizationInput` (nested `address`), `OrganizationSearchInput` |
| `prisma/schema.prisma` + `migrations/20260817110000_add_organization_address_structured/` | `ClientOrganizations.address_structured Json?` |

### Contract decision (Rule 9) — different from Clinics/Rooms, deliberately

`admin/Organizations.jsx` is the **only** frontend consumer of Organization operations — `frontend/src/graphql/queries.js`/`mutations.js` have zero `Organization` references at all, so unlike Rooms there was no competing canonical contract to preserve. That gave real freedom here: rather than perpetuating the page's original Western `address_line1`/`address_line2`/`city`/`postal_code`/`country` shape (no `state`, no `pincode` — flagged as wrong by `TC-ADMIN-UNIT-013` before this increment even started), built the structured India shape (`{line1, line2, city, state, pincode, country}`, matching `Patients.address_structured`'s precedent) and **updated the frontend form to match** — added a State field, renamed Postal Code→Pincode, restructured the dialog's address fields into a nested `form.address` object. This is the one case in Phase 4 so far where "match the frontend exactly" and "match CLAUDE.md's India mandate" pointed the same direction once the competing-contract risk was ruled out.

Kept the page's existing `{success, userErrors, organization}` mutation-response wrapper and `organizationsPaginated(search): {data, pageInfo}` query wrapper as-is (same Shopify-style pattern also seen in the still-unresolved `rooms/index.jsx` — this increment didn't touch that decision, just honored it for the one page that actually needs it).

### Real findings during build

- **`normalizeOrgCode`** (`TC-ADMIN-UNIT-008`) implemented and verified live: `"  City Heart!! "` → `"city-heart"`.
- **GraphQL-level required-field enforcement is stronger than expected**: making `state`/`pincode`/`city`/`line1` non-nullable (`String!`) on `OrganizationAddressInput` means Apollo rejects a request missing them **before the resolver even runs**, with a precise per-field message (`Field "OrganizationAddressInput.pincode" of required type "String!" was not provided`) — satisfies `TC-ADMIN-UNIT-013`/`API-011` more strongly than a runtime check would have.
- **A real, narrow gap found and left open, not silently fixed**: the resolver's `try/catch`-based `userErrors` mapping only catches errors thrown *inside* the resolver body (service-layer `ConflictException`/`NotFoundException`, e.g. duplicate code — verified working). It does **not** catch NestJS's global `ValidationPipe` rejections (e.g. the pincode regex validator, `@Matches(/^\d{6}$/)`), which fire before the resolver method executes and surface as a generic top-level GraphQL error (`"Bad Request Exception"`) instead of a friendly `userErrors` entry — the real message is still present but buried in `extensions.originalError.message`, not surfaced to `admin/Organizations.jsx`'s `err.message` the way a duplicate-code rejection is. Documented rather than silently patched: fixing this properly means a GraphQL exception filter that reformats `ValidationPipe` failures into the `userErrors` shape globally, which is a bigger, more general piece of work than this one page's DTO — worth doing once more mutations use this response pattern, not as a one-off patch here.
- **Also fixed while in the file** (`TC-ADMIN-FE-013`, pre-existing, already documented as a known gap): search fired a fresh `client.query` per keystroke with no debounce. Added a 300ms debounce matching the pattern already used in `patients/index.jsx`.

### Live verification (docker exec / curl against the running stack)

- `createOrganization` with a full valid India address → succeeds, code normalized, address round-trips exactly through the nested `address_structured` JSON column.
- Missing `state`/`pincode` → rejected at the GraphQL schema level with per-field messages.
- Invalid pincode format (5 digits) → rejected (see the `userErrors`-bypass gap noted above).
- Duplicate `code` → `{success:false, userErrors:[{message:'Organization code "city-heart" is already in use'}]}`.
- `manager` role attempting `createOrganization` → `FORBIDDEN` (admin/super_admin only, correctly **excludes** manager unlike Clinics/Rooms — a manager runs one tenant, doesn't create tenants).
- `organizationsPaginated(search:{search:"city",...})` → correct filtered result + `pageInfo`.
- `npm run build` (production) → exit 0.

---

## Increment 1 — Clinics, Rooms, Clinician/Room Type lookups

Status: **built, migrated, live-verified end-to-end against the running Docker stack** (not just compiled — actual GraphQL calls against real Postgres). First real, non-Auth backend work since Phase 3. Grounded in `context/backend-implementation-plan.md` Phase 4 and `context/backend-hard-rules.md` (which this increment also corrected — see §2 below).

### What was built

| Module | Files | Backs |
|---|---|---|
| Clinics | `backend/src/clinics/{clinics.module,clinics.service,clinics.resolver}.ts`, `entities/clinic.entity.ts`, `dto/clinic.input.ts` | `clinics`, `clinic(id)`, `createClinic`, `updateClinic` |
| Rooms | `backend/src/rooms/{rooms.module,rooms.service,rooms.resolver}.ts`, `entities/room.entity.ts`, `dto/room.input.ts` | `rooms(clinic_id)`, `room(id)`, `createRoom`, `updateRoom` |
| Lookups (ClinicianType/RoomType) | `backend/src/lookups/{lookups.module,lookups.service,lookups.resolver}.ts`, `entities/*.ts`, `dto/lookup.input.ts` | `clinicianTypes`, `createClinicianType`, `updateClinicianType`, `roomTypes`, `createRoomType`, `updateRoomType` |
| Schema | `backend/prisma/schema.prisma` + hand-written migration `20260817090000_add_clinic_location_fields/` | Added `Clinics.city`/`postcode`/`timezone` (nullable, `timezone` defaults `Asia/Kolkata`) |

All three modules wired into `app.module.ts`. Migration applied via `docker exec medibook_backend npx prisma migrate deploy` (the running container, not a rebuild — `prisma migrate dev` still can't run non-interactively, same limitation as Phase 1-3).

### 1. Contract verification (backend-hard-rules.md Rule 9) — what matched, what needed a decision

Read `frontend/src/graphql/queries.js`/`mutations.js` verbatim before writing any resolver, per Rule 9. Two real findings:

- **`Clinics.address` shape**: the frontend's `CLINICS_QUERY`/`ClinicInput` request flat `city`/`postcode`/`timezone` scalars (from `manager/clinics/create.jsx`'s actual form state), not a structured JSON blob like `Patients.address_structured`. This contradicts CLAUDE.md's India address mandate (`state`+`pincode`, not `city`+`postcode`) — but Rule 9 says match the *actual* wire contract, not an aspirational one. **Decision made**: added `city`/`postcode`/`timezone` as flat columns matching the frontend exactly, defaulted `timezone` to `Asia/Kolkata` (not the frontend form's wrong `'Europe/London'` default), and validate `postcode` as a 6-digit Indian PIN even though the field is still named `postcode`. **Follow-up flagged, not done**: rename `postcode`→`pincode` and add a `state` field, updating `create.jsx`/`edit.jsx`'s forms to match — a real, deliberate scope cut for this increment, not an oversight.
- **`Rooms.name` vs `room_number`**: the frontend's `ROOMS_QUERY`/`RoomInput` expect a `name` field; the Prisma column is `room_number`. Exposed as a GraphQL-only field mapping in `RoomsService.toGraphQL()` (DB column left unrenamed — renaming would touch every other `Rooms` relation in `schema.prisma` for a cosmetic difference).

### 2. Real bug found and fixed: global guard ordering (corrects `backend-hard-rules.md` Rule 2)

The first live test of a `@Roles()`-guarded mutation (`createClinic` with a valid manager token) returned **"Not authenticated"** instead of succeeding. Root cause: `RolesGuard` is a global `APP_GUARD`; `GqlAuthGuard` was only ever applied per-handler via `@UseGuards()`. NestJS always runs global guards before handler-level ones, **regardless of decorator order** — so `RolesGuard` ran first, found `req.user` unset (Passport hadn't run yet), and rejected. The hard-rules doc's original Rule 2 ("pair `@Roles()` with `@UseGuards(GqlAuthGuard)`") does not fix this, and was corrected in place rather than left wrong for the next reader.

**Actual fix**: `GqlAuthGuard` is now also global (`GqlThrottlerGuard` → `GqlAuthGuard` → `RolesGuard` order in `app.module.ts`'s `APP_GUARD` array), with a new `@Public()` decorator (`common/decorators/public.decorator.ts`) as the explicit opt-out. `auth.resolver.ts`'s `login`/`register`/`refresh`/`requestOtp`/`verifyOtp`/`forgotPassword`/`resetPassword` are now marked `@Public()`; `me`/`logout` need no annotation at all (protected by default). This flips the default from fail-open (forget an annotation → wide open) to fail-closed (forget an annotation → requires auth) — a real hardening improvement, not just a bug fix. Verified live: no-token request → `UNAUTHENTICATED`; wrong-role request → `FORBIDDEN` with the correct message; correct-role request → succeeds.

### 3. Live verification (docker exec against the running stack, not just `nest build`)

- `npx prisma validate` — clean.
- `npx prisma migrate deploy` (in-container) — applied cleanly.
- `npm run build` (in-container, production build) — 0 errors.
- Full GraphQL round-trip via `curl` against `localhost:4000/graphql`:
  - `login` as seeded `manager@medibook.dev` → real JWT.
  - `createClinic` → real row, all fields round-trip including `city`/`postcode`/`timezone`.
  - `clinics` query → returns the created clinic.
  - `createRoom` (with `clinic_id`) → real row; response's `name` field correctly reflects the `room_number` mapping; nested `clinic{id name}` resolves.
  - `rooms` query and `room(id)` → both correct.
  - `createClinicianType` → succeeds for `admin`; re-creating `"CARDIOLOGIST"` (different case) → rejected with `409 Conflict`, confirming case-insensitive uniqueness (`TC-ADMIN-API-013`/`UNIT-009`).
  - `patient@medibook.dev` attempting `createClinic` → `FORBIDDEN` (role-gated correctly).
  - No `Authorization` header at all → `UNAUTHENTICATED` on a read query (`clinics`).
  - `patient@medibook.dev` reading `clinics` → succeeds (read is open to any authenticated role, not manager-only — patients need this for the booking wizard).

### 4. Frontend integration check — what "make sure integration is done" actually found

Per the explicit ask to verify frontend files, not just assume the backend contract match is sufficient:

| Page | Before this increment | After |
|---|---|---|
| `manager/clinics/create.jsx` | Already used `CREATE_CLINIC_MUTATION` (canonical `graphql/mutations.js`) | Verified compatible with the new resolver as-is — no change needed |
| `manager/clinics/edit.jsx` | Already used `CLINIC_DETAIL_QUERY`/`UPDATE_CLINIC_MUTATION` | Verified compatible as-is |
| `manager/clinics/detail.jsx` | Already used `CLINIC_DETAIL_QUERY`/`ROOMS_QUERY` | Verified compatible as-is |
| `manager/rooms/create.jsx`, `edit.jsx`, `detail.jsx` | Already used the canonical `graphql/mutations.js`/`queries.js` (`CREATE_ROOM_MUTATION`, `ROOM_DETAIL_QUERY`, etc.) | Verified compatible as-is; `room(id)` query was **missing** from the initial resolver build (only `rooms` list existed) — added `RoomsService.findOne()` + `room` query this increment, confirmed live |
| **`manager/clinics/index.jsx`** (list page) | **Zero Apollo wiring at all** — 100% hardcoded `CLINICS_DATA`/`ROOMS_DATA` mock arrays, would never reflect real backend state regardless of what this increment built | **Fixed**: now calls `CLINICS_QUERY`/`ROOMS_QUERY` with the same `useMock` fallback pattern used elsewhere (`patients/index.jsx`), mapping real rows through `toCardClinic`/`toCardRoom` helpers. Enrichment fields the schema doesn't carry yet (clinician count, room count, today's/monthly appointment volume, manager name, specialties) render as honest zero/placeholder values for real rows — **not fabricated**, and explicitly commented as blocked on Phase 5 (Clinicians) and Phase 7 (Appointments), not an oversight. |
| **`manager/rooms/index.jsx`** (list page) | Uses its **own inline, incompatible GraphQL contract** — `roomsPaginated(search: SearchInput)` returning a `{data, pageInfo}` wrapper, and `createRoom(input: CreateRoomInput!)` returning `{success, userErrors, room}` (Shopify-style), with different field names (`room_number`, `clinician_type`) than the canonical `graphql/mutations.js`/`queries.js` used by `create.jsx`/`edit.jsx`/`detail.jsx` (`RoomInput` → `Room!` directly, field `name`) | **Left untouched — this is a decision for you, not something I should silently pick.** A GraphQL schema can only have one `createRoom` mutation signature; the two contracts in this codebase are mutually incompatible. Building the resolver to match `rooms/index.jsx`'s pattern would break `create.jsx`/`edit.jsx`/`detail.jsx` (already verified working); building it to match the canonical pattern (which is what got built) leaves `rooms/index.jsx` non-functional against a real backend, same as it was before this increment. **Recommendation**: `rooms/index.jsx` looks like an orphaned/earlier implementation (its mock IDs — `rm-1`/`cl-1` — don't match the conventions used anywhere else in the mock data layer) — likely candidate to be rewritten against the canonical contract in a follow-up, not the other way around, but confirm before touching it. |
| `admin/room-types` | Already documented as crashing on load (`TC-ADMIN-FE-001`, pre-existing, unrelated to this increment) | Not investigated further this increment — `roomTypes`/`clinicianTypes` mutations now exist server-side (`createRoomType`/`createClinicianType`) if that page gets rebuilt, but its current crash is a separate frontend bug, not a missing-backend problem |

### 5. Rest of Phase 4 — not yet built

`Organizations` (`ClientOrganizations`) CRUD, `Products`/`ProductCategories`/`ProductSubcategories`/`ProductVariations`/`ProductCancellationRules`, `Languages` CRUD, `EmailTemplates` CRUD. `Languages` specifically has **no frontend GraphQL consumer at all** today (the `languages` field in `queries.js` is a scalar array on `Clinician`, not this lookup table) — lower priority than Clinics/Rooms/ClinicianTypes, which all had confirmed real consumers, deprioritized for that reason rather than forgotten.

### 6. Files touched, for reference

**Backend (new):** `src/clinics/**`, `src/rooms/**`, `src/lookups/**`, `src/common/decorators/{auth,public}.decorator.ts`, `prisma/migrations/20260817090000_add_clinic_location_fields/migration.sql`.
**Backend (edited):** `prisma/schema.prisma` (Clinics fields), `src/app.module.ts` (module wiring, global `GqlAuthGuard`, `formatError` production hardening per Rule 4), `src/common/guards/gql-auth.guard.ts` (global + `@Public()` support), `src/auth/auth.resolver.ts` (`@Public()` on the 7 pre-login mutations, dropped now-redundant `@UseGuards`).
**Frontend (edited):** `pages/manager/clinics/index.jsx` (real Apollo wiring, was 100% mock).
**Frontend (deliberately not touched):** `pages/manager/rooms/index.jsx` (contract collision, needs a decision first).
**Context docs:** `context/backend-hard-rules.md` Rule 2 corrected in place (not just appended), Definition-of-Done checklist item updated to match.
