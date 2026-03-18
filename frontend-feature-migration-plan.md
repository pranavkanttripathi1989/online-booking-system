# Frontend-Old → Frontend Feature Migration Plan

> **Objective:** Migrate all feature *logic* (not UI design) from `frontend-old` (Supabase/TypeScript) into `frontend` (Apollo GraphQL/React/MUI). Preserve the new UI design system; only port missing business logic and screens.

---

## 1. Architecture Comparison

| Dimension | `frontend-old` | `frontend` (current) |
|---|---|---|
| Runtime | Vite + TypeScript + Supabase | Vite + React JSX + Apollo Client |
| Auth | Supabase Auth | JWT via GraphQL |
| Routing | Single flat router in `App.tsx` | Role-based layered router in `App.jsx` |
| Pagination | Custom `usePagination` hook | Per-page local state |
| Notifications | Supabase real-time subscriptions | Not yet implemented |

---

## 2. Feature Gap Matrix

### ✅ Already in `frontend`

| Feature | Route | Component |
|---|---|---|
| Login / Forgot Password | `/login`, `/forgot-password` | `pages/Login.jsx`, `pages/ForgotPasswordPage.jsx` |
| Dashboard (shared) | `/dashboard` | `pages/DashboardPage.jsx` |
| Appointments (CRUD) | `/appointments` | `pages/AppointmentsPage.jsx` |
| Booking Wizard | `/appointments/book` | `pages/BookingWizard.jsx` |
| Calendar | `/calendar` | `pages/CalendarPage.jsx` |
| Clinicians list + detail | `/clinicians`, `/clinicians/:id` | `pages/CliniciansPage.jsx` |
| Patients list + detail | `/patients`, `/patients/:id` | `pages/PatientsPage.jsx` |
| Messages | `/messages` | `pages/MessagesPage.jsx` |
| Analytics | `/analytics` | `pages/AnalyticsPage.jsx` |
| Finances / Reviews / Staff / Test Results | various | various |
| Video Consultation | `/video/:id` | `pages/VideoConsultation.jsx` |
| **Patient Portal** | `/patient/dashboard`, `/patient/appointments`, `/patient/profile` | `pages/patient/*` |
| **Clinician Portal** | `/clinician/dashboard`, `/clinician/calendar`, `/clinician/patients` | `pages/clinician/*` |
| **Clinician Availability** | `/clinician/availability` | `pages/clinician/Availability.jsx` |
| **Staff Portal** | `/staff/dashboard`, `/staff/appointments` | `pages/staff/*` |
| **Manager** | `/manager/dashboard`, `/manager/clinics`, `/manager/services`, `/manager/billing` | `pages/manager/*` |
| **Admin** | `/admin/users`, `/admin/organizations`, `/admin/communications`, `/admin/policies` | `pages/admin/*` |

### ❌ Missing from `frontend` — Must Be Ported

| # | Feature | `frontend-old` Component | Target Route | Roles |
|---|---|---|---|---|
| 1 | **Schedule Blocks** (Spacer + Room blocks) | `Blocks.tsx` | `/manager/blocks` | receptionist, manager, admin |
| 2 | **Rooms CRUD** | `Rooms.tsx` | `/manager/rooms` | manager, admin |
| 3 | **Products & Inventory** (with categories, subcategories, variations) | `Products.tsx` | `/manager/products` | manager, admin |
| 4 | **Role Management** | `RoleManagement.tsx` | `/admin/roles` | system_admin |
| 5 | **ClinicianTypes CRUD** | `ClinicianTypes.tsx` | `/admin/clinician-types` | system_admin, manager |
| 6 | **RoomTypes CRUD** | `RoomTypes.tsx` | `/admin/room-types` | system_admin, manager |
| 7 | **Languages Management** | `Languages.tsx` | `/admin/languages` | system_admin |
| 8 | **Email Templates** | `EmailTemplates.tsx` | `/admin/email-templates` | system_admin |
| 9 | **Cancellation Rules/Policies** | `CancellationRules.tsx` | Already at `/admin/policies` — ENHANCE existing |
| 10 | **Organizations CRUD** | `Organizations.tsx` | Already at `/admin/organizations` — ENHANCE existing |
| 11 | **Notifications Page** | `Notifications.tsx` | `/notifications` | all roles |
| 12 | **My Profile** (full CRUD + image upload + password change) | `Profile.tsx` | `/profile` (global) | all roles |
| 13 | **Pagination system** | `usePagination.ts` + `PaginationBar.tsx` | shared hook | — |
| 14 | **Manager-level Availability Management** | `Availability.tsx` (admin view) | `/manager/availability` | manager, admin |

