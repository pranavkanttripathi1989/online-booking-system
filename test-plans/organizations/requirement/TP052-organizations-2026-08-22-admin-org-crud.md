---
id: TP052
type: test-plan
feature: organizations
created: 2026-08-22
updated: 2026-08-22
status: approved
parent: REQ013
related: [TR051]
---

# Organizations — admin tenant CRUD — Test Plan

**`REQ013` Phase B** — closes one of Finding 1's real documentation-coverage gaps: `admin/Organizations.jsx` (the core Client-Organization CRUD backing every other tenant-scoped page in the app) had no dedicated test-plan anywhere in the five-root doc tree, only two passing mentions in the mock-era `admin-test-plan.md`.

**Route:** `/admin/organizations`
**Files:** `frontend/src/pages/admin/Organizations.jsx`
**Access:** `admin`/`super_admin` only — deliberately excludes `manager` (a clinic manager runs one tenant, they don't create tenants; live-confirmed a `manager`-role token gets a real 403 `ForbiddenException` from `organizationsPaginated`).
**GraphQL:** `organizationsPaginated`, `createOrganization`, `updateOrganization`, `deleteOrganization` (`backend/src/organizations`). Response convention: `{success, userErrors, organization?}`, matching the file's own `if (!r?.createOrganization?.success) throw ...` handling.
**Real seeded data:** exactly 2 real tenants (City Heart Clinic Group, Westside Health Group) as of this writing — not a fixed/stable count long-term, since this page itself can create more.

## Test cases

### TC-ORG-001 — List loads with real tenants
**Steps:** Log in as Admin. Navigate to `/admin/organizations`.
**Expected:** Real `organizationsPaginated` data renders (name, code, contact email, structured India address, active/inactive). KPI header shows the real total/active counts.

---

### TC-ORG-002 — Search
**Steps:** Type a real org's name, code, or contact email substring into the search field (debounced 300ms, `handleSearchChange`).
**Expected:** `client.query()` re-fires with the real search term; only matching real orgs remain.

---

### TC-ORG-003 — Create a new organization
**Steps:** Click "Add Organization", fill Name/Code/Contact Email (Code and Contact Email required — `IsNotEmpty`/`IsEmail`), submit.
**Expected:** Real `createOrganization` mutation fires; on `success`, "Organization created." snackbar, list reloads with the new real org visible. Live-verified via direct GraphQL call this pass: `createOrganization` with a real input returns `{success: true, organization: {id, code}}`, and the new row appears in a follow-up `organizationsPaginated` query.

---

### TC-ORG-004 — Code normalization
**Steps:** Enter a code with mixed case, spaces, and punctuation (e.g. `"E2E Test Org!!"`).
**Expected:** The real backend (`normalizeOrgCode`) lowercases it, collapses non-alphanumeric runs to single hyphens, and trims leading/trailing hyphens before storing (e.g. `"E2E Test Org!!"` → `"e2e-test-org"`) — live-verified this pass via direct GraphQL call.

---

### TC-ORG-005 — Duplicate code rejected
**Steps:** Attempt to create (or rename an existing org to) a code that another real, non-deleted org already uses.
**Expected:** Real `ConflictException` surfaced as `{success: false, userErrors: [{message: 'Organization code "<code>" is already in use'}]}` — not a raw Prisma P2002 error. Live-verified this pass: creating a second org with an already-used normalized code returned exactly this message.

---

### TC-ORG-006 — Update an organization
**Steps:** Open Edit on a real org, change Name/Address/Active status, submit.
**Expected:** Real `updateOrganization` fires; on success, "Organization updated." snackbar, the change is really persisted. Changing the code to one already in use by a *different* org is rejected the same way as TC-ORG-005 (`assertCodeAvailable(code, excludeId)` — excludes the org's own current row from the collision check, so keeping the same code on update never falsely conflicts with itself). Live-verified this pass via direct GraphQL call (real update succeeded; the org's `is_active` flipped to `false` and was confirmed via a follow-up query).

---

### TC-ORG-007 — Delete (soft) an organization
**Steps:** Click Delete on a real org, confirm via the `ConfirmDialog`.
**Expected:** Real `deleteOrganization` fires; the org is soft-deleted (`is_deleted: true, is_active: false` — the row still exists in the database, just excluded from `organizationsPaginated`'s `is_deleted: false` filter and every other tenant-scoped query). Live-verified this pass: after delete, the real `organizationsPaginated` total dropped back to the pre-create baseline.

---

### TC-ORG-008 — Structured India address
**Steps:** Fill the address fields (line1/line2/city/state/pincode/country) on create or edit.
**Expected:** Persisted and returned as `address_structured` → `address` (a real structured object, matching `backend/src/organizations/dto/organization-address.input.ts`), not the older flat Western shape `Clinics.address/city/postcode` still uses elsewhere in the schema (a documented, separate, not-yet-reconciled inconsistency — see `CLAUDE.md`'s India-specific decisions section).

---

### TC-ORG-009 — Real query/mutation failure falls back to visible mock data
**Steps:** Simulate a genuine network failure (backend unreachable) while on `/admin/organizations`.
**Expected:** `client.query()`'s `catch` block sets `MOCK_ORGS` (3 named fake orgs) so the page stays usable — this fallback is inherently gated correctly by `try/catch` semantics (a resolved-but-empty `data.organizationsPaginated.data: []` never enters the `catch` block at all, so this file does **not** have the "empty-result-fakes-as-mock" bug class found and fixed elsewhere this session in `appointments/index.jsx`/`calendar/index.jsx`/`clinicians/index.jsx`). Not re-verified live this pass (would require actually taking the backend offline mid-session); confirmed correct by reading the `try/catch` structure itself, which makes the distinction structurally, not by a runtime check that could be wrong.

---

### TC-ORG-010 — Non-admin/super_admin role rejected
**Steps:** Attempt `organizationsPaginated` (or any mutation) as a `manager`-role caller.
**Expected:** Real `403 ForbiddenException` — `@Auth('admin', 'super_admin')` on every operation in this resolver, deliberately excluding `manager`. Live-verified this pass via a direct GraphQL call with a real manager token.

---

## Edge cases

| # | Edge case | Expected |
|---|-----------|----------|
| E1 | Contact email missing or malformed | Real `IsEmail` validation rejects it before it reaches the service layer |
| E2 | Code collision on update, excluding self | `excludeId` in `assertCodeAvailable` means keeping an org's own current code on update never falsely conflicts |
| E3 | Real backend unreachable | Visible `MOCK_ORGS` fallback (TC-ORG-009) — the one case that fallback is for |
| E4 | Search term matches no real org | Real empty list (no fallback triggers, since the query still resolves successfully with an empty array — not a `catch`-triggering error) |

## What's out of scope for this plan

The self-serve organization **onboarding** wizard (`pages/onboarding/index.jsx`, `test-suggestions/organization-onboarding/`) is a completely separate flow — Phase 3.5-style tenant sign-up, not admin-side management of already-existing tenants — with no real backend at all (checked this pass: no `startOrganizationOnboarding`/`selectOnboardingPlan`/etc. resolvers exist anywhere). Covered by its own re-scoping decision, not this plan (see `REQ013` Finding 1 item 3 and the corresponding `test-suggestions/organization-onboarding/` update).
