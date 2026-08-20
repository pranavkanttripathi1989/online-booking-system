---
id: TP023
type: test-plan
feature: manager-services
created: 2026-03-19
updated: 2026-04-02
status: approved
parent: unknown
related: [TR022, TS022]
---

# Manager Services (CRUD) — Detailed Test Plan

**Files:**
- `frontend/src/pages/manager/services/index.jsx` (ServiceCatalog)
- `frontend/src/pages/manager/services/create.jsx`
- `frontend/src/pages/manager/services/detail.jsx`
- `frontend/src/pages/manager/services/edit.jsx`

**Routes:** `/manager/services`, `/manager/services/new`, `/manager/services/:id`, `/manager/services/:id/edit`

---

## Feature Overview

Service catalogue with a sticky left-sidebar category tree (supporting subcategories with expand/collapse), a right-side product grid with search, and an inline Add/Edit dialog. The dialog has three tabs: Basic Info, Variations (variable products only), Cancellation Rules (existing products only). Products can be toggled active/inactive instantly via a switch.

---

## Test Cases — Catalog Index (`/manager/services`)

### TC-MGR-SVC-01 — Page Load: Spinner Then Layout
**Steps:** Navigate to `/manager/services`.
**Expected:**
- Spinner shown while loading.
- After load: left sidebar with Categories, right side with product grid.
- Default selection = "All Services".

---

### TC-MGR-SVC-02 — Category Sidebar: "All Services" Default
**Steps:** View the category list.
**Expected:**
- "All Services" item at top, highlighted with left border in brand colour.
- All products shown in the right grid.

---

### TC-MGR-SVC-03 — Category Sidebar: Select a Category
**Steps:** Click a specific category (e.g., "Cardiology").
**Expected:**
- Selected category highlighted; "All Services" not highlighted.
- Query re-fires with `categoryId` set to selected category's ID.
- Product grid shows only products in that category.
- Title updates to category name.

---

### TC-MGR-SVC-04 — Category Sidebar: Subcategory Expand/Collapse
**Steps:**
1. Click the chevron next to a category with subcategories.
2. Click again.
**Expected:**
- Subcategories appear (Collapse in/out animation).
- Clicking a subcategory filters products to that subcategory's ID.
- Collapse re-hides subcategories.

---

### TC-MGR-SVC-05 — Category Sidebar: Product Count Badges
**Steps:** View the category list.
**Expected:**
- Each category shows a badge with the count of products (`cat.products?.length`).
- Empty categories show badge `0`.

---

### TC-MGR-SVC-06 — Category Sidebar: "Add Category" Button
**Steps:** Click "Add Category".
**Expected:**
- Button renders visually (dashed outline).
- **Note:** No handler implemented; click may do nothing.

---

### TC-MGR-SVC-07 — Product Grid: Card Layout
**Steps:** View products in the grid.
**Expected:**
- Each card shows: product_type chip (simple=blue, variable=purple), active/inactive switch, name, description (2 lines clamped), SKU, price formatted as `£X.00`.
- Hover: card lifts 4px with shadow and brand border.

---

### TC-MGR-SVC-08 — Product Grid: Empty State
**Steps:** Navigate to a category with no products.
**Expected:**
- Dashed-border paper with "No services found in this category." message.

---

### TC-MGR-SVC-09 — Search: Filters by Name
**Steps:** Type "consultation" in the search field.
**Expected:**
- Only products with "consultation" in the name are shown.
- Case-insensitive matching.

---

### TC-MGR-SVC-10 — Search: Filters by SKU
**Steps:** Type a known SKU in the search field.
**Expected:**
- Product with that SKU shown; others hidden.

---

### TC-MGR-SVC-11 — Search: Empty State on No Matches
**Steps:** Type gibberish text.
**Expected:**
- "No services found in this category." empty state shown.

---

### TC-MGR-SVC-12 — Toggle Active Status (Instant)
**Steps:** Click the active switch on a product card.
**Expected:**
- `TOGGLE_PRODUCT` mutation fires immediately with `{ id, isActive: !currentStatus }`.
- After `refetch()`, switch reflects new state.
- No dialog required.

---

### TC-MGR-SVC-13 — Add Service Button: Navigates to Create Page
**Steps:** Click "Add Service".
**Expected:**
- Navigates to `/manager/services/new`.

---

### TC-MGR-SVC-14 — Edit Service Button: Navigates to Edit Page
**Steps:** Click the edit icon on a product card.
**Expected:**
- Navigates to `/manager/services/:id/edit`.

---

### TC-MGR-SVC-15 — Delete Service Button: Renders but No Handler
**Steps:** Click the red delete icon on a product card.
**Expected:**
- **BUG:** No `onClick` handler is wired to the delete icon; nothing happens.
- (Enhancement needed: wire delete mutation with confirm dialog.)

---