---

## 3. Detailed Feature Specs for Each Missing Module

### 3.1 Schedule Blocks — `/manager/blocks`

**What it does:** Two sub-tabs:
- **Spacer Blocks** — block a clinician's time slot (e.g., equipment setup, admin work). Has date, time range, recurrence (single/daily/weekly/monthly/custom days), end date, reason, optional room.
- **Room Blocks** — block an entire room for a time range with same recurrence options.

**GraphQL Queries/Mutations needed:**
```
spacerBlocks(search), roomBlocks(search)
createSpacerBlock(input), deleteSpacerBlock(id)
createRoomBlock(input), deleteRoomBlock(id)
```

**State:** `view: 'spacers' | 'rooms'`, form with fields: `clinician_id, clinic_id, room_id, block_date, start_time, end_time, reason, recurrence_type, recurrence_days[], end_date`

---

### 3.2 Rooms CRUD — `/manager/rooms`

**What it does:** Paginated list of clinic rooms. CRUD with fields: clinic (dropdown), room number, room type (from RoomTypes), clinician type (from ClinicianTypes), active/inactive status.

**GraphQL:**
```
roomsPaginated(search), clinics, clinicianTypes, roomTypes
createRoom(input), updateRoom(id, input), deleteRoom(id)
```

---

### 3.3 Products & Inventory — `/manager/products`

**What it does:** Two tabs — **Products** and **Categories**.
- Products: name, SKU, price, product_type (simple/variable), category, subcategory, description. Variable products have child variations (name, SKU, price, stock_quantity).
- Categories: name, description (CRUD).
- Subcategories: name, description, parent category (CRUD).

**GraphQL:**
```
products, productCategories, productSubcategories(category_id?)
createProduct, updateProduct, deleteProduct
createProductCategory, updateProductCategory, deleteProductCategory
createProductSubcategory, updateProductSubcategory, deleteProductSubcategory
```

---

### 3.4 Role Management — `/admin/roles`

**What it does:** List roles, create/edit roles with name+description+permissions, delete roles (with confirm dialog). `RoleManagement.tsx` in frontend-old.

**GraphQL:**
```
roles, createRole(input), updateRole(id, input), deleteRole(id)
```

---

### 3.5 ClinicianTypes CRUD — `/admin/clinician-types`

**What it does:** Simple CRUD table for clinician type names + descriptions. Used as a dropdown in Rooms and Clinicians.

**GraphQL:**
```
clinicianTypes, createClinicianType(input), updateClinicianType(id, input), deleteClinicianType(id)
```

---

### 3.6 RoomTypes CRUD — `/admin/room-types`

**What it does:** Same pattern as ClinicianTypes. Names used in Rooms CRUD.

**GraphQL:**
```
roomTypes, createRoomType(input), updateRoomType(id, input), deleteRoomType(id)
```

---

### 3.7 Languages Management — `/admin/languages`

**What it does:** List supported languages (name, locale code, active flag), CRUD, set active/inactive. Used for i18n configuration.

**GraphQL:**
```
languages, createLanguage(input), updateLanguage(id, input), deleteLanguage(id)
```

---

### 3.8 Email Templates — `/admin/email-templates`

**What it does:** List email templates by type (appointment confirmation, reminder, cancellation, etc.). Edit template body (HTML/text), subject, variables. Preview capability.

**GraphQL:**
```
emailTemplates, emailTemplate(id)
updateEmailTemplate(id, input)
```

---

### 3.9 Enhance Cancellation Rules/Policies — `/admin/policies`

**What it does in frontend-old (`CancellationRules.tsx`):** 
- Define cancellation windows (e.g., "cancel within 24 hours = full charge")
- Set fee percentage/amount, rule priority, active/inactive
- Per-clinic or global rules

Current `/admin/policies` page exists but likely lacks this logic. **Enhance it** with the `CancellationRules.tsx` logic.

**GraphQL:**
```
cancellationRules, createCancellationRule(input), updateCancellationRule(id, input), deleteCancellationRule(id)
```

