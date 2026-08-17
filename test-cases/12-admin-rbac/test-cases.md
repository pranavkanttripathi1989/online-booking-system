# Admin & RBAC — Test Cases

**Domain covers:** system user management (`/admin/users`), roles/permissions CRUD (`/admin/roles`, Permissions Matrix tab), audit logs (Users page Tab 2), email template management (`/admin/email-templates`), organizations CRUD (`/admin/organizations`), and the clinician-type/room-type/language admin screens (`/admin/clinician-types`, `/admin/room-types`, `/admin/languages`).
**Grounded in:** `test-plan/admin-test-plan.md`, `test-result/admin-test-results.md`, `test-suggestion/admin-test-suggestion.md`, `context/frontend-contract-analysis.md`, `schema.prisma` (`Users`, `UserProfiles`, `UserRoles`, `Permissions`, `RolePermissions`, `AuditLogs`, `EmailTemplates`, `ClientOrganizations`, `ClinicianTypeModel`, `RoomTypeModel`, `Languages`), and direct inspection of `frontend/src/pages/admin/*` as they exist today.
**Key schema/contract facts driving these cases:**
- `UserProfiles.role_id` is a single required FK to `UserRoles` — the frontend (`users/form.jsx`'s `role_ids` multi-select, `users/index.jsx`'s multi-chip role rendering) treats roles as a list. This mismatch must be resolved by the backend contract (Backend/API section below forces the resolution either way).
- `UserRoles` has no `code` column, yet the frontend keys UI styling/lookup off `role.code` (`system_admin`, `clinic_manager`, `clinician`, `receptionist`, `patient`).
- `EmailTemplates` has no `variables` column, yet the UI fully supports a `{{variable}}` chip reference list.
- `Languages` has no `is_default` column, yet the UI enforces "cannot deactivate/delete the default language."
- `ClientOrganizations.address` is a flat nullable `String`, while CLAUDE.md mandates the India address shape `{line1, line2, city, state, pincode, country}` (already modeled correctly on `Patients.address_structured`) — the current `Organizations.jsx` form instead has Western-style Address Line 1/2/City/**Postal Code**/Country fields matching neither model precisely.
- Every admin CRUD sub-page defines its own inline `MOCK_*` fallback array, independent of `frontend/src/mocks/store.js` — there is no shared seed ground truth for RBAC data.

---

## 1. Unit Test Cases

### TC-ADMIN-UNIT-001 — Permission check resolves via the join table, not a denormalized list
- **Priority:** Critical
- **Preconditions:** A role `clinic_manager` has `RolePermissions` rows granting `UPDATE` on resource `Appointments` but not `DELETE`.
- **Steps:** Call `userHasPermission(user, 'Appointments', 'DELETE')` for a user whose sole role is `clinic_manager`.
- **Expected Result:** Returns `false`. The check must resolve the permission live through `RolePermissions`/`Permissions`, never from a cached/denormalized field on the user or role — this is the backing logic for the Permissions Matrix tab.

### TC-ADMIN-UNIT-002 — Duplicate role name rejected case-insensitively
- **Priority:** High
- **Preconditions:** A role named `"Manager"` exists.
- **Steps:** Call `createRole({name: "manager"})` (lowercase) and `createRole({name: "MANAGER "})` (trailing space).
- **Expected Result:** Both rejected with a validation error before any insert — `UserRoles.name` is `@unique` at the DB level, but the service layer must normalize (trim + case-fold) before relying on the DB constraint, since Postgres unique constraints are case-sensitive by default.

### TC-ADMIN-UNIT-003 — Deleting a role in use is blocked at the service layer, not just warned
- **Priority:** Critical
- **Preconditions:** Role `receptionist` has at least one `UserProfiles` row with `role_id` pointing to it.
- **Steps:** Call `deleteRole(receptionistId)`.
- **Expected Result:** Throws a domain error (e.g. `ROLE_IN_USE`) and performs no delete. This is the real enforcement point the current frontend lacks — `Roles.jsx`'s delete-confirm dialog only shows a soft warning ("Users assigned to it may lose access... This cannot be undone") with no actual block, so the guarantee must live here.

### TC-ADMIN-UNIT-004 — Email template variable extractor parses `{{var}}` tokens only
- **Priority:** Medium
- **Steps:** Call `extractTemplateVariables("Hi {{patient_name}}, your {{clinician_name}} visit on {date} is at {{ time }}.")`.
- **Expected Result:** Returns `['patient_name', 'clinician_name', 'time']` — double-brace tokens only (single-brace `{date}` ignored), whitespace inside braces trimmed, order preserved, no duplicates. This closes the schema gap where `EmailTemplates` has no `variables` column — the reference list shown in the UI must be computed from `body`, not stored.

### TC-ADMIN-UNIT-005 — Audit log detail payload is always valid, parseable JSON
- **Priority:** High
- **Steps:** Call `writeAuditLog({userId, action: 'UPDATE', resource: 'User', resourceId, details: {field: 'role', from: undefined, to: 'clinic_manager'}})`.
- **Expected Result:** The persisted `details` field is `JSON.stringify`-able and re-parseable without error (`undefined` values stripped or coerced to `null`, never left as a literal `undefined` that breaks `JSON.stringify`). Guards the currently-unguarded `JSON.parse(log.details || '{}')` in the Audit Logs UI against ever receiving malformed data from the write path.