---

## Test Cases — Create Service (`/manager/services/new`)

### TC-MGR-SVC-16 — Page Load: Initial State
**Steps:** Navigate to `/manager/services/new`.
**Expected:**
- Title "New Service", subtitle "Add a clinical service to the catalogue".
- Fields: Service Name* (required), Description (multiline), Duration (default 30), Price (£ prefix), Category (text), Status switch (default Active).

---

### TC-MGR-SVC-17 — Validation: Name Required
**Steps:** Leave Name blank; click "Save Service".
**Expected:**
- `errors.name = 'Required'` shown under Name field.
- No mutation fires.

---

### TC-MGR-SVC-18 — Create: Happy Path
**Steps:** Fill Name = "General Consultation", Duration = 45, Price = 85, toggle Active.
**Expected:**
- `CREATE_SERVICE_MUTATION` fires with `{ name, description, duration_minutes: 45, price: 85.0, is_active: true }`.
- On success: snackbar "Service created"; navigates to `/manager/services`.

---

### TC-MGR-SVC-19 — Create: Duration Default Fallback
**Steps:** Clear the Duration field; click "Save Service".
**Expected:**
- `duration_minutes` defaults to `30` (parseInt fallback).
- Mutation fires without error.

---

### TC-MGR-SVC-20 — Create: Price Not Set (Optional)
**Steps:** Leave Price blank.
**Expected:**
- `price` sent as `undefined` (not 0).

---

### TC-MGR-SVC-21 — Create: Toggle Status to Inactive
**Steps:** Toggle switch off; save.
**Expected:**
- `is_active: false` sent in mutation.

---

### TC-MGR-SVC-22 — Cancel: Navigates to Catalog
**Steps:** Click "Cancel".
**Expected:**
- Navigates to `/manager/services`.

---

---

## Test Cases — Detail Page (`/manager/services/:id`)

### TC-MGR-SVC-23 — Loading Skeleton
**Steps:** Navigate before data loads.
**Expected:**
- Two skeleton rectangles shown (header + content).

---

### TC-MGR-SVC-24 — Detail: Data Display (Live)
**Steps:** Navigate to an existing service's detail page.
**Expected:**
- Service name, Active/Inactive chip, description, Duration (with timer icon), Price (in success colour), Category (if set).
- Right panel: "Assigned Clinicians" list with avatar initials and full names.

---

### TC-MGR-SVC-25 — Detail: No Clinicians Assigned
**Steps:** Navigate to a service with no clinicians.
**Expected:**
- Large medical services icon + "No clinicians assigned" message.

---

### TC-MGR-SVC-26 — Detail: Mock Fallback (No Backend Data)
**Steps:** Navigate to a non-existent service ID.
**Expected:**
- Mock fallback renders: "General Consultation", 30 min, £85, active, no clinicians.

---

### TC-MGR-SVC-27 — Detail: Click Edit Button
**Steps:** Click "Edit Service".
**Expected:**
- Navigates to `/manager/services/:id/edit`.

---

### TC-MGR-SVC-28 — Detail: Clinician Click Navigation
**Steps:** Click on a clinician row in the Assigned Clinicians panel.
**Expected:**
- Navigates to `/clinicians/:clinicianId`.

---

---

## Test Cases — Edit Service (`/manager/services/:id/edit`)

### TC-MGR-SVC-29 — Edit: Loading Skeleton
**Steps:** Navigate before data loads.
**Expected:**
- Two skeleton blocks shown.

---

### TC-MGR-SVC-30 — Edit: Pre-populates Form
**Steps:** Navigate to edit page for an existing service.
**Expected:**
- All fields pre-filled: name, description, duration_minutes (as string), price (as string), is_active.
- `fetchPolicy: 'network-only'` ensures fresh data.

---

### TC-MGR-SVC-31 — Edit: Save Changes (Happy Path)
**Steps:** Update the price to 95; click "Save Changes".
**Expected:**
- `UPDATE_SERVICE_MUTATION` fires with `{ name, description, duration_minutes: parseInt, price: 95.0, is_active }`.
- On success: snackbar "Service updated"; navigates to `/manager/services`.

---

### TC-MGR-SVC-32 — Edit: Toggle Status
**Steps:** Toggle status switch.
**Expected:**
- Label updates in real-time.
- Correct `is_active` sent on save.

---

### TC-MGR-SVC-33 — Edit: Cancel
**Steps:** Click "Cancel".
**Expected:**
- Navigates to `/manager/services`.

---

## Test Cases — Service Catalog Dialog (Index-page inline add/edit)

> These tests cover the dialog-based create/edit flow accessible from the index page (separate from the standalone page routes).

### TC-MGR-SVC-34 — Dialog: Opens for New Product
**Steps:** *(Requires the inline dialog trigger — separate from "Add Service" nav button.)*
**Expected:**
- Dialog title "Add New Service".
- Tab 0 (Basic Info) active.
- Tabs "Variations" and "Cancellation Rules" may be available but disabled for new product.