---

### 3.10 Enhance Organizations — `/admin/organizations`

**What it does in frontend-old (`Organizations.tsx`):**
- CRUD for client organizations (name, code, contact email, address, active flag)
- Link users to orgs

Current `/admin/organizations` exists. **Enhance** with full CRUD matching `Organizations.tsx`.

**GraphQL:**
```
organizations(search), createOrganization(input), updateOrganization(id, input), deleteOrganization(id)
```

---

### 3.11 Notifications Page — `/notifications`

**What it does:** Full notifications page (all roles).
- List notifications filtered by `all` or `unread`
- Mark single notification as read
- Mark all as read  
- Delete notification
- Priority badge (high = red), type icons (appointment=calendar, payment=credit-card, alert=alert-circle)
- Left-border accent on unread items

**GraphQL (replace Supabase real-time with Apollo polling or subscription):**
```
notifications(userId, filter), markNotificationRead(id), markAllNotificationsRead, deleteNotification(id)
```
Use `useQuery` with `pollInterval: 30000` as substitute for real-time.

---

### 3.12 My Profile — `/profile`

**What it does:** Full profile management accessible to all roles.
- **View mode:** Avatar/initials, name, email, role badge, clinic name, member-since date, contact info (phone with international format), full address
- **Edit mode (tabs):**
  - *Profile tab:* Photo upload (base64 → `uploadProfileImage`) + delete, first/last name, phone (international picker), address (line1, line2, city, postal_code, country)
  - *Password tab:* current password, new password, confirm password (min 8 chars validation)

**GraphQL:**
```
myProfile
updateProfile(input: UpdateProfileInput!)
uploadProfileImage(imageBase64, filename)  
deleteProfileImage
```

---

### 3.13 Shared Pagination Hook — `src/hooks/usePagination.js`

Port `frontend-old/src/lib/usePagination.ts` as a reusable hook:

```js
usePagination(fetchFn) → { data, pagination, searchTerm, loading, handleSearch, nextPage, previousPage, goToPage, currentPage, totalPages, loadData }
```

Also create `src/components/PaginationBar.jsx` to render search + pagination controls (reused by Rooms, Clinics, etc.).

---

### 3.14 Manager Availability Management — `/manager/availability`

**What it does:** Manager/admin-level view of ALL clinician availability schedules (cross-clinic), not just the clinician's own view. Full CRUD — create/edit/delete availability records for any clinician.

Fields: clinician (dropdown), clinic, room (filtered by clinic), recurrence type (daily/weekly/monthly/custom), day of week (when weekly), start/end times, exclude weekends (sat/sun toggles), custom dates, valid from/until.

**GraphQL:**
```
availabilities(search), clinicians, clinics, rooms(clinicId)
createAvailability(input), updateAvailability(id, input), deleteAvailability(id)
```

---

## 4. Phase-wise Implementation Plan

### Phase A — Shared Infrastructure (Do First)
**Order matters:** These are used by all other features.

| Task | Files | Prompt |
|---|---|---|
| A1 — Pagination Hook | `src/hooks/usePagination.js` | See §5.A1 |
| A2 — PaginationBar Component | `src/components/PaginationBar/PaginationBar.jsx` | See §5.A2 |
| A3 — ConfirmDialog Component | `src/components/ConfirmDialog/ConfirmDialog.jsx` | See §5.A3 |

### Phase B — Manager Features
| Task | Files | Prompt |
|---|---|---|
| B1 — Availability Management | `src/pages/manager/Availability.jsx` + route | See §5.B1 |
| B2 — Schedule Blocks | `src/pages/manager/Blocks.jsx` + route | See §5.B2 |
| B3 — Rooms CRUD | `src/pages/manager/Rooms.jsx` + route | See §5.B3 |
| B4 — Products & Inventory | `src/pages/manager/Products.jsx` + route | See §5.B4 |