### TC-ADMIN-UNIT-006 — Audit log filters combine conjunctively (AND), not disjunctively
- **Priority:** High
- **Steps:** Build a query with `actionFilter: 'UPDATE'` and a date range of the last 24 hours, against a dataset containing an `UPDATE` from last week and a `CREATE` from an hour ago.
- **Expected Result:** Neither row is returned — both the action filter and the date range must match (AND), not either one (OR).

### TC-ADMIN-UNIT-007 — Permission-matrix save computes only the diff, not a full overwrite
- **Priority:** High
- **Preconditions:** Role `clinician` currently has `READ` on `Patients` only.
- **Steps:** In the matrix UI logic, toggle `UPDATE` on for `Patients` (leaving `READ` untouched) and call the save-diff calculator.
- **Expected Result:** The computed change set contains exactly one addition (`Patients:UPDATE`) — the existing `Patients:READ` grant is not resent/re-inserted, and no other role's permissions are touched. Prevents a full-table overwrite race if two admins edit the matrix concurrently.

### TC-ADMIN-UNIT-008 — Organization code/slug normalizer
- **Priority:** Medium
- **Steps:** Call `normalizeOrgCode("  Westside Health!! ")`.
- **Expected Result:** Returns `"westside-health"` — lowercased, non-alphanumeric characters replaced with a single hyphen, leading/trailing whitespace and hyphens trimmed. Matches the frontend's existing force-lowercase-on-input behavior in `Organizations.jsx` but adds the strip/collapse logic the client doesn't do.

### TC-ADMIN-UNIT-009 — Duplicate clinician-type/room-type name rejected case-insensitively
- **Priority:** Medium
- **Preconditions:** A `ClinicianTypeModel` row named `"Cardiologist"` exists.
- **Steps:** Call `createClinicianType({name: "cardiologist"})`.
- **Expected Result:** Rejected with a validation error — mirrors TC-ADMIN-UNIT-002's case-fold logic, applied identically to `RoomTypeModel` and `Languages` given all three share the same `name @unique` pattern.

### TC-ADMIN-UNIT-010 — Setting a new default language atomically clears the previous default
- **Priority:** High
- **Preconditions:** Language `en` has `is_default: true`; language `fr` has `is_default: false`.
- **Steps:** Call `setDefaultLanguage('fr')`.
- **Expected Result:** Within a single transaction, `fr.is_default` becomes `true` and `en.is_default` becomes `false` — never a transient state with two or zero defaults. Note: this test specifies intended logic for a schema field (`is_default`) that does not exist on `Languages` yet (`schema.prisma:689-698`) — the field must be added before this logic can be implemented; until then this test documents the contract the UI already assumes.

### TC-ADMIN-UNIT-011 — Effective role resolution uses the single `role_id` FK, not a client-supplied array
- **Priority:** Critical
- **Steps:** Call the resolver-layer role-resolution function with a mutation input containing `role_ids: ['role-a', 'role-b']` (the shape `users/form.jsx` currently sends) against a schema where `UserProfiles.role_id` accepts exactly one value.
- **Expected Result:** Either (a) the function deterministically rejects multi-element arrays with a clear `MULTIPLE_ROLES_NOT_SUPPORTED` error, or (b) if multi-role support is added via a join table, the function returns the full merged set — but it must NOT silently take `role_ids[0]` and drop the rest without signaling the truncation. This test forces an explicit decision on the open contract mismatch identified between `schema.prisma` and the frontend form.

### TC-ADMIN-UNIT-012 — Deactivating/deleting a user does not remove their historical audit trail
- **Priority:** Critical
- **Preconditions:** A user has 5 existing `AuditLogs` rows where they are the actor (`user_id`).
- **Steps:** Call `deactivateUser(userId)` then `softDeleteUser(userId)`.
- **Expected Result:** All 5 `AuditLogs` rows remain queryable and unchanged (schema uses `user_id String?` nullable, so even a hard-delete path must not cascade-delete audit rows) — a compliance requirement for a healthcare system, distinct from the generic soft-delete pattern used elsewhere.

### TC-ADMIN-UNIT-013 — Organization address validator enforces the India structured shape
- **Priority:** High
- **Steps:** Validate an organization payload with `address: {line1: "12 MG Road", line2: "", city: "Bengaluru", state: "Karnataka", pincode: "560001", country: "India"}` and a second payload using the legacy flat shape `{addressLine1, city, postalCode, country}` (no `state`/`pincode`).
- **Expected Result:** The first payload passes; the second is rejected for missing `state`/`pincode` — enforces CLAUDE.md's India address format uniformly, closing the gap where `Organizations.jsx`'s current form fields (Address Line 1/2, City, Postal Code, Country) match neither the flat `ClientOrganizations.address String?` column nor the structured India format used on `Patients.address_structured`.

### TC-ADMIN-UNIT-014 — Clone-from-role pre-fill copies the source role's exact grant set, not a subset
- **Priority:** Medium
- **Steps:** Compute the pre-filled permission-matrix state when cloning from a role that has 7 of 60 possible grants.
- **Expected Result:** All 7 (and only those 7) start checked — matches `admin/Roles.jsx`'s "Clone from existing role" dropdown (Zendesk-pattern, per `requirements/semble-competitive-gap-analysis-requirements.md` Part 1).

