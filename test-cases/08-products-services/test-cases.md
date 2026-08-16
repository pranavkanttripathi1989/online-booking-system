# Products & Services — Test Cases

**Domain covers:** Service/product catalog CRUD (`/manager/services` and `/manager/products` — two separate frontend modules), categories, subcategories, variations, and cancellation rules.
**Grounded in:** `schema.prisma` (`Products`, `ProductCategories`, `ProductSubcategories`, `ProductVariations`, `ProductCancellationRules`, enums `ProductType`/`RuleType`/`FeeType`), `context/frontend-contract-analysis.md §2`, and real QA history: `test-plan/manager/manager-services-test-plan.md`, `test-plan/manager/manager-products-test-plan.md`, `test-result/manager-services-test-results.md`, `test-result/manager-products-test-results.md`, `test-suggestion/manager-services-test-suggestion.md` + `manager-services-suggestion.md`, `test-suggestion/manager-products-test-suggestion.md` + `manager-products-suggestion.md`.

**Open question that MUST be resolved before Phase work on this domain (flagging per CLAUDE.md's precedent for Reviews/Messages — this schema was never confirmed against the frontend either):** the frontend currently ships **two structurally different, apparently-unreconciled models** for what should be one `Products` table:
1. The `/manager/services` **standalone pages** (`create.jsx`/`detail.jsx`/`edit.jsx`) model a "Service" as `{name, description, duration_minutes, price, category: <free text>, is_active}` — notably **`duration_minutes` does not exist anywhere on the `Products` model in `schema.prisma`**, and `category` here is typed as a plain string, not a `category_id` relation.
2. The `/manager/services` **index page's inline dialog** (and the entire `/manager/products` module) instead models it as `{name, description, product_type: simple|variable, sku, price, category_id, subcategory_id, is_active, variations[], cancellation_rules[]}` — this matches `Products`/`ProductVariations`/`ProductCancellationRules` in the schema closely (right down to `RuleType`/`FeeType` enum values matching the "Rule Type: Cancellation/Reschedule" and "Fee Structure: Fixed/Percentage" dialog fields, per `TC-MGR-SVC-40`).

Since a bookable clinical "service" (e.g. "General Consultation, 30 min, £85") clearly needs a duration for the appointment-booking/availability-slot system to work, and `Products` has no such column, **either `duration_minutes` must be added to `Products`, or Services and Products are genuinely two different entities that need two different tables** — this is a real, unresolved product decision, not an implementation detail, and several cases below exist specifically to force that decision before resolvers are written.

---

## 1. Unit Test Cases

### TC-PRDSVC-UNIT-001 — Price is validated and stored in paise, never float rupees
- **Priority:** Critical
- **Steps:** Validate a price input of `₹85.50` for a service/product.
- **Expected Result:** Internally represented as `8550` (paise, `Int`), matching `Products.price: Int?` and `ProductVariations.price: Int` in the schema — never a float. The current frontend mock UI renders `£X.XX` (GBP) throughout both the Services and Products modules (`TC-MGR-SVC-07`, `TC-MGR-PRD-04`); this is a currency-localization gap the backend must not inherit, per CLAUDE.md's India/paise convention.

### TC-PRDSVC-UNIT-002 — `product_type` accepts only schema-valid enum values
- **Priority:** High
- **Steps:** Validate `product_type: "simple"`, `product_type: "variable"`, and `product_type: "service"`.
- **Expected Result:** First two accepted (match `ProductType` enum); third rejected — **this directly surfaces the open architectural question above**: the frontend's Products index (`TC-MGR-PRD-04`) explicitly treats `"service"` as a third distinct product type ("Service product: no price shown"), which has no corresponding schema enum value. This unit test should fail loudly against the current schema until the open question is resolved, by design — it is meant to be the trip-wire, not a bug to quietly patch around.

### TC-PRDSVC-UNIT-003 — SKU uniqueness validator is checked before hitting the database constraint
- **Priority:** Medium
- **Steps:** Validate a new product's SKU against an in-memory set containing an already-used SKU.
- **Expected Result:** Rejected with a clear "SKU already in use" message — pre-empts the raw DB unique-constraint error the frontend currently only surfaces generically (`Edge E13`/`TC-MGR-PRD-` "Duplicate SKU... shown as form error alert").

### TC-PRDSVC-UNIT-004 — Duration validator rejects non-positive values and matches the frontend's guard
- **Priority:** Medium
- **Steps:** Validate `duration_minutes: -5`, `duration_minutes: 0`, `duration_minutes: 30`.
- **Expected Result:** First two rejected, third accepted — regression for `SUG-SVC-004`/`E11` (`inputProps={{ min: 1 }}` on the frontend's Duration field). **Depends on the open schema question above being resolved with an actual `duration_minutes` column.**

### TC-PRDSVC-UNIT-005 — Stock quantity validator rejects negative values
- **Priority:** Medium
- **Steps:** Validate `stock_quantity: -1` and `stock_quantity: 0`.
- **Expected Result:** First rejected, second accepted (zero stock is valid — "out of stock" is a legitimate state) — regression for `GAP-PRD-001`/`SUG-PRD-003`/`E2`/`E3`.

### TC-PRDSVC-UNIT-006 — Subcategory validator enforces that its `category_id` matches its parent
- **Priority:** High
- **Steps:** Validate a product input with `category_id: <CategoryA.id>` and `subcategory_id: <SubcategoryOfCategoryB.id>` (mismatched parent).
- **Expected Result:** Rejected — the subcategory does not belong to the selected category. This closes a real, previously-shipped **data-integrity bug**: `SUG-PRD-002`/`GAP-PRD-002` documents that the frontend's `subcategory_id` state went stale after the category dropdown changed, allowing a mismatched category/subcategory pair to reach the mutation before the fix. The backend must not trust the client to always send a consistent pair.

### TC-PRDSVC-UNIT-007 — Variation rows with no name and no price are excluded from the save payload
- **Priority:** Medium
- **Steps:** Build the mutation payload for a variable product with 3 variation rows, one of which is entirely blank (added via "Add Variation" then never filled in).
- **Expected Result:** Only the 2 populated rows are included — matches the frontend's existing skip-empty-rows behavior (`Edge E9`: "Saving a variable product with empty variation rows... only rows with name+price saved").

### TC-PRDSVC-UNIT-008 — Cancellation rule validator requires both `fee_amount` and `hours_before_appointment`
- **Priority:** Medium
- **Steps:** Validate a cancellation rule input missing `hours_before_appointment`.
- **Expected Result:** Rejected — matches the frontend's existing disabled-Save-button gate (`TC-MGR-SVC-41`: `disabled={!newRule.feeAmount || !newRule.hoursBeforeAppointment}`), now enforced server-side rather than relying on the client never submitting an incomplete rule.

### TC-PRDSVC-UNIT-009 — Fallback price-display formatting never renders `£NaN`/an invalid number for a null price
- **Priority:** Low
- **Steps:** Format a null price and an undefined price for display.
- **Expected Result:** Both render as a defined zero-equivalent (e.g. `0` paise / "—"), never `NaN` — confirms the frontend's existing `parseFloat(product.price || 0).toFixed(2)` guard (`SUG-SVC-007`, which corrected an earlier, incorrect test-plan assumption that this produced `£NaN` — it does not) continues to hold if reimplemented server-side for e.g. invoice line items.

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-PRDSVC-API-001 — `products`/`services` query returns only the calling org's catalogue
- **Priority:** Critical
- **Preconditions:** Org 1 and Org 2 each have their own clinics with their own products (via `Products.clinic_id`, which is nullable — see next case).
- **Steps:** Log in as an Org 1 manager, call the products/catalogue list query.
- **Expected Result:** Only Org 1's products are returned — scoped via `Products.clinic_id → Clinics.client_org_id`.

### TC-PRDSVC-API-002 — A product with `clinic_id: null` (org-wide catalogue item) is still correctly scoped
- **Priority:** High
- **Preconditions:** A product exists with `clinic_id: null` created by an Org 1 manager (schema allows this — `clinic_id` is optional on `Products`).
- **Steps:** Log in as an Org 1 manager and, separately, as an Org 2 manager; both call the products list query.
- **Expected Result:** Org 1 sees the product; Org 2 does not — since `clinic_id` is nullable, the resolver must have a fallback ownership signal (e.g. a denormalized `client_org_id` or an implicit link via the creating user) for org-wide catalogue items, or this design needs to be revisited; a naive `WHERE clinic_id IN (org's clinic ids)` filter would incorrectly exclude every org-wide product from every org's view.

### TC-PRDSVC-API-003 — `createProduct` rejects a duplicate SKU within the same org
- **Priority:** High
- **Preconditions:** A product with `sku: "VIT-D3"` already exists.
- **Steps:** Call `createProduct` with the same SKU.
- **Expected Result:** Rejected with a uniqueness violation — matches `Products.sku @unique` in the schema (note: this is a **global** unique constraint in the current schema, not per-org/per-clinic; confirm this is intentional, since two unrelated orgs both wanting to use SKU "GEN-001" would otherwise collide across tenants — likely a design gap worth raising alongside the duration_minutes question).

### TC-PRDSVC-API-004 — `createProductSubcategory` rejects a `category_id` that doesn't exist or belongs to another org
- **Priority:** High
- **Steps:** Call `createProductSubcategory` with a `category_id` from a different org's `ProductCategories` row.
- **Expected Result:** Rejected — prevents a subcategory being attached to a category outside the caller's tenant.

### TC-PRDSVC-API-005 — Deleting a category that still has products is rejected, not cascaded silently
- **Priority:** Critical
- **Preconditions:** A category has 2 active products assigned.
- **Steps:** Call `deleteProductCategory` for that category.
- **Expected Result:** Rejected with a clear error — matches the frontend's already-anticipated error path (`Edge E7`: "Deleting a category that has products... Backend should reject; userError message shown"), now actually enforced. Products must never be silently orphaned (`category_id` set to null) or deleted as a side effect without an explicit, separate confirmation flow.

### TC-PRDSVC-API-006 — Deleting a subcategory that still has products reassigns or rejects, but never silently orphans
- **Priority:** High
- **Steps:** Call `deleteProductSubcategory` for a subcategory with assigned products.
- **Expected Result:** Either rejected, or the affected products' `subcategory_id` is explicitly set to null as a documented side effect (matching the schema's optional `subcategory_id` on `Products`) — the behavior must be deliberate and tested either way, not left to whatever Prisma's default FK behavior happens to do.

### TC-PRDSVC-API-007 — `toggleProduct`/deactivation never hard-deletes, preserving historical appointment/order references
- **Priority:** High
- **Steps:** Toggle a product to `is_active: false` where it has past appointments referencing it (`Appointments.product_id`), then query those past appointments.
- **Expected Result:** `is_active` flips; past appointments still correctly resolve the product's name/price as they were at booking time (or at minimum, the product record itself, not a null reference) — matches the frontend's own soft-delete precedent, where "delete" on the Services module was deliberately implemented via `TOGGLE_PRODUCT`/`is_active: false` rather than a hard delete, since **no `DELETE_PRODUCT` mutation exists for Services at all** (`BUG-SVC-001`'s fix notes: "Uses existing TOGGLE_PRODUCT mutation... no DELETE_PRODUCT mutation available"). The Products module, by contrast, does call a real `DELETE_PRODUCT` mutation (`TC-MGR-PRD-09`) — confirm with the team which behavior (soft vs. hard delete) is actually intended for the unified backend, since the two frontend modules currently disagree.

### TC-PRDSVC-API-008 — `createProductVariation` enforces per-variation SKU uniqueness
- **Priority:** Medium
- **Steps:** Call `createProductVariation` with a SKU already used by another variation (of any product).
- **Expected Result:** Rejected — matches `ProductVariations.sku @unique`.

### TC-PRDSVC-API-009 — `createCancellationRule` accepts only schema-valid `rule_type`/`fee_type` enum combinations
- **Priority:** Medium
- **Steps:** Call the mutation with `rule_type: "cancellation"`, `fee_type: "percentage"`, then with an invalid `rule_type: "no_show"` (not in the `RuleType` enum).
- **Expected Result:** First accepted, second rejected — matches the `RuleType`(`cancellation`/`reschedule`)/`FeeType`(`fixed`/`percentage`) enums exactly.

### TC-PRDSVC-API-010 — A manager cannot modify another org's product via a direct-ID mutation
- **Priority:** Critical
- **Preconditions:** Product P1 belongs to an Org 2 clinic.
- **Steps:** Log in as an Org 1 manager, call `updateProduct(id: <P1.id>, ...)`.
- **Expected Result:** Rejected with FORBIDDEN/NOT_FOUND; a follow-up read confirms P1 is untouched.

### TC-PRDSVC-API-011 — Patient-facing "available services" query excludes inactive products/services
- **Priority:** High
- **Preconditions:** A clinic has 3 active services and 1 inactive one.
- **Steps:** As an unauthenticated/patient-role caller, query the clinic's bookable services for the booking wizard.
- **Expected Result:** Only the 3 active services are returned — this is genuinely new spec (the reviewed QA history only ever tests the manager-facing catalog management pages, never the patient-facing "what can I book" read path), and is critical since an inactive service must never appear as a bookable option to a patient regardless of how it renders in the manager's own dimmed-but-visible list.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-PRDSVC-E2E-001 — Manager creates a service, and it immediately appears as bookable in the patient booking wizard
- **Priority:** Critical
- **Steps:** As a manager, create a new active service via `/manager/services/new`, then as a patient, start the booking wizard for that clinic.
- **Expected Result:** The new service appears as a selectable option — proves the create mutation and the patient-facing read path share the same underlying data, closing the gap in the "open question" above (this test will force a decision on whether Services live in `Products` or a separate table, since the booking wizard must read from wherever they actually end up).

### TC-PRDSVC-E2E-002 — Deactivating a service removes it from future bookability without breaking past appointments
- **Priority:** Critical
- **Steps:** As a manager, toggle an existing, previously-booked service to inactive; as a patient, attempt to book it; as an admin, view a past appointment that used that service.
- **Expected Result:** The service is no longer selectable for new bookings; the past appointment still correctly displays the service's name and price as booked.

### TC-PRDSVC-E2E-003 — Creating a variable product with variations persists all variation rows correctly
- **Priority:** High
- **Steps:** As a manager, create a variable-type product with 2 variations (differing name/SKU/price/stock), save, then reopen it for editing.
- **Expected Result:** Both variations are present with their exact submitted values — regression for `TC-MGR-PRD-43`, now against real persistence instead of a mocked mutation call.

### TC-PRDSVC-E2E-004 — Changing a product's category updates its subcategory options and persists the correct pair
- **Priority:** High
- **Steps:** As a manager, create a product under Category A / Subcategory A1, save; edit it, change the category to Category B, select Subcategory B1, save; reload and verify.
- **Expected Result:** The saved product shows Category B / Subcategory B1, never a stale A1 reference — end-to-end closure of `SUG-PRD-002`/`GAP-PRD-002`, now verified against actual persistence rather than just client-side state reset.

### TC-PRDSVC-E2E-005 — Deleting a category with existing products is blocked with a clear, actionable error
- **Priority:** High
- **Steps:** As a manager, attempt to delete a category that has 2 products assigned.
- **Expected Result:** An error message explains the category cannot be deleted while products are assigned (e.g. "Reassign or delete these products first"); the category remains in the list.

### TC-PRDSVC-E2E-006 — A cancellation rule created on a product is actually enforced when a patient cancels a booked appointment
- **Priority:** Critical
- **Preconditions:** A service has a cancellation rule: "if cancelled less than 24 hours before, charge a 50% fee."
- **Steps:** As a patient, book that service for tomorrow, then cancel it within the 24-hour window.
- **Expected Result:** A cancellation fee transaction is generated per the rule — this is new spec entirely: the reviewed QA history only tests that the rule can be *created* in the dialog (`TC-MGR-SVC-40`/`41`), never that it's actually *applied* anywhere in the cancellation flow. This is the real acceptance bar the feature exists for.

### TC-PRDSVC-E2E-007 — Duplicate SKU on product creation is rejected with the exact same UX whether triggered from the Services or Products module
- **Priority:** Medium
- **Steps:** Create a product with SKU "DUP-001" from `/manager/products/new`; then attempt to create a service with the same SKU from `/manager/services/new`'s dialog.
- **Expected Result:** Both are rejected consistently — this test specifically checks that Services and Products, if truly backed by the same `Products` table (per the open question), enforce the *same* uniqueness rule rather than two independently-coded, possibly-inconsistent checks.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### Services Catalog (`/manager/services`)

### TC-PRDSVC-FE-001 — Category sidebar product-count badges reflect actual assigned products, including zero
- **Priority:** Low
- **Steps:** View the category sidebar with categories of varying product counts, including one with none.
- **Expected Result:** Each shows a badge with its true count (`cat.products?.length`), and an empty category shows badge `0` rather than being hidden — regression for `TC-MGR-SVC-05`.

### TC-PRDSVC-FE-002 — Index page degrades to mock data with a soft warning banner, never a full-page error, when the backend is offline
- **Priority:** Critical
- **Steps:** With the backend offline, navigate to `/manager/services`.
- **Expected Result:** The sidebar and 6 mock service cards render normally; at most a dismissible warning banner appears — never the old full-page red `<Alert>` that replaced the entire UI. Regression for `BUG-SVC-002` (previously `if (error) return <Alert>` blanked the whole page).

### TC-PRDSVC-FE-003 — Delete (deactivate) button on a service card is wired to a real confirmation flow
- **Priority:** High
- **Steps:** Click the delete icon on a service card, observe the dialog, confirm.
- **Expected Result:** A "Deactivate Service" confirmation dialog opens; confirming calls `TOGGLE_PRODUCT` with `isActive: false` and the card updates to reflect inactive status — regression for `BUG-SVC-001` (previously this icon had no `onClick` at all).

### TC-PRDSVC-FE-004 — Toggling a product's active switch on the card is instant, with no dialog required
- **Priority:** Medium
- **Steps:** Click the active/inactive toggle switch directly on a service card (not the delete icon).
- **Expected Result:** `TOGGLE_PRODUCT` fires immediately with the flipped state and the switch visually updates after refetch, with no confirmation dialog interrupting the flow — regression for `TC-MGR-SVC-12`, distinguishing this instant-toggle path from the delete-icon's confirm-gated path in `TC-PRDSVC-FE-003`.

### TC-PRDSVC-FE-005 — Product Type toggle (Simple → Variable) enables the Variations tab and hides the base price field
- **Priority:** High
- **Steps:** In the Add/Edit Service dialog, switch Product Type from "Simple" to "Variable".
- **Expected Result:** The "Variations" tab becomes enabled and a variations table (Option Name/SKU/Price/Stock columns) becomes available — regression for `TC-MGR-SVC-37`.

### TC-PRDSVC-FE-006 — Cancellation Rules tab is disabled until the product has actually been saved
- **Priority:** Medium
- **Steps:** Open the Add Service dialog for a brand-new, unsaved product; observe the Cancellation Rules tab.
- **Expected Result:** The tab is disabled (`disabled={!editProduct?.id}`); attempting to add a rule before saving instead shows an alert "Must save product first before adding rules." — regression for `TC-MGR-SVC-39`/Edge E10.

### TC-PRDSVC-FE-007 — Add Rule dialog blocks submission until both fee amount and hours-before-appointment are set
- **Priority:** Medium
- **Steps:** Open "Add Rule" on an existing service, fill only the fee amount, leave hours blank.
- **Expected Result:** The "Add Rule" submit button remains disabled — regression for `TC-MGR-SVC-41`.

### TC-PRDSVC-FE-008 — Negative Duration and Price are rejected at the input level on both Create and Edit forms
- **Priority:** Medium
- **Steps:** On `/manager/services/new` and on an existing service's edit page, attempt to enter Duration `-5` and Price `-1`.
- **Expected Result:** Browser-enforced `min` constraints (`min: 1` for duration, `min: 0` for price) block the negative values in both places — regression for `TC-MGR-SVC-43/44/45`.

### TC-PRDSVC-FE-009 — Edit-service page never traps the user in a permanent skeleton with no way back
- **Priority:** High
- **Steps:** With the backend offline, navigate to any service's edit URL.
- **Expected Result:** A header with "Edit Service" text and a working back-arrow button (navigating to `/manager/services`) is visible even during the loading/skeleton state — regression for `BUG-SVC-003`.

### TC-PRDSVC-FE-010 — Service with no assigned clinicians shows an empty state, not a blank panel
- **Priority:** Low
- **Steps:** View the detail page of a service with zero assigned clinicians.
- **Expected Result:** A large icon + "No clinicians assigned" message renders — regression for `TC-MGR-SVC-25`.

### TC-PRDSVC-FE-011 — A null/undefined price never renders as `£NaN`
- **Priority:** Medium
- **Steps:** View a product card whose `price` is `null`.
- **Expected Result:** Renders `£0.00` (via the `|| 0` guard), never `£NaN` — this locks in the *correct* documented behavior after `SUG-SVC-007` explicitly corrected an earlier, incorrect test-plan assumption that this case produced `£NaN`.

### Products & Inventory (`/manager/products`)

### TC-PRDSVC-FE-012 — Product cards hide the price field for variable-type and service-type products
- **Priority:** Medium
- **Steps:** View a simple product, a variable product, and a service-type product side by side in the grid.
- **Expected Result:** Only the simple product shows a price on its card — regression for `TC-MGR-PRD-04`.

### TC-PRDSVC-FE-013 — Deleting a product shows a confirm dialog and only removes the card on confirm
- **Priority:** Medium
- **Steps:** Click delete on a product card, click Cancel; repeat and confirm instead.
- **Expected Result:** Cancel leaves the card in place with no mutation fired; Confirm calls `DELETE_PRODUCT` and removes the card after reload — regression for `TC-MGR-PRD-08/09/10`. **Note:** unlike Services (`TC-PRDSVC-FE-003`, soft toggle-based), this module calls a real delete mutation — this test exists partly to document that the two modules currently diverge in delete semantics (see the API section's open question).

### TC-PRDSVC-FE-014 — Changing a product's category resets a stale subcategory selection
- **Priority:** High
- **Steps:** In the product edit/inline form, select Category A then Subcategory A1, then change the category dropdown to Category B.
- **Expected Result:** The subcategory field resets to empty rather than silently retaining "A1" (which no longer belongs to the selected category) — regression for the real data-integrity bug `GAP-PRD-002`/`SUG-PRD-002`.

### TC-PRDSVC-FE-015 — Subcategory dropdown is disabled until a category is selected, and shows an explicit empty state when the category has none
- **Priority:** Medium
- **Steps:** Open the product form with no category selected, observe the subcategory dropdown; then select a category that has zero subcategories.
- **Expected Result:** First: dropdown is disabled (`disabled={!pForm.category_id}`). Second: dropdown is enabled but shows a disabled "No subcategories for this category" placeholder item rather than appearing blank/broken — regression for `TC-MGR-PRD-46`/`SUG-PRD-007`, Edge E5.

### TC-PRDSVC-FE-016 — Negative Price and Stock Quantity are rejected on both the Create page and the inline index form
- **Priority:** Medium
- **Steps:** Attempt Price `-5` and Stock Qty `-1` on `/manager/products/new`.
- **Expected Result:** Inline red helperText errors ("Price cannot be negative", "Stock cannot be negative") block submission — regression for `TC-MGR-PRD-44/45`/`GAP-PRD-001`.

### TC-PRDSVC-FE-017 — Edit product page resolves mock fallback data for unknown IDs without an infinite skeleton
- **Priority:** High
- **Steps:** With the backend offline, navigate to `/manager/products/prod-999/edit` (unknown ID).
- **Expected Result:** Falls back to `DEFAULT_MOCK_PRODUCT` and renders a usable form — no infinite skeleton loop — regression for `GAP-PRD-003`/Edge E11.

### TC-PRDSVC-FE-018 — Variations section only appears when creating a new variable product, never when editing an existing one
- **Priority:** Medium
- **Steps:** Open the inline form to create a new product and set type to "Variable"; separately, open the inline form to edit an existing variable product.
- **Expected Result:** The Variations section appears in the first case; is absent in the second (`!editProduct` guard) — regression for `TC-MGR-PRD-42`, per the test-plan correction in `SUG-PRD-PLAN-001` (the original plan incorrectly assumed variations were editable inline for existing products).

### TC-PRDSVC-FE-019 — Deleting a category or subcategory always shows its own correctly-scoped confirmation dialog
- **Priority:** Medium
- **Steps:** Delete a category, then delete a subcategory via its chip's delete icon.
- **Expected Result:** Each shows the correctly-titled dialog ("Delete category" vs. "Delete subcategory") referencing the right target — regression for `TC-MGR-PRD-18/23`, and confirms `deleteTarget` state isn't confused between the two entity types (Edge E14: dialog state survives a tab switch mid-confirm without losing its target).

### TC-PRDSVC-FE-020 — A product with no category assigned renders without a category chip, not a crash
- **Priority:** Low
- **Steps:** View a product card whose `category` relation is null.
- **Expected Result:** No category chip is rendered; no exception — regression for Edge E10.

### TC-PRDSVC-FE-021 — Category and subcategory buttons carry descriptive `aria-label`s
- **Priority:** Low
- **Steps:** Inspect the edit/delete icon buttons on category cards.
- **Expected Result:** `aria-label="Edit category {name}"` / `aria-label="Delete category {name}"` — regression for `TC-MGR-PRD-48`/`SUG-PRD-010`.