### Phase C — Admin Features
| Task | Files | Prompt |
|---|---|---|
| C1 — Role Management | `src/pages/admin/Roles.jsx` + route | See §5.C1 |
| C2 — ClinicianTypes | `src/pages/admin/ClinicianTypes.jsx` + route | See §5.C2 |
| C3 — RoomTypes | `src/pages/admin/RoomTypes.jsx` + route | See §5.C3 |
| C4 — Languages | `src/pages/admin/Languages.jsx` + route | See §5.C4 |
| C5 — Email Templates | `src/pages/admin/EmailTemplates.jsx` + route | See §5.C5 |
| C6 — Enhance Policies | `src/pages/admin/Policies.jsx` (enhance) | See §5.C6 |
| C7 — Enhance Organizations | `src/pages/admin/Organizations.jsx` (enhance) | See §5.C7 |

### Phase D — Global Features (All Roles)
| Task | Files | Prompt |
|---|---|---|
| D1 — Notifications Page | `src/pages/NotificationsPage.jsx` + route | See §5.D1 |
| D2 — My Profile Page | `src/pages/ProfilePage.jsx` + route | See §5.D2 |

### Phase E — Nav & Routing Updates
| Task | Files | Prompt |
|---|---|---|
| E1 — Add missing routes to `App.jsx` | `src/App.jsx` | See §5.E1 |
| E2 — Add missing nav items to `AppShell.jsx` | `src/layouts/AppShell.jsx` | See §5.E2 |

---

## 5. Antigravity AI Prompts

> Use these prompts one-by-one in order. Each prompt is self-contained. The current UI design system (MUI, HealthSync theme palette, existing layout) must be preserved — only add logic and new pages, do not change existing page styles.

---

### 5.A1 — Pagination Hook

```
Create a reusable Apollo-compatible pagination hook at `src/hooks/usePagination.js` in the frontend directory `/Users/pranavkanttripathi/Downloads/online-booking-system/frontend`.

The hook signature:
  usePagination(fetchFn)
  where fetchFn = async (searchInput: { search: string, limit: number, offset: number }) => { data: T[], pageInfo: { total, limit, offset, hasNextPage, hasPreviousPage } }

Returns:
  { data, pagination: { total, limit, offset, hasNextPage, hasPreviousPage }, searchTerm, loading, handleSearch, nextPage, previousPage, goToPage, currentPage, totalPages, loadData }

- Default limit = 10
- handleSearch debounces by 400ms and resets offset to 0
- loadData(offset?) calls fetchFn with current searchTerm and given offset
- goToPage(pageNumber) calculates offset = (pageNumber - 1) * limit
- currentPage = Math.floor(offset / limit) + 1
- totalPages = Math.ceil(total / limit)
```

---

### 5.A2 — PaginationBar Component

```
Create `src/components/PaginationBar/PaginationBar.jsx` in the frontend directory.

Props: { searchTerm, onSearchChange, searchPlaceholder, currentPage, totalPages, total, limit, offset, onPreviousPage, onNextPage, onGoToPage, loading }

Render using existing MUI components (TextField, IconButton, Typography, Box):
- A search input (left side)
- Results count text: "Showing X–Y of Z results"
- Prev / Next buttons (disabled when at boundaries or loading)
- Optional: jump-to-page input for totalPages > 5

Match the existing HealthSync design system (use theme colors from `src/theme/`).
```

---

### 5.A3 — ConfirmDialog Component

```
Create `src/components/ConfirmDialog/ConfirmDialog.jsx` in the frontend directory.

Props: { isOpen, title, message, onConfirm, onCancel, confirmLabel="Delete", confirmColor="error" }

Use MUI Dialog component. Show a warning icon, title, message, Cancel and Confirm buttons. Confirm button uses confirmColor variant. Auto-focus the Cancel button for safety.
```

---

### 5.B1 — Manager Availability Page

```
Create `src/pages/manager/Availability.jsx` in the frontend. This is a MANAGER-LEVEL view of ALL clinician availability schedules (not just the logged-in clinician's own schedule).

Feature requirements (logic from frontend-old/src/components/Availability.tsx):
1. Load all availability records with nested clinician, clinic, room names via GraphQL query `availabilities(search: { limit: 100 })`.
2. Also load dropdowns: clinicians, clinics, rooms (filtered by selected clinic).
3. Display a table with columns: Clinician, Clinic, Time (start-end), Recurrence (type + day of week), Valid Period, Actions (Edit/Delete).
4. "Add Availability" button opens an inline form (not modal) with:
   - Clinician select (required)
   - Clinic select (required)
   - Recurrence type select: daily | weekly | monthly | custom
   - Day of week select (show only when weekly)
   - Start time / End time (time inputs)
   - Custom dates field (comma-separated, show only when custom)
   - Room select (optional, disabled until clinic selected, loads rooms for clinic via query `rooms(clinicId)`)
   - Valid from / Valid until (date inputs)
   - Exclude weekends checkbox → sub-checkboxes for Saturday / Sunday
5. Create: `createAvailability(input: CreateAvailabilityInput!)` mutation
6. Update: `updateAvailability(id, input: UpdateAvailabilityInput!)` mutation
7. Delete: `deleteAvailability(id)` mutation with ConfirmDialog
8. Show toast (react-hot-toast or HealthSync snackbar) on success/error.

Use the existing HealthSync MUI design system. Do NOT change existing page styles.
Add the route `/manager/availability` to `src/App.jsx` inside the RoleGuard for ['admin', 'super_admin', 'manager'].
```