### TC-ADMIN-UNIT-015 — Empty-permission-grant save produces a warning, not a hard block
- **Priority:** Low
- **Steps:** Validate a role-save with zero permission checkboxes selected.
- **Expected Result:** Passes validation but flags a non-blocking warning — matches the build spec's guardrail ("a role can't be saved with zero permissions granted (empty-role warning, not a hard block — some roles legitimately start empty)").

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-ADMIN-API-001 — `users` query is scoped to the caller's tenant
- **Priority:** Critical
- **Preconditions:** Two `ClientOrganizations` exist, each with distinct `UserProfiles`.
- **Steps:** Log in as an admin belonging to Org 1, call `users`.
- **Expected Result:** Only Org 1's users are returned — no Org 2 user ever appears, regardless of pagination/search parameters. Mirrors TC-AUTH-API-010's tenant-isolation guarantee, applied specifically to the admin user-directory endpoint.

### TC-ADMIN-API-002 — `createUser` rejects a mismatched password confirmation
- **Priority:** Critical
- **Steps:** Call `createUser(input: {name, email, password: "Passw0rd!", password_confirmation: "Different1!"})`.
- **Expected Result:** Rejected with a field-level validation error. This must be enforced server-side since `frontend/src/pages/admin/users/form.jsx`'s `validate()` never checks the two fields match — the backend is the only real guard.

### TC-ADMIN-API-003 — `updateUser` role assignment matches the resolved single-role contract
- **Priority:** Critical
- **Steps:** Call `updateUser(id, input: {role_ids: ["clinician-role-id", "receptionist-role-id"]})` against the deployed schema (single `role_id` FK).
- **Expected Result:** Response/error shape matches whatever TC-ADMIN-UNIT-011 decided (explicit rejection or full multi-role support) — this API test is the integration-level proof that the decision was actually wired into the resolver, not just designed in isolation.

### TC-ADMIN-API-004 — `deleteRole` is blocked with a descriptive error when in use
- **Priority:** Critical
- **Preconditions:** Role `manager` has ≥1 assigned `UserProfiles`.
- **Steps:** Call `deleteRole(managerRoleId)`.
- **Expected Result:** GraphQL error with a machine-readable code (e.g. `ROLE_IN_USE`) and a human message including the affected user count — strictly stronger than the current UI's generic warning-only delete confirm.

### TC-ADMIN-API-005 — `roles` query returns a `code` field
- **Priority:** High
- **Steps:** Call `roles { id name code description is_active }`.
- **Expected Result:** `code` is present and non-null for every seeded role (e.g. `system_admin`, `clinic_manager`, `clinician`, `receptionist`, `patient`) — requires adding a `code` column to `UserRoles` (currently absent from `schema.prisma`), since the frontend's `ROLE_STYLES` lookup and search-by-code behavior (`users/index.jsx`'s `filteredUsers` search matching `roles[].code`) depend on it existing.

### TC-ADMIN-API-006 — `auditLogs` query excludes soft-deleted rows by default and sorts newest-first
- **Priority:** High
- **Preconditions:** 3 audit log rows exist, one with `is_deleted: true`.
- **Steps:** Call `auditLogs(limit: 10)` with no filters.
- **Expected Result:** Returns exactly the 2 non-deleted rows, ordered by `created_at` descending. A separate admin-only flag (e.g. `includeDeleted: true`) must be required to surface the soft-deleted row — verifies the compliance-relevant `is_deleted` column is actually respected.

### TC-ADMIN-API-007 — `auditLogs` action filter supports `READ`
- **Priority:** Medium
- **Steps:** Seed an audit log row with `action: "READ"`, then call `auditLogs(action: "READ")`.
- **Expected Result:** The row is returned. This is an API-completeness test independent of the frontend gap noted in TC-ADMIN-FE-007 (the current Action filter dropdown has no "Read" option) — the backend contract shouldn't be artificially restricted just because today's UI doesn't expose it yet.

### TC-ADMIN-API-008 — Mutations automatically emit an audit log entry
- **Priority:** Critical
- **Steps:** Call `updateUser(id, {isActive: false})` as an admin, then query `auditLogs(resource: "User", resourceId: id)`.
- **Expected Result:** A new row exists with `action: "UPDATE"`, `resource: "User"`, `resource_id` matching, `user_id` set to the acting admin's id, and `details` capturing the changed field(s) — proves audit logging is a server-side side effect of the mutation itself, not something the client has to separately request.

### TC-ADMIN-API-009 — `updateEmailTemplate` rejects variables not in that template's allowed set
- **Priority:** Medium
- **Preconditions:** The `appointment_confirmation` template type's allowed variable set is `{patient_name, clinician_name, date, time, clinic_name}`.
- **Steps:** Call `updateEmailTemplate(id, input: {body: "Hi {{patient_name}}, your invoice total is {{invoice_total}}."})`.
- **Expected Result:** Rejected — `invoice_total` isn't a valid variable for `appointment_confirmation`, preventing a template from referencing data that will never be interpolated at send time (a real risk given `EmailTemplates` has no `variables` column to validate against structurally).

