---
id: TP021
type: test-plan
feature: manager-products
created: 2026-03-19
updated: 2026-04-02
status: approved
parent: unknown
related: [TR020, TS020]
---

# Manager Products & Inventory (CRUD) — Detailed Test Plan

**Files:**
- `frontend/src/pages/manager/products/index.jsx` (ManagerProducts)
- `frontend/src/pages/manager/products/create.jsx`
- `frontend/src/pages/manager/products/edit.jsx`

**Routes:** `/manager/products`, `/manager/products/new`, `/manager/products/:id/edit`

---

## Feature Overview

Products module with two tabs: **Products** and **Categories**. The Products tab supports full CRUD for products (including variable-type products with inline variations). The Categories tab supports full CRUD for categories and subcategories. All mutations fire against the backend. Deletions require confirm dialog.

---

## Test Cases — Index Page (`/manager/products`)

### TC-MGR-PRD-01 — Page Load: Spinner
**Steps:** Navigate to `/manager/products`.
**Expected:**
- `CircularProgress` spinner shown while `loadData()` is in progress.
- Header + tabs appear after data loads.

---

### TC-MGR-PRD-02 — Default Tab: Products
**Steps:** Navigate to the page.
**Expected:**
- "Products" tab is active (index 0).
- "Add Product" button visible.
- Product cards grid rendered (or empty state).

---

### TC-MGR-PRD-03 — Product Cards: Data Display
**Steps:** Ensure ≥1 product exists.
**Expected:**
- Each card shows: inventory icon, product name, SKU (caption), product type chip, category chip (if assigned), price (if simple type), truncated description.
- Edit + Delete icon buttons on each card.
- Hover → card elevation increases.

---

### TC-MGR-PRD-04 — Product Cards: Price Display Logic
**Steps:** Compare a "simple" and a "variable" product.
**Expected:**
- Simple product: `£X.XX` displayed in `success.main` colour.
- Variable product: no price shown on card.
- Service product: no price shown.

---

### TC-MGR-PRD-05 — Products Tab: Empty State
**Steps:** Ensure no products exist.
**Expected:**
- Large inventory icon + "No products yet" message.

---

### TC-MGR-PRD-06 — "Add Product" Button: Navigates to Create
**Steps:** Click "Add Product".
**Expected:**
- Navigates to `/manager/products/new`.

---

### TC-MGR-PRD-07 — Edit Product: Navigates to Edit Page
**Steps:** Click the edit icon on a product card.
**Expected:**
- Navigates to `/manager/products/:id/edit`.

---

### TC-MGR-PRD-08 — Delete Product: Confirm Dialog
**Steps:** Click the delete icon on a product card.
**Expected:**
- `ConfirmDialog` opens with title "Delete product" and message "Delete this product? This cannot be undone."

---

### TC-MGR-PRD-09 — Delete Product: Confirm
**Steps:** Confirm deletion.
**Expected:**
- `DELETE_PRODUCT` mutation fires with correct ID.
- "Deleted." success message shown.
- Product card removed after `loadData()`.

---

### TC-MGR-PRD-10 — Delete Product: Cancel
**Steps:** Open confirm dialog; click Cancel.
**Expected:**
- Dialog closes; no mutation fires; card remains.

---

### TC-MGR-PRD-11 — Tab Switch: Products → Categories
**Steps:** Click the "Categories" tab.
**Expected:**
- Categories list shown.
- "Add Category" and "Add Subcategory" buttons visible.
- Each category card shows name, optional description, and subcategory chips.

---

---

## Test Cases — Categories Tab

### TC-MGR-PRD-12 — Categories Tab: Empty State
**Steps:** Navigate to Categories tab with no categories.
**Expected:**
- Large category icon + "No categories yet" message.

---

### TC-MGR-PRD-13 — Add Category Form: Toggle
**Steps:** Click "Add Category".
**Expected:**
- Inline form opens with title "New Category".
- Fields: Name (required), Description (optional multiline).
- "Create" and "Cancel" buttons.

---

### TC-MGR-PRD-14 — Create Category: Happy Path
**Steps:** Fill Name = "Diagnostics", Description = "Lab tests"; click "Create".
**Expected:**
- `CREATE_CATEGORY` mutation fires with `{ name, description }`.
- "Category created." success shown.
- New category card appears in list.

---

### TC-MGR-PRD-15 — Create Category: Name Required
**Steps:** Leave Name blank; click "Create".
**Expected:**
- MUI `required` validation on Name field prevents submission.
- No mutation fires.

---

### TC-MGR-PRD-16 — Edit Category: Pre-populates Form
**Steps:** Click the edit icon on a category card.
**Expected:**
- Form opens with "Edit Category" title.
- Name and Description pre-filled from `cat.name` and `cat.description`.
- "Update" button shown.

---

### TC-MGR-PRD-17 — Edit Category: Save
**Steps:** Change name; click "Update".
**Expected:**
- `UPDATE_CATEGORY` mutation fires with the category's ID and new form data.
- "Category updated." success shown.
- Card reflects updated name.