---

### 5.B2 — Schedule Blocks Page

```
Create `src/pages/manager/Blocks.jsx` in the frontend.

Feature requirements (logic from frontend-old/src/components/Blocks.tsx):

Two tabs via toggle buttons: "Spacer Blocks" and "Room Blocks".

SPACER BLOCKS tab:
- Load via GraphQL: `spacerBlocks(search: { limit: 1000 })` with nested clinician, clinic, room
- Also load: clinicians, clinics, rooms
- Form fields: clinician (required), clinic (required), room (optional, filtered by clinic), recurrence_type (single/daily/weekly/monthly/custom), block_date (required if single), recurrence_days[] checkboxes Sun-Sat (if custom), end_date (if not single), start_time, end_time, reason
- Create: `createSpacerBlock(input: CreateSpacerBlockInput!)`, Delete: `deleteSpacerBlock(id)`
- List as cards showing clinician name, date, time range, clinic, room, reason

ROOM BLOCKS tab:
- Load via GraphQL: `roomBlocks(search: { limit: 1000 })` with nested room, clinic
- Form fields: clinic (required), room (required, filtered by clinic), recurrence_type, block_date, recurrence_days[], end_date, start_time, end_time, reason
- Create: `createRoomBlock(input: CreateRoomBlockInput!)`, Delete: `deleteRoomBlock(id)`
- List as cards showing room number, clinic, date, time, reason

Both lists show a ConfirmDialog before deletion. Show toasts on success/error.
Use dayjs for date/time formatting.
Add route `/manager/blocks` to App.jsx under RoleGuard ['admin', 'super_admin', 'manager'].
```

---

### 5.B3 — Rooms CRUD Page

```
Create `src/pages/manager/Rooms.jsx` in the frontend.

Feature requirements (logic from frontend-old/src/components/Rooms.tsx):

1. Paginated list using the usePagination hook (created in A1) calling `roomsPaginated(search)` query.
   - Query fields: id, room_number, room_type, roomTypeName, clinician_type, clinicianTypeName, is_active, clinic { id, name }
   - pageInfo: total, limit, offset, hasNextPage, hasPreviousPage
2. On mount also load metadata: `clinics { id, name }`, `clinicianTypes { id, name }`, `roomTypes { id, name }`
3. Display rooms in a responsive grid (cards) showing: room number, room type, clinician type, clinic name, active/inactive badge, Edit + Delete buttons.
4. Inline create/edit form with fields:
   - Clinic select (required, from clinics list)
   - Room Number text (required)
   - Room Type select (required, from roomTypes list)
   - Clinician Type select (required, from clinicianTypes list)
5. Mutations:
   - `createRoom(input: CreateRoomInput!)` 
   - `updateRoom(id: ID!, input: UpdateRoomInput!)`
   - `deleteRoom(id: ID!)` with ConfirmDialog
6. Use PaginationBar component (A2) for search + paginate.
7. Show toast on success/error.

Add route `/manager/rooms` to App.jsx under RoleGuard ['admin', 'super_admin', 'manager'].
```

---

### 5.B4 — Products & Inventory Page

