# Phase 4 Backend Integration — Test Plan

**Module:** Live frontend↔backend integration for every domain with a real resolver — Auth (Phase 1-3), Clinics, Rooms, Clinician/Room Type lookups, Organizations (Phase 4, Increments 1-2)
**Source:** `backend/src/{auth,clinics,rooms,lookups,organizations}/**`, `frontend/src/pages/{manager/clinics,manager/rooms,admin/Organizations,admin/RoomTypes,admin/ClinicianTypes}/**`
**Environment:** `http://localhost:3000` (frontend) + `http://localhost:4000/graphql` (real NestJS backend, real Postgres) — Docker Compose stack, all four containers healthy
**Tooling:** Playwright MCP (`@playwright/mcp`, Node 24 via a user-local install — see `context/phase4-catalog-modules-implementation-plan.md` for the Node-upgrade story), driving a real Chromium instance against the live containers
**Scope note:** deliberately limited to domains with an actual backend resolver behind them. Patients, Roles/Permissions, Waiting Room, Tasks, and other mock-store-only pages are explicitly **out of scope** for this plan — they have no frontend↔backend integration to verify yet.
**Updated:** 2026-08-17

---

## 1. Auth (baseline — re-verifying Phase 3 still works after this session's changes)

### TC-P4-AUTH-01 — Real login with seeded credentials, not the mock demo-account shortcut
**Steps:** Navigate to `/login`, type `admin@medibook.dev` / `Admin1234!` into the email/password fields directly (not the "Admin" demo-account quick-login button), submit.
**Expected:** Redirects to `/dashboard`; sidebar shows "Admin User" (matching `prisma/seed.ts`'s seeded name) — confirms this hit the real `login` mutation, not local mock state.

### TC-P4-AUTH-02 — Session expiry redirects to login without a crash
**Steps:** Stay authenticated past the 15-minute access-token TTL, then navigate to a protected route.
**Expected:** Redirected to `/login`, no console error, no blank page.

---

## 2. Dashboard — mixed real+mock graceful degradation

### TC-P4-DASH-01 — Dashboard tolerates a 400 from the unbuilt analytics backend
**Steps:** Load `/dashboard` as an authenticated admin.
**Expected:** An `alert` reading "Some dashboard data could not be loaded — showing available data" renders; KPI cards/charts still populate (from mock fallback); no blank page, no unhandled crash. This is correct behavior, not a bug — Phase 13 (Analytics) doesn't exist yet.

---

## 3. Clinics (`manager/clinics/*`)

### TC-P4-CLI-01 — List page renders real backend clinics, not hardcoded mock data
**Steps:** Navigate to `/manager/clinics`.
**Expected:** Clinics created via the real `createClinic` mutation appear by name/address/phone; enrichment stats not yet backed by any resolver (Clinicians/Rooms/Today/Monthly counts) render as honest `0`, never fabricated numbers. Zero console errors; exactly 2 GraphQL requests (`CLINICS_QUERY`, `ROOMS_QUERY`), both 200.

### TC-P4-CLI-02 — Rooms tab shows real rooms attributed to the correct clinic
**Steps:** From `/manager/clinics`, click the "Rooms" toggle.
**Expected:** Real rooms render with their correct parent clinic name (via the `room_number`→`name` GraphQL mapping and the `clinic{id name}` nested field).

### TC-P4-CLI-03 — Create Clinic writes to the real backend and redirects to a real detail page
**Steps:** `/manager/clinics/new` → fill Name/Address/City/Postcode/Phone/Email → Save.
**Expected:** Redirects to `/manager/clinics/<real-uuid>`; detail page shows exactly what was submitted, address/city/postcode joined into one display string; zero console errors.

### TC-P4-CLI-04 — Edit Clinic persists changes and shows a success toast
**Steps:** Open an existing clinic's edit page, change the Phone field, save.
**Expected:** Redirects to the detail page with the updated phone number visible and a "Clinic updated" toast; reload confirms persistence.

### TC-P4-CLI-05 — Add Room from a clinic's detail page
**Steps:** From a clinic detail page, click "+ Add Room", fill Name/Capacity, pick the clinic in the dropdown, save.
**Expected:** Redirects to a real room edit page (`/manager/rooms/<uuid>/edit`); zero console errors.

---

## 4. Organizations (`admin/organizations`)

### TC-P4-ORG-01 — List page renders real organizations with the India address shape
**Steps:** Navigate to `/admin/organizations`.
**Expected:** Real orgs render; the "Location" column shows `city, state` (e.g. "Bengaluru, Karnataka") sourced from the nested `address_structured` field, not the old flat Western shape.

### TC-P4-ORG-02 — Create dialog collects the full India address (State + Pincode present)
**Steps:** Click "Add Organization", inspect the dialog's fields.
**Expected:** Address Line 1/2, City, **State**, **Pincode**, Country (pre-filled "India") all present — confirms the frontend was updated alongside the backend's structured-address decision, not left on the old Western shape.

### TC-P4-ORG-03 — Code/slug normalization round-trips through the real backend
**Steps:** Submit "Add Organization" with Code/Slug typed as `"Westside Health!!"`.
**Expected:** The created row displays code `westside-health` (lowercased, non-alphanumeric collapsed to hyphens, trimmed) — confirms `normalizeOrgCode` runs server-side, not just a client-side `.toLowerCase()`.

### TC-P4-ORG-04 — Edit dialog pre-fills the full nested address correctly
**Steps:** Click Edit on an existing organization.
**Expected:** Every field, including State and Pincode, is pre-filled with the real stored values.

### TC-P4-ORG-05 — Invalid pincode is rejected (message quality is a known, separate gap — see test-suggestion)
**Steps:** In the Edit dialog, set Pincode to a 4-digit value, submit.
**Expected:** Save is blocked, an error alert renders inside the dialog (the exact message text is tracked as a suggestion, not a pass/fail gate for this case — the case only asserts the bad data is never persisted).

---

## 5. Reference Data — Clinician Types / Room Types (`admin/clinician-types`, `admin/room-types`)

### TC-P4-REF-01 — Clinician Types list renders real backend rows
**Steps:** Navigate to `/admin/clinician-types`.
**Expected:** Real rows (e.g. a clinician type created via the API) render with correct name/description/active state.

### TC-P4-REF-02 — Room Types page loads without crashing
**Steps:** Navigate to `/admin/room-types`.
**Expected:** Page renders (empty state or real rows), no crash — regression guard for the previously-documented `TC-ADMIN-FE-001` ("/admin/room-types currently crashes on load"), now confirmed fixed.

### TC-P4-REF-03 — Create Room Type persists through the real backend
**Steps:** Click "Add Room Type", fill Name, Create.
**Expected:** New row appears in the table immediately, zero console errors.

### TC-P4-REF-04 — Delete Room Type removes the row after confirmation
**Steps:** Click Delete on a row, confirm in the dialog.
**Expected:** Row disappears from the table; zero console errors.

### TC-P4-REF-05 — Create Clinician Type persists through the real backend
**Steps:** Same as TC-P4-REF-03, on `/admin/clinician-types`.
**Expected:** Same as TC-P4-REF-03.

### TC-P4-REF-06 — Delete Clinician Type removes the row after confirmation
**Steps:** Same as TC-P4-REF-04, on `/admin/clinician-types`.
**Expected:** Same as TC-P4-REF-04.

---

## 6. Role-based access (spot-checks, full matrix already covered in `test-cases/12-admin-rbac`)

### TC-P4-RBAC-01 — Patient role can read Clinics but not create them
**Steps:** Log in as `patient@medibook.dev`, query `clinics` (read succeeds — needed for the booking wizard), attempt `createClinic` (should fail).
**Expected:** Read succeeds; create returns `FORBIDDEN`.

### TC-P4-RBAC-02 — Manager role cannot create an Organization
**Steps:** Log in as `manager@medibook.dev`, attempt `createOrganization`.
**Expected:** `FORBIDDEN` — Organization creation is admin/super_admin only, deliberately excluding manager.

### TC-P4-RBAC-03 — No token at all is rejected on every protected query
**Steps:** Call `clinics` with no `Authorization` header.
**Expected:** `UNAUTHENTICATED` — confirms the global `GqlAuthGuard` (not a per-resolver opt-in) is actually wired in, per `context/backend-hard-rules.md` Rule 2's correction.