### TC-ADMIN-API-010 — `createOrganization` rejects a duplicate `code`
- **Priority:** High
- **Preconditions:** An organization with `code: "westside"` exists.
- **Steps:** Call `createOrganization(input: {code: "westside", ...})`.
- **Expected Result:** Rejected with a field-level error referencing `code` — enforces `ClientOrganizations.code @unique`.

### TC-ADMIN-API-011 — `createOrganization` requires the India address shape
- **Priority:** High
- **Steps:** Call `createOrganization` with an `address` input missing `state` and `pincode`.
- **Expected Result:** Rejected — ties the API contract to TC-ADMIN-UNIT-013's validator, and forces `Organizations.jsx`'s current Western-style form (no State/Pincode fields at all) to be updated before this mutation can be called successfully from the UI.

### TC-ADMIN-API-012 — Admin-only RBAC guard on every admin mutation
- **Priority:** Critical
- **Steps:** Log in as `manager`, `clinician`, and `patient` roles in turn; attempt `createUser`, `updateRole`, `deleteRole`, `updateEmailTemplate`, and `createOrganization`.
- **Expected Result:** All 15 combinations (3 roles × 5 mutations) are rejected with `FORBIDDEN`, before any database write — verify via a follow-up count query that no row was inserted/changed for any attempt.

### TC-ADMIN-API-013 — Clinician type / room type / language creation rejects case-insensitive duplicates
- **Priority:** Medium
- **Preconditions:** `ClinicianTypeModel` has `"Cardiologist"`.
- **Steps:** Call `createClinicianType({name: "CARDIOLOGIST"})`, `createRoomType` and `createLanguage` with analogous case-variant duplicates of existing rows.
- **Expected Result:** All three rejected with a validation error, confirming the unique-name business rule holds at the API layer for all three entity types identically.

### TC-ADMIN-API-015 — `createRole` scopes uniqueness to `(client_org_id, name)`, not name alone
- **Priority:** Critical
- **STATUS: Schema already migrated** — `UserRoles` was extended with `client_org_id String?`/`is_system Boolean` and its unique constraint changed from `name @unique` to `@@unique([client_org_id, name], name: "org_role_name")` (`backend/prisma/migrations/20260817021500_add_role_org_scoping/`), specifically so two different tenants can each have their own custom role named e.g. `"front_desk_lead"` without colliding. **No resolver exists yet to exercise this** — Phase 4+ is where `createRole`/`updateRole` mutations actually get built; this case is the concrete acceptance test for that resolver once written.
- **Preconditions:** Org 1 and Org 2 both attempt to create a custom role named `"front_desk_lead"`.
- **Steps:** As Org 1's admin, `createRole(name: "front_desk_lead", ...)`. As Org 2's admin, `createRole(name: "front_desk_lead", ...)`.
- **Expected Result:** Both succeed — the unique constraint is per-org, not global. A third attempt by Org 1's admin to create a second `"front_desk_lead"` (same org) is rejected.

### TC-ADMIN-API-016 — System roles (`is_system: true`) cannot be edited or deleted via `updateRole`/`deleteRole`
- **Priority:** Critical
- **Preconditions:** The 6 seeded system roles (`admin`, `super_admin`, `manager`, `clinician`, `staff`, `patient` — `backend/prisma/seed.ts`) all have `is_system: true` and `client_org_id: null`.
- **Steps:** As a super_admin, attempt `updateRole(id: <admin-role-id>, name: "renamed_admin")` and `deleteRole(id: <admin-role-id>)`.
- **Expected Result:** Both rejected with a clear "system roles cannot be modified" error — the frontend's `admin/Roles.jsx` already renders system roles read-only with a lock icon/tooltip client-side; the backend must enforce the same rule server-side, since a client-only guard is bypassable by calling the mutation directly (same principle as `TC-PAT-API-020`'s letter-approval gate).

### TC-ADMIN-API-018 — `createRoomType`/`createClinicianType` return `{success, userErrors}`, never a bare entity
- **Priority:** High
- **STATUS: Confirmed live** — `admin/RoomTypes.jsx`/`admin/ClinicianTypes.jsx` (the only real consumers) call these mutations expecting `{success: Boolean!, userErrors: [UserError!]!}` back, with distinctly-named `CreateRoomTypeInput`/`CreateClinicianTypeInput` GraphQL input types — not the entity directly. This was actually broken (wrong input type name + wrong return shape) until fixed live during a browser-testing pass on 2026-08-17; see `test-result/phase4-backend-integration-test-results.md` `BUG-P4-001`.
- **Steps:** Call `createRoomType(input: {name: "Therapy Room"})`, inspect the response shape.
- **Expected Result:** `{success: true, userErrors: []}` — no `id`/`name`/etc. fields requestable on the mutation response itself.