```
Create `src/pages/manager/Products.jsx` in the frontend.

Feature requirements (logic from frontend-old/src/components/Products.tsx):

Two top tabs: "Products" and "Categories".

PRODUCTS tab:
- Load: `products { id, clinic_id, category_id, subcategory_id, name, description, product_type, sku, price, is_active }`
- Also load: `productCategories { id, name }`, `productSubcategories { id, category_id, name }`
- When category selected in form, filter subcategories by category_id
- Product cards: name, SKU, category name, subcategory, type badge, price (for simple products), variations count (for variable), description excerpt
- Create/Edit form:
  - Name (required), SKU (required), Category select (required), Subcategory select (optional, filtered), Product Type select (simple | variable), Price (number, required if simple), Description (textarea)
  - If product_type = "variable" AND creating (not editing): show "+ Add Variation" section to add rows of [variation_name, sku, price, stock_quantity], each removable
- Mutations: `createProduct`, `updateProduct`, `deleteProduct` with ConfirmDialog

CATEGORIES tab (two sub-actions: Add Category / Add Subcategory):
- List product categories with edit/delete
- List product subcategories grouped by category
- Create/edit/delete productCategory: name, description
- Create/edit/delete productSubcategory: name, description, category_id
- All deletes use ConfirmDialog

Add route `/manager/products` to App.jsx under RoleGuard ['admin', 'super_admin', 'manager'].
```

---

### 5.C1 — Role Management (Admin)

```
Create `src/pages/admin/Roles.jsx` in the frontend.

Feature requirements (logic from frontend-old/src/components/RoleManagement.tsx):

1. Load all roles: `roles { id, name, description, is_active, created_at }`
2. Display as a table with columns: Role Name, Description, Status badge, Created At, Edit / Delete actions
3. Inline create/edit form: name (required), description (textarea)
4. Toggle active/inactive per role
5. Mutations:
   - `createRole(input: CreateRoleInput!)`
   - `updateRole(id: ID!, input: UpdateRoleInput!)`
   - `deleteRole(id: ID!)` with ConfirmDialog (warn if role has assigned users)
6. Show toasts on success/error.

Add route `/admin/roles` to App.jsx under RoleGuard ['admin', 'super_admin'].
Add "Roles" nav item to AppShell sidebar under Admin section.
```

---

### 5.C2 — ClinicianTypes (Admin)

```
Create `src/pages/admin/ClinicianTypes.jsx` in the frontend.

Feature requirements (logic from frontend-old/src/components/ClinicianTypes.tsx):

Simple CRUD table for clinician types.
- Load: `clinicianTypes { id, name, description, is_active }`
- Table columns: Name, Description, Status, Actions (Edit/Delete)
- Form: name (required), description (optional)
- Mutations: `createClinicianType`, `updateClinicianType`, `deleteClinicianType` with ConfirmDialog
- Toggle active/inactive
- Toasts on success/error

Add route `/admin/clinician-types` to App.jsx.
Add nav item "Clinician Types" under Admin section in AppShell.
```

---

### 5.C3 — RoomTypes (Admin)

```
Create `src/pages/admin/RoomTypes.jsx` in the frontend.

Identical pattern to ClinicianTypes (C2) but for room types.
- Load: `roomTypes { id, name, description, is_active }`
- Table columns: Name, Description, Status, Actions
- Form: name, description
- Mutations: `createRoomType`, `updateRoomType`, `deleteRoomType` with ConfirmDialog
- Toggle active/inactive
- Toasts on success/error

Add route `/admin/room-types` to App.jsx.
Add nav item "Room Types" under Admin section in AppShell.
```

---

### 5.C4 — Languages (Admin)

```
Create `src/pages/admin/Languages.jsx` in the frontend.

Feature requirements (logic from frontend-old/src/components/Languages.tsx):

- Load all languages: `languages { id, name, code, is_active, is_default }`
- Table: Name, Code (locale), Status badge, Default badge, Actions
- Form: name (required), code (required e.g. "en", "fr"), set as default checkbox
- Cannot delete the active default language — show tooltip/warning
- Mutations: `createLanguage`, `updateLanguage`, `deleteLanguage` with ConfirmDialog
- Toasts on success/error

Add route `/admin/languages` to App.jsx.
Add nav item "Languages" under Admin section in AppShell.
```

---

### 5.C5 — Email Templates (Admin)