---

### TC-MGR-PRD-18 — Delete Category: Confirm
**Steps:** Click delete icon on a category card; confirm.
**Expected:**
- `DELETE_CATEGORY` mutation fires.
- "Deleted." success; category card removed.

---

### TC-MGR-PRD-19 — Add Subcategory Form: Toggle
**Steps:** Click "Add Subcategory".
**Expected:**
- Inline subcategory form opens with "New Subcategory" title.
- Fields: Parent Category (required select), Name (required), Description.

---

### TC-MGR-PRD-20 — Create Subcategory: Parent Category Required
**Steps:** Leave Parent Category unselected; click "Create".
**Expected:**
- MUI required validation prevents submission.
- No mutation fires.

---

### TC-MGR-PRD-21 — Create Subcategory: Happy Path
**Steps:** Select a parent category; fill Name = "Blood Tests"; click "Create".
**Expected:**
- `CREATE_SUBCATEGORY` mutation fires with `{ category_id, name, description }`.
- "Subcategory created." shown.
- Subcategory chip appears under its parent category card.

---

### TC-MGR-PRD-22 — Edit Subcategory: Via Chip Click
**Steps:** Click on a subcategory chip inside a category card.
**Expected:**
- Subcategory edit form opens pre-filled (`category_id`, `name`, `description`).
- "Update" button shown.

---

### TC-MGR-PRD-23 — Delete Subcategory: Via Chip Delete Icon
**Steps:** Click the delete (x) icon on a subcategory chip.
**Expected:**
- `handleDelete('subcategory', s.id)` called.
- `ConfirmDialog` opens with "Delete subcategory" title.
- On confirm: `DELETE_SUBCATEGORY` fires; chip removed.

---

---

## Test Cases — Create Product (`/manager/products/new`)

### TC-MGR-PRD-24 — Page Load: Initial State
**Steps:** Navigate to `/manager/products/new`.
**Expected:**
- Title "New Product", subtitle "Add a product to the catalogue".
- Fields: Product Name* (required), Description, Price (£ prefix), Stock Qty, SKU.
- Status switch = Active (default).
- Back arrow + Cancel button navigate to `/manager/products`.

---

### TC-MGR-PRD-25 — Validation: Name Required
**Steps:** Leave Name blank; click "Save Product".
**Expected:**
- `errors.name = 'Required'` validation shown.
- No mutation fires.

---

### TC-MGR-PRD-26 — Create: Happy Path (All Fields)
**Steps:** Fill Name = "Glucometer Kit", Price = 35.00, Stock = 50, SKU = "GLC-001".
**Expected:**
- `CREATE_PRODUCT_MUTATION` fires with:
  - `name: "Glucometer Kit"`, `price: 35.0`, `stock_quantity: 50`, `sku: "GLC-001"`, `is_active: true`.
- Snackbar "Product created"; navigates to `/manager/products`.

---

### TC-MGR-PRD-27 — Create: Price Left Blank
**Steps:** Leave Price blank; enter Name.
**Expected:**
- `price` sent as `undefined` (not 0 or null).

---

### TC-MGR-PRD-28 — Create: Stock Qty Left Blank
**Steps:** Leave Stock Qty blank.
**Expected:**
- `stock_quantity` sent as `undefined`.

---

### TC-MGR-PRD-29 — Create: Toggle Status to Inactive
**Steps:** Toggle switch off; save.
**Expected:**
- `is_active: false` in mutation.
- Success and navigation work same as active product.

---

### TC-MGR-PRD-30 — Create: Cancel
**Steps:** Click Cancel.
**Expected:**
- Navigates to `/manager/products`.

---

---

## Test Cases — Edit Product (`/manager/products/:id/edit`)

### TC-MGR-PRD-31 — Loading Skeleton
**Steps:** Navigate before data loads.
**Expected:**
- Two skeleton rectangles shown.

---

### TC-MGR-PRD-32 — Edit: Pre-populates Form from Apollo
**Steps:** Navigate to edit page for a product.
**Expected:**
- Fields pre-filled: name, description, price (string), stock_quantity (string), sku, is_active.
- `fetchPolicy: 'network-only'` ensures latest data.

---

### TC-MGR-PRD-33 — Edit: Save Changes (Happy Path)
**Steps:** Increase price to 45.00; click "Save Changes".
**Expected:**
- `UPDATE_PRODUCT_MUTATION` fires with updated fields.
- `price: parseFloat("45.00")`, `stock_quantity: parseInt(...)` sent correctly.
- Snackbar "Product updated"; navigates to `/manager/products`.

---

### TC-MGR-PRD-34 — Edit: Clear Price (Set to Blank)
**Steps:** Clear the Price field; save.
**Expected:**
- `price` sent as `undefined` (falsy check).
- Mutation succeeds if backend allows null price.

---

### TC-MGR-PRD-35 — Edit: Toggle Status
**Steps:** Toggle switch; save.
**Expected:**
- `is_active` updated accordingly.