### TC-ADMIN-API-019 — `deleteRoomType`/`deleteClinicianType` are hard deletes, not soft
- **Priority:** Medium
- **Steps:** Call `deleteRoomType(id)` on an existing row, then query `roomTypes`.
- **Expected Result:** The row is gone entirely, not flagged `is_deleted` — deliberately different from most other domains in this schema (`TC-PAT-API-009`'s soft-delete pattern), because `RoomTypeModel`/`ClinicianTypeModel` carry no `is_deleted` column and nothing references them via a real foreign key (`Rooms.room_type`/`Clinicians.clinician_type` are plain strings), so there's no historical-integrity reason to keep a deleted lookup row around.

### TC-ADMIN-API-017 — A tenant admin cannot see or clone another tenant's custom roles
- **Priority:** Critical
- **Preconditions:** Org 1 has a custom role `"billing_only"` (`client_org_id: <org1>`); Org 2 has no such role.
- **Steps:** As Org 2's admin, call `roles` (list query) and separately attempt `createRole` with a "clone from" reference to Org 1's `"billing_only"` role ID.
- **Expected Result:** Org 1's custom role never appears in Org 2's `roles` list; the clone attempt is rejected (NOT_FOUND, not "permission denied," to avoid confirming the role's existence to an unrelated org) — system roles (`client_org_id: null`) remain visible/clonable by every org, only tenant-custom roles are isolated.

### TC-ADMIN-API-014 — Setting a language default is atomic across the previous default
- **Priority:** High
- **Preconditions:** `en` is currently the default language.
- **Steps:** Call `updateLanguage(frId, {is_default: true})`, then immediately query `languages`.
- **Expected Result:** Exactly one language (`fr`) has `is_default: true`; `en` now has `is_default: false` — proves TC-ADMIN-UNIT-010's atomicity requirement holds through the actual mutation, not just in isolated service logic.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-ADMIN-E2E-001 — Admin creates a user who can immediately log in
- **Priority:** Critical
- **Steps:** As an admin, complete "New User" (`/admin/users/new`) with a valid name/email/password/role, save. Log out. Log in as the newly created user.
- **Expected Result:** Login succeeds and the user lands on the correct role-based dashboard — proves the create-user flow is a real round trip, not the offline "created (mock mode)" success-looking snackbar the frontend currently shows on any network error.

### TC-ADMIN-E2E-002 — Role change via Permissions Matrix takes effect on the affected user's next session
- **Priority:** Critical
- **Preconditions:** User X has role `receptionist` (no `Patients:DELETE` permission).
- **Steps:** As admin, open Permissions Matrix, grant `Patients:DELETE` to `receptionist`, save. Log in as User X, attempt to delete a patient.
- **Expected Result:** The delete succeeds post-grant where it would have been `FORBIDDEN` before — proves the matrix UI is wired to a real, effective permission check, not just a display.

### TC-ADMIN-E2E-003 — Permissions Matrix changes persist across reload
- **Priority:** High
- **Steps:** Toggle several checkboxes in the Permissions Matrix tab, click "Save Changes", reload the page, re-open the same role's matrix.
- **Expected Result:** The toggled state is still shown — closes the current mock-mode gap where "Save Changes" appears to succeed but the change never actually persists (fallback checkboxes are uncontrolled and not fed into `localSelections`).

### TC-ADMIN-E2E-004 — Deleting a role in use is blocked end-to-end, not just warned
- **Priority:** Critical
- **Preconditions:** Role `clinic_manager` is assigned to at least one active user.
- **Steps:** As admin, attempt to delete `clinic_manager` from `/admin/roles`.
- **Expected Result:** The UI shows a real blocking error naming the affected user count (per TC-ADMIN-API-004), not the current soft "This cannot be undone" warning that still allows the delete to proceed.

### TC-ADMIN-E2E-005 — Edited email template content reaches a real outbound email
- **Priority:** High
- **Steps:** As admin, edit the `appointment_confirmation` template's subject/body with a distinctive test string, save. Book an appointment as a patient that triggers a confirmation email. Retrieve the email from a test SMS/email sink.
- **Expected Result:** The received email contains the edited subject/body with variables correctly interpolated (e.g. `{{patient_name}}` replaced with the real patient's name) — proves the full pipeline, not just that the admin form saves.

### TC-ADMIN-E2E-006 — New organization's India address is visible correctly to its own manager
- **Priority:** Medium
- **Steps:** As admin, create an organization supplying a full India address (state + 6-digit pincode). Invite/assign a manager user to that organization. Log in as that manager, navigate to Settings → Clinic.
- **Expected Result:** The state and pincode entered by the admin appear correctly on the manager's own clinic settings view — validates the address round-trips through the structured shape end-to-end, not just at creation time.

### TC-ADMIN-E2E-007 — An admin action produces an audit log entry visible without a manual refresh
- **Priority:** High
- **Steps:** With the Audit Logs tab open in one browser tab, in another tab (or after) update a user's role as admin. Return to the Audit Logs tab.
- **Expected Result:** The new entry appears (via live subscription or on tab-focus refetch) reflecting the role change, within a reasonable time window — without the tester manually reloading the page.

### TC-ADMIN-E2E-008 — A non-admin role is blocked from every `/admin/*` route end-to-end
- **Priority:** Critical
- **Steps:** Log in as `patient`, attempt direct navigation to `/admin/users`, `/admin/roles`, `/admin/organizations`, `/admin/email-templates`, `/admin/clinician-types`, `/admin/room-types`, `/admin/languages`.
- **Expected Result:** All 7 routes render `Forbidden403` (frontend `RoleGuard`) AND any attempted underlying query returns `FORBIDDEN` (backend guard) — both layers must independently reject, per CLAUDE.md's note that the backend is the only real line of defense.

### TC-ADMIN-E2E-009 — Deactivating a user ends their active session immediately
- **Priority:** Critical
- **Steps:** User X is logged in with an active session in one browser context. As admin (different context), deactivate User X. Attempt an authenticated action as User X in the original context.
- **Expected Result:** The next request from User X is rejected (401/session invalidated) — deactivation must revoke access immediately, not just flip `isActive` for future logins while an existing JWT/session remains valid until natural expiry.

### TC-ADMIN-E2E-010 — Duplicate clinician-type/room-type/language name shows inline validation, no duplicate row created
- **Priority:** Medium
- **Steps:** As admin, attempt to create a `ClinicianType` named `"Cardiologist"` when one already exists (repeat for Room Type and Language with their own existing names).
- **Expected Result:** All three show an inline field error on submit; the underlying list still contains exactly one row with that name after the attempt.

### TC-ADMIN-E2E-011 — Setting a new default language frees the old default for deactivation
- **Priority:** Medium
- **Preconditions:** `en` is the current default; its Deactivate switch and Delete button are disabled.
- **Steps:** As admin, set `fr` as the new default. Return to `en`'s row.
- **Expected Result:** `en`'s Deactivate switch and Delete button are now enabled (no longer protected as default) — verifies the atomic default-swap from TC-ADMIN-API-014 is reflected live in the UI's per-row disabled state.

### TC-ADMIN-E2E-012 — `/admin/room-types` loads without a JavaScript crash
- **Priority:** Critical
- **Preconditions:** Grounded in a real, currently-committed regression: `frontend/src/pages/admin/RoomTypes.jsx` references an undeclared `defaultForm` variable in `useState(defaultForm)` — every sibling page (`ClinicianTypes.jsx`, `Languages.jsx`) declares this constant, `RoomTypes.jsx` does not.
- **Steps:** Log in as admin, navigate to `/admin/room-types`.
- **Expected Result:** The page renders the Room Types table/list and an "Add Room Type" form with blank fields — no uncaught `ReferenceError: defaultForm is not defined` and no blank/crashed page. This test currently fails against the committed source and must be fixed before it can pass.

### TC-ADMIN-E2E-013 — Searching Users by role name/code returns only matches, persisted across pagination
- **Priority:** Medium
- **Steps:** In the Users Directory, search `"clinician"`. Note the result count. Navigate to page 2 if available.
- **Expected Result:** Only users whose name/email/role name/role code contains "clinician" (case-insensitive) appear on every page; the search term is not lost on pagination.

### TC-ADMIN-E2E-014 — Creating a custom role, cloning permissions from an existing role, then assigning it to a user works end-to-end
- **Priority:** High
- **Steps:** As admin, create a new role, use "Clone from existing role" to pre-fill from `receptionist`, adjust a couple of grants, save. Assign the new role to a test user. Log in as that user and attempt one newly-granted and one newly-revoked action.
- **Expected Result:** The newly-granted action succeeds, the revoked one is `FORBIDDEN` — real-backend acceptance bar for `admin/Roles.jsx`'s Feature #1 build, now that `UserRoles.client_org_id` scoping exists in the schema (`TC-ADMIN-API-015`).

### TC-ADMIN-E2E-015 — Attempting to edit or delete a system role shows a clear, non-generic explanation
- **Priority:** Medium
- **Steps:** As admin, open the `admin` system role and attempt to change its name or click delete.
- **Expected Result:** Fields render read-only with a lock icon/tooltip explaining why (client-side, already built); if the mutation is somehow still triggered, the server rejects it with the same `TC-ADMIN-API-016` error, surfaced as a real error toast, not a silent no-op.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store — these should pass (or, where noted, currently and knowingly fail) today, independent of backend readiness.*

### TC-ADMIN-FE-001 — `/admin/room-types` currently crashes on load
- **Priority:** Critical
- **STATUS: FIXED, confirmed via live browser test** — `RoomTypes.jsx` now declares `defaultForm` correctly (`const defaultForm = { name: '', description: '', is_active: true }`); the original `ReferenceError` no longer reproduces. Live-verified 2026-08-17 via Playwright MCP against the running stack: page loads, and full create→delete cycle works (see `test-result/phase4-backend-integration-test-results.md` TC-P4-REF-02/03/04) — a genuinely different, deeper bug was found in the same pass (the mutations' GraphQL contract didn't match the backend at all, `BUG-P4-001`), now also fixed. Keeping this case as a **regression guard**, not an open bug.
- **Preconditions:** Originally grounded in direct source inspection: `RoomTypes.jsx` line 33 (`useState(defaultForm)`) and line 60 (`reset()`) referenced `defaultForm`, which was undeclared — unlike `ClinicianTypes.jsx`/`Languages.jsx`, which both declared it.
- **Steps:** Navigate to `/admin/room-types`.
- **Expected Result:** Page renders (table + "Add Room Type" button), no `ReferenceError`, no blank page.

### TC-ADMIN-FE-002 — "Permissions Defined" stat card is hardcoded
- **Priority:** Medium
- **Preconditions:** `frontend/src/pages/admin/users/index.jsx:260` hardcodes this stat card's value to the literal string `"24"`.
- **Steps:** Render the Users page with a `permissions` dataset of a different length (e.g. 3 permissions) via mock data.
- **Expected Result (current behavior):** The card still displays `"24"`, never reflecting the actual permission count — flag as a known display bug.

### TC-ADMIN-FE-003 — Users list footer is self-referential and pagination has no bounds guard
- **Priority:** Medium
- **Preconditions:** Mock mode has 4 users; `TablePagination` is configured with `count={-1}` and a single page-size option (`rowsPerPageOptions={[8]}`).
- **Steps:** Observe the footer text with the default 4 mock users, then click to page 2 of the pagination control.
- **Expected Result (current behavior):** Footer always reads "Showing {N} of {N} users" (never a true "X of Y" with Y > X), and navigating to page 2 renders an empty table body with no "no more results" messaging or disabled next-page control.

### TC-ADMIN-FE-004 — Deactivating a user requires no confirmation
- **Priority:** Medium
- **Steps:** Click the active/inactive Switch (or the Block icon) next to any user row in the Users Directory.
- **Expected Result (current behavior):** The user is deactivated on a single click via `handleToggleUserStatus`, with no `ConfirmDialog` — inconsistent with Roles/Languages/ClinicianTypes/RoomTypes, which all require a confirm step before their equivalent destructive action (delete). Flag as a UX inconsistency worth a fix.

### TC-ADMIN-FE-005 — Permissions Matrix "Save Changes" looks successful but does not persist in mock mode
- **Priority:** High
- **STATUS: FIXED** — `admin/Roles.jsx` was fully rewritten (Semble gap-analysis Feature #1, Phase 1) to read/write through `mocks/store.js`'s `createRole`/`updateRole`, with real persistence, and was live-browser-verified (created a role, checked permissions, confirmed persistence across reload, confirmed responsive behavior at 375/768/1024/1440px) per `context/phase1-frontend-missing-features-implementation-plan.md`. Keeping this case as a **regression guard**, not an open bug — re-run it whenever `Roles.jsx` or `store.js`'s role functions change.
- **Preconditions:** Any mode (mock store, since no real backend exists yet for this domain).
- **Steps:** Toggle several checkboxes in the `PermissionMatrix`, click "Save Changes", then reload the page and re-open the same role.
- **Expected Result:** The toggled state is still shown after reload — persistence is real, not just silently-lost as it was before the rewrite.

### TC-ADMIN-FE-006 — Audit log row expansion is not defensive against malformed JSON
- **Priority:** Medium
- **Preconditions:** An audit log entry's `details` field is (hypothetically) not valid JSON.
- **Steps:** Render the Audit Logs tab with such an entry and expand its row.
- **Expected Result (current behavior):** `JSON.parse(log.details || '{}')` is unguarded — an invalid JSON string throws uncaught inside render rather than showing a graceful fallback. Flag as a defensive-coding gap to close once real backend data (which should always be valid JSON per the `Json` column type) is wired in, so a malformed/legacy row can never take down the whole tab.

### TC-ADMIN-FE-007 — Audit log Action filter has no "Read" option
- **Priority:** Low
- **Preconditions:** `ACTION_STYLES` in `users/index.jsx` defines a style for `READ` (used as the fallback for unrecognized actions), but the Action filter dropdown options are only "All Actions", "Create", "Update", "Delete".
- **Steps:** Open the Action filter dropdown on the Audit Logs tab.
- **Expected Result (current behavior):** No "Read" option exists — a user can never isolate READ-action entries via this filter even though the styling/data model supports them.

### TC-ADMIN-FE-008 — Audit log search box and date pickers are decorative
- **Priority:** Medium
- **Steps:** Type into the Audit Logs search box; select From/To dates in the date range pickers.
- **Expected Result (current behavior):** Neither control has any effect on the displayed rows — only the Action dropdown is wired to actual filter state. Flag as an incomplete feature, not a crash risk.

### TC-ADMIN-FE-009 — Deleting an in-use role shows only a generic soft warning
- **Priority:** High
- **Steps:** Attempt to delete a role that is currently assigned to at least one mock user.
- **Expected Result (current behavior):** The confirm dialog shows the generic copy "Delete this role? Users assigned to it may lose access. This cannot be undone." with no count of affected users and no actual block — the delete proceeds if confirmed. This is the frontend-only gap that TC-ADMIN-API-004/TC-ADMIN-E2E-004 must close once a backend exists.

### TC-ADMIN-FE-010 — Email Template "Preview" does not interpolate variables
- **Priority:** Medium
- **Steps:** Open the Preview dialog for the `appointment_confirmation` template.
- **Expected Result (current behavior):** Subject and Body render with literal `{{patient_name}}`-style tokens still visible, unsubstituted with any sample data — the dialog is a raw-text viewer, not a real interpolated preview, despite the "Preview" label implying otherwise.

### TC-ADMIN-FE-011 — Create-user form accepts mismatched password confirmation
- **Priority:** High
- **Preconditions:** `frontend/src/pages/admin/users/form.jsx`'s `validate()` (lines ~49-55) checks `name`/`email`/`password` presence but never compares `password` to `password_confirmation`.
- **Steps:** Fill "New User" with `password: "Passw0rd!"` and `password_confirmation: "Different1!"`, submit.
- **Expected Result (current behavior):** The form submits without any inline mismatch error — the only guard against this exists (or must exist) server-side per TC-ADMIN-API-002.

### TC-ADMIN-FE-012 — Editing a mock user shows an empty Roles field inconsistent with the Users list
- **Priority:** Low
- **Preconditions:** `MOCK_USER_STORE` in `form.jsx` (lines 140-145) seeds Marcus Wright with `role_ids: []`, while `users/index.jsx`'s separate mock list shows him with role "Receptionist".
- **Steps:** In offline/mock mode, open `/admin/users/2/edit` (Marcus Wright).
- **Expected Result (current behavior):** The Roles multi-select renders empty, contradicting the "Receptionist" role shown for the same user in the Users Directory table — a cross-mock-source data inconsistency, not a real backend bug, but worth flagging so it isn't mistaken for one during manual QA.

### TC-ADMIN-FE-013 — Organizations search fires a request on every keystroke, no debounce
- **Priority:** Medium
- **Steps:** In `/admin/organizations`, type a 6-character search term quickly.
- **Expected Result (current behavior):** A fresh `client.query` fires on every single keystroke (no debounce), each subject to the global 2-second Apollo abort timeout — rapid typing can produce a pile of overlapping in-flight/timing-out requests. Flag as a performance issue to fix (add debounce) rather than a correctness bug.

### TC-ADMIN-FE-014 — Deactivating the default language silently no-ops
- **Priority:** Medium
- **Preconditions:** `Languages.jsx`'s `handleToggle` returns early with no message when `item.is_default && item.is_active`; only a tooltip ("Cannot deactivate the default language") explains why, with no toast/snackbar on the failed click itself.
- **Steps:** Click the active/inactive Switch for the current default language (e.g. English).
- **Expected Result (current behavior):** The switch visually does not move and no confirmation/error toast appears — a user unaware of the tooltip has no feedback that their click did anything at all. Flag as a UX gap (should surface an explicit inline message, not a silent no-op).

### TC-ADMIN-FE-015 — Creating a user offline shows a success-looking message despite no persistence
- **Priority:** High
- **Preconditions:** `form.jsx`'s create-user submit handler catches `err.networkError` specifically and shows a snackbar reading `User "${form.name}" created (mock mode — backend offline)` before navigating to `/admin/users` — no user was actually created.
- **Steps:** With the backend unreachable, submit "New User" with valid data.
- **Expected Result (current behavior):** A green-styled success snackbar appears and the page navigates away as if the operation succeeded, even though nothing was persisted — this is intentional mock-mode UX today, but must be clearly distinguished from a real success once a backend exists (see TC-ADMIN-E2E-001, which is the real-backend counterpart that must show an actual persisted, loginable account).

### Custom Roles & Access Groups (`admin/Roles.jsx` — rebuilt this increment, Semble gap-analysis Feature #1)

### TC-ADMIN-FE-016 — Every permission checkbox has a specific, unambiguous `aria-label`
- **Priority:** Medium
- **Steps:** Inspect the accessible name of a checkbox in the `PermissionMatrix` (e.g. the "Appointments" row × "Create" column cell) via a screen reader or the accessibility tree.
- **Expected Result:** Reads as `"Grant Appointments — Create"` (or equivalent, naming both resource and action) — never a bare "checkbox" with no label, per `context/frontend-hard-rules.md` Rule 3 (accessibility) and this feature's own build spec.

### TC-ADMIN-FE-017 — The permission matrix scrolls horizontally on narrow viewports instead of clipping
- **Priority:** Medium
- **Steps:** Load `/admin/roles` at 375px width, open a role's permission matrix.
- **Expected Result:** The matrix is horizontally scrollable within its own container (no page-level horizontal scroll, no clipped/cut-off columns) — verified via actual Playwright screenshots at 375/768/1024/1440px per `context/frontend-hard-rules.md` Rule 1.4, not assumed.

### TC-ADMIN-FE-018 — `AdminLayout`'s mobile navigation actually works (regression guard for a real bug found this session)
- **Priority:** High
- **STATUS:** Regression guard for a genuine pre-existing bug found and fixed while building Feature #1 — `AdminLayout.jsx` was a fixed 224px permanent `Drawer` with zero mobile responsiveness before this session; a mobile temporary `Drawer` + toggle `IconButton` were added.
- **Steps:** Load any `/admin/*` page at 375px width.
- **Expected Result:** The admin sub-navigation is reachable via a visible toggle (not permanently hidden or permanently occupying the viewport width) — this exact case is why Hard Rule 1.4's "verify responsiveness live, don't assume" exists; this bug would not have been caught by code review alone.

### TC-ADMIN-FE-019 — Saving a role with zero permissions shows a warning but does not block the save
- **Priority:** Low
- **Steps:** Create a new role, name it, grant no permissions, click Save.
- **Expected Result:** A non-blocking warning is shown (e.g. "This role has no permissions granted") and the save still succeeds — matches the build spec's deliberate choice not to hard-block, since some roles legitimately start empty pending later configuration.