```
Create `src/pages/admin/EmailTemplates.jsx` in the frontend.

Feature requirements (logic from frontend-old/src/components/EmailTemplates.tsx):

- Load: `emailTemplates { id, name, type, subject, body, variables, is_active }`
- Display as list: template name, type badge (appointment_confirmation, reminder, cancellation, etc.), subject, status
- Click to open edit form (slide-in or inline expanded):
  - Subject (text input)
  - Body (rich textarea or code editor — use a <textarea> for simplicity)
  - Show available variables (read-only chips from template.variables array)
  - Cannot create new types — only edit existing
- Mutation: `updateEmailTemplate(id: ID!, input: UpdateEmailTemplateInput!)` with subject, body fields
- Preview button to show rendered preview in a modal (basic HTML interpolation with sample data)
- Toasts on success/error

Add route `/admin/email-templates` to App.jsx.
Add nav item "Email Templates" under Admin section in AppShell.
```

---

### 5.C6 — Enhance Policies Page

```
Enhance the existing `src/pages/admin/Policies.jsx` in the frontend to add full Cancellation Rules logic (from frontend-old/src/components/CancellationRules.tsx).

Add a "Cancellation Rules" section to the existing Policies page (keep existing content, add below):

Rules list: `cancellationRules { id, name, description, hours_before, fee_type (percentage|fixed), fee_amount, clinic_id, is_active, priority }`

- Table columns: Rule Name, Hours Before, Fee, Clinic (or "Global"), Priority, Status, Actions
- Inline create/edit form:
  - Name (required)
  - Description
  - Hours Before (number, required) — "cancellations less than X hours before = apply fee"
  - Fee Type select (percentage | fixed)
  - Fee Amount (number)
  - Clinic select (optional — leave blank = global rule)
  - Priority (number — lower = higher priority)
  - Active toggle
- Mutations: `createCancellationRule`, `updateCancellationRule`, `deleteCancellationRule` with ConfirmDialog

Sort rules by priority ascending for display.
```

---

### 5.C7 — Enhance Organizations Page

```
Enhance the existing `src/pages/admin/Organizations.jsx` in the frontend (from frontend-old/src/components/Organizations.tsx).

Current page likely shows a basic list. Enhance to full CRUD:
- Paginated list via `organizationsPaginated(search)` using PaginationBar component
- Cards showing: org name, code, contact email, address, active status
- Full create/edit form: name (required), code (required, unique slug), contact_email (required), address_line1, address_line2, city, postal_code, country, active toggle
- Delete with ConfirmDialog
- Mutations: `createOrganization`, `updateOrganization`, `deleteOrganization`
- Toasts on success/error
```

---

### 5.D1 — Notifications Page

```
Create `src/pages/NotificationsPage.jsx` in the frontend (porting logic from frontend-old/src/components/Notifications.tsx but replacing Supabase real-time with Apollo polling).

Feature requirements:
1. Load notifications via Apollo useQuery: `notifications(userId, filter)` returning `{ id, title, message, type, priority, is_read, created_at }`.
   Use pollInterval: 30000 for live updates.
2. Filter toggle: "Unread" | "All" (tab buttons)
3. Per-notification actions:
   - Mark as read (check icon) — only on unread
   - Delete (trash icon)
4. "Mark All Read" button (only shown when there are unread notifications)
5. Notification card styling:
   - Left blue border accent if is_read === false
   - Type icon: appointment=Calendar, payment=CreditCard, alert=AlertCircle, default=Info
   - Priority badge: high priority = red "High Priority" chip
   - Time shown as relative (use dayjs.fromNow())
6. Mutations: `markNotificationRead(id)`, `markAllNotificationsRead`, `deleteNotification(id)`
7. Empty state: bell icon with "No unread notifications" message

Add route `/notifications` to App.jsx (inside ProtectedRoute, visible to all roles).
Add "Notifications" nav item with bell icon to AppShell sidebar (visible to all roles).
```

---

### 5.D2 — My Profile Page