---

### TC-MGR-SVC-35 — Dialog: Basic Info Tab Fields
**Expected:**
- Service Name, Description, Product Type radio (Simple/Variable), Status switch, Category autocomplete, SKU, Base Price.

---

### TC-MGR-SVC-36 — Dialog: Save Disabled When Name Empty
**Steps:** Clear Name field.
**Expected:**
- Save button disabled (`disabled={!editProduct?.name}`).

---

### TC-MGR-SVC-37 — Dialog: Product Type = Variable — Variations Tab Enabled
**Steps:** Select "Variable (Multiple Options)".
**Expected:**
- "Variations" tab becomes enabled.
- Switch to Variations tab: table with columns Option Name, SKU, Price, Stock.

---

### TC-MGR-SVC-38 — Dialog: Add Variation Row
**Steps:** Click "Add Variation Block".
**Expected:**
- New row added to variations table.
- All fields blank and editable.

---

### TC-MGR-SVC-39 — Dialog: Cancellation Rules Tab — Disabled for New Product
**Steps:** Open dialog for new (unsaved) product.
**Expected:**
- "Cancellation Rules" tab is disabled (`disabled={!editProduct?.id}`).

---

### TC-MGR-SVC-40 — Dialog: Cancellation Rules Tab — Add Rule Dialog
**Steps:** Open an existing product's edit dialog; switch to Cancellation Rules tab; click "Add Rule".
**Expected:**
- Inner "Add Penalty Rule" dialog opens.
- Options: Rule Type (Cancellation/Reschedule), Fee Structure (Fixed/Percentage), Fee amount, Hours trigger.

---

### TC-MGR-SVC-41 — Dialog: Save Rule — Requires feeAmount and hoursBeforeAppointment
**Steps:** Open rule dialog; leave fee amount blank.
**Expected:**
- "Add Rule" button disabled (`disabled={!newRule.feeAmount || !newRule.hoursBeforeAppointment}`).

---

### TC-MGR-SVC-42 — Dialog: Cancel Closes Without Saving
**Steps:** Make changes in dialog; click "Cancel".
**Expected:**
- Dialog closes; no mutation fires.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | `user.clinicId` is null/undefined | Defaults to `"1"` (hardcoded fallback); query uses clinicId="1" |
| E2 | Product with price = 0 | Shown as `£0.00`; switch still toggleable |
| E3 | Product with no SKU | "NO-SKU" displayed in monospace |
| E4 | Product with no description | "No description provided." shown in card |
| E5 | Category ID in URL that doesn't exist | no matching category label shown; reverts to "Category" |
| E6 | Very long description (200+ chars) | Clamped to 2 lines via `-webkit-box` |
| E7 | Category list empty (no categories) | Sidebar shows only "All Services"; Category autocomplete empty |
| E8 | Service with null price | **TEST PLAN CORRECTED:** `parseFloat(null \|\| 0).toFixed(2)` = `£0.00` — NOT `£NaN` |
| E9 | Saving a variable product with empty variation rows | Empty rows skipped in mutation loop (only rows with name+price saved) |
| E10 | Rule added before product saved | Shows alert "Must save product first before adding rules." |
| E11 | Duration entered as negative | **FIXED:** `inputProps={{ min: 1 }}` on Duration field in create + edit |
| E12 | Price entered as negative | **FIXED:** `inputProps={{ min: 0, step: 0.01 }}` on Price field in create + edit |

---

## Session 1 Fix Test Cases

### TC-MGR-SVC-43 — Create: Duration Negative Rejected (E11 Fix)
**Steps:** On `/manager/services/new`, enter Duration = `-5`.
**Expected:** Browser enforces `min=1`; value clamped or rejected. mutation input cannot include negative duration.

---

### TC-MGR-SVC-44 — Create: Price Negative Rejected (E12 Fix)
**Steps:** On `/manager/services/new`, enter Price = `-1`.
**Expected:** Browser enforces `min=0`; negative price rejected at input level.

---

### TC-MGR-SVC-45 — Edit: Duration Negative Rejected (E11 Fix)
**Steps:** On edit page (after form loads), set Duration = `-5`.
**Expected:** Browser enforces `min=1`; negative rejected.

---

### TC-MGR-SVC-46 — Edit: Back Button Visible in Skeleton State (BUG-SVC-003)
**Steps:** Navigate to `/manager/services/any-id/edit` with backend offline.
**Expected:**
- Skeleton renders with back-button header: `ArrowBackRoundedIcon` + "Edit Service" text.
- Clicking back arrow navigates to `/manager/services`.
- Two skeletons appear below header.

---

## Total: 46 Test Cases + 12 Edge Cases