---

### TC-MGR-PRD-36 — Edit Mutation Error Handling
**Steps:** Mock mutation to throw error.
**Expected:**
- Snackbar shows error message from `onError`.
- No navigation.

---

### TC-MGR-PRD-37 — Edit: Cancel
**Steps:** Click Cancel.
**Expected:**
- Navigates to `/manager/products`.

---

### TC-MGR-PRD-38 — Edit: Back Arrow
**Steps:** Click back arrow.
**Expected:**
- Navigates to `/manager/products`.

---

## Test Cases — Products Index Inline Form (Variable Products)

### TC-MGR-PRD-39 — Inline Form (Index): Product Type = Variable — Variations Section Appears
**Steps:**
1. Open the inline product form (from "Add Product" button that opens the inline form, not the nav button).
2. Select Product Type = "Variable".
**Expected:**
- "Product Variations" section appears.
- "Add Variation" button shown.
- Price field hidden (variable products don't have a single price).

---

### TC-MGR-PRD-40 — Inline Form: Add Variation Row
**Steps:** Click "Add Variation".
**Expected:**
- New variation row appears with: Name, SKU, Price, Stock inputs.

---

### TC-MGR-PRD-41 — Inline Form: Remove Variation Row
**Steps:** Click "Remove" on a variation row.
**Expected:**
- That row removed from state.
- Other rows unchanged.

---

### TC-MGR-PRD-42 — Inline Form: Variations Only on New Products
**Steps:** Click edit on an existing product in the inline form.
**Expected:**
- Variations section is NOT shown for variable products when editing (`!editProduct` check).

---

### TC-MGR-PRD-43 — Inline Form: Create Variable Product with Variations
**Steps:** Create a variable product with 2 variations.
**Expected:**
- `CREATE_PRODUCT` fires with `{ ...input, variations }`.
- Each variation is sent in the array.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | Product name = whitespace | Sent to backend; backend should reject |
| E2 | Price = negative value | Sent as `parseFloat(-5.0)`; backend should validate |
| E3 | Stock quantity = negative | No frontend validation; backend should reject |
| E4 | Category changed while subcategory is selected | `filteredSubs` updates; previously selected subcategory may no longer be in list |
| E5 | Subcategory dropdown disabled without category | `disabled={!pForm.category_id}` prevents selection error |
| E6 | `loadData` network failure | `setFormError(err.message)` shows red alert |
| E7 | Deleting a category that has products | Backend should reject; userError message shown |
| E8 | Deleting a subcategory from chip while subcategory form is open | Form may retain stale `editSub` reference |
| E9 | Editing two categories simultaneously | Only one form open at a time (toggling via `resetCatForm`) |
| E10 | Product without a category | Category chip not rendered on card; no crash |
| E11 | Invalid product ID on edit URL | Skeleton loops; form never renders (Enhancement: 404 redirect needed) |
| E12 | Very long product description (300+ chars) | Truncated via `-webkit-box` clamp (2 lines) |
| E13 | Duplicate SKU | Backend should return userError; shown as form error alert |
| E14 | Tab switch during delete confirm | Confirm dialog remains open; correct type/id still in `deleteTarget` |

---

## Session 2 Test Cases (SUG implementations)

### TC-MGR-PRD-44 — Create Page: Negative Price Rejected (SUG-PRD-006)
**Steps:** On `/manager/products/new`, enter Price = `-5`, click Save Product.
**Expected:**
- `validate()` catches `parseFloat(price) < 0`.
- Red helperText "Price cannot be negative" shown under Price field.
- No mutation fires.

---

### TC-MGR-PRD-45 — Create Page: Negative Stock Rejected (SUG-PRD-006)
**Steps:** Enter Stock Qty = `-1`, valid Name; click Save Product.
**Expected:**
- Red helperText "Stock cannot be negative" under Stock Qty.
- No mutation fires; form remains open.

---

### TC-MGR-PRD-46 — Subcategory Dropdown Empty State (SUG-PRD-007)
**Steps:** In inline Add Product form, select a category that has no subcategories.
**Expected:**
- Subcategory dropdown opens (enabled because category_id is set).
- Disabled item "No subcategories for this category" shown.
- No selectable values; `subcategory_id` stays empty.

---

### TC-MGR-PRD-47 — ErrorBoundary Renders on Crash (SUG-PRD-009)
**Steps:** Force a JS error inside ManagerProducts (e.g., set products to null).
**Expected:**
- `<ErrorBoundary>` catches the error.
- Fallback UI shown (not a white blank screen).
- No unhandled console error propagates to the root.

---

### TC-MGR-PRD-48 — Category Buttons Have aria-labels (SUG-PRD-010)
**Steps:** Inspect DOM for category card edit/delete buttons.
**Expected:**
- Edit button: `aria-label="Edit category Supplements"` (or matching cat.name).
- Delete button: `aria-label="Delete category Supplements"`.
- Screen reader can distinguish each button.

---

## Total: 48 Test Cases + 14 Edge Cases