```
Create `src/pages/ProfilePage.jsx` in the frontend (porting all logic from frontend-old/src/components/Profile.tsx).

Feature requirements:

VIEW MODE (read-only):
- Profile header card: avatar (image if uploaded, else initials), full name, email, active status badge, role badge, clinic name (if applicable)
- Member since date (formatted), last updated (relative time)
- Contact info card: email, phone (internationally formatted using libphonenumber-js)
- Address card (only shown if address data exists): line1, line2, city, postal code, country

EDIT MODE (triggered by "Edit Profile" button), tabbed:
Tab 1 — "Edit Profile":
  - Profile photo section: current avatar preview, "Upload Image" button (opens file input, reads as base64, calls `uploadProfileImage(imageBase64, filename)` mutation), "Remove" button (calls `deleteProfileImage` mutation)
  - Personal: first_name, last_name (inputs)
  - Phone: use react-international-phone component for international phone input
  - Address: address_line1, address_line2, city, postal_code, country
  - "Save Changes" button calls `updateProfile(input: UpdateProfileInput!)` mutation
  
Tab 2 — "Change Password":
  - current_password, new_password, confirm_password inputs
  - Validate: passwords match, new password min 8 chars
  - Calls `updateProfile(input: { current_password, password })` mutation

Use Apollo useMutation. On success show success banner (green) for 3 seconds, return to view mode.
Show error banner (red) on mutation errors.

Install react-international-phone and libphonenumber-js if not already present.
Add route `/profile` to App.jsx inside ProtectedRoute (all roles). 
Add "My Profile" option in the user menu dropdown in AppShell.
```

---

### 5.E1 — Update App.jsx Routes

```
Update `src/App.jsx` in the frontend to add all missing routes created in phases B, C, D.

Add the following lazy imports at the top (in the appropriate section):
  - Manager/Availability, Manager/Blocks, Manager/Rooms, Manager/Products
  - Admin/Roles, Admin/ClinicianTypes, Admin/RoomTypes, Admin/Languages, Admin/EmailTemplates
  - NotificationsPage, ProfilePage

Add routes inside the appropriate RoleGuard wrappers:
  Manager routes (RoleGuard ['admin', 'super_admin', 'manager']):
    /manager/availability → ManagerAvailability
    /manager/blocks       → ManagerBlocks
    /manager/rooms        → ManagerRooms
    /manager/products     → ManagerProducts

  Admin routes (RoleGuard ['admin', 'super_admin']):
    /admin/roles           → AdminRoles
    /admin/clinician-types → AdminClinicianTypes
    /admin/room-types      → AdminRoomTypes
    /admin/languages       → AdminLanguages
    /admin/email-templates → AdminEmailTemplates

  All-role routes (inside ProtectedRoute, outside RoleGuard):
    /notifications → NotificationsPage
    /profile       → ProfilePage

Keep all existing routes unchanged.
```

---

### 5.E2 — Update AppShell Navigation

```
Update `src/layouts/AppShell.jsx` in the frontend to add nav items for all new pages.

Add to sidebar navigation (respecting existing role-based rendering logic):

All roles:
  - Bell icon: "Notifications" → /notifications
  - User icon: "My Profile" → /profile (in user dropdown menu at bottom/top of sidebar)

Manager + Admin roles:
  - Clock icon: "Availability" → /manager/availability
  - Square icon: "Schedule Blocks" → /manager/blocks
  - DoorOpen icon: "Rooms" → /manager/rooms
  - Package icon: "Products" → /manager/products

Admin only (under existing Admin section or submenu):
  - Settings icon: "Roles" → /admin/roles
  - Stethoscope icon: "Clinician Types" → /admin/clinician-types
  - DoorOpen icon: "Room Types" → /admin/room-types
  - Globe icon: "Languages" → /admin/languages
  - Mail icon: "Email Templates" → /admin/email-templates

Do NOT change existing nav items, their order, or any styling.
```

---

## 6. Implementation Order (Recommended)

```
A1 → A2 → A3       (shared infra)
  ↓
B1 → B2 → B3 → B4  (manager features, depends on A1/A2/A3)
  ↓
C1 → C2 → C3 → C4 → C5 → C6 → C7  (admin features)
  ↓
D1 → D2            (global features)
  ↓
E1 → E2            (routing + nav wiring)
```

Each phase B/C/D prompt is independent and can be run in parallel except for dependency on A1/A2/A3.

---

## 7. GraphQL Schema Notes

All mutations follow the existing pattern:
```graphql
mutationName(input: InputType!) {
  success
  userErrors { message }
  entityName { id ... }
}
```

All paginated queries follow:
```graphql
entityNamePaginated(search: SearchInput) {
  data { ... }
  pageInfo { total limit offset hasNextPage hasPreviousPage }
}
```

Refer to `schema.ts` and `schema.prisma` in the root for exact field names.

---

*Generated: 2026-03-15 | Source analysis: frontend-old (17 routes, 28 components) vs frontend (current)*
