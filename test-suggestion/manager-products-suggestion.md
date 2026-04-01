# Manager Products — Test Suggestions (Session 2 Updated)
**Source:** `products/index.jsx`, `create.jsx`, `edit.jsx` | **Updated:** 2026-03-30 Session 2

### SUG-PRD-001 — Mock Product Data Layer (Index)
**Status:** COMPLETED (Session 1)
MOCK_PRODUCTS/MOCK_PROD_CATEGORIES in index.jsx loadData() catch block.

### SUG-PRD-002 — Negative Price/Stock Validation (index.jsx inline form)
**Status:** COMPLETED (Session 1)
`inputProps={{ min: 0, step: 0.01 }}` on Price in index.jsx inline form.

### SUG-PRD-003 — Reset subcategory_id on Category Change
**Status:** COMPLETED (Session 1)
`useEffect` in index.jsx resets `subcategory_id` when `category_id` changes.

### SUG-PRD-004 — Edit Page Skeleton Loop Fix (Offline)
**Status:** COMPLETED (Session 1)
MOCK_PRODUCT_BY_ID fallback + `cache-first` + guard `(fetching && !form)`.

### SUG-PRD-005 — Wire All Pages to Live Backend
**Status:** PENDING | High — Backend integration work; no frontend change needed.

### SUG-PRD-006 — Price/Stock Validation on Create Page (create.jsx)
**Status:** COMPLETED (Session 2)
`validate()` now checks `parseFloat(form.price) < 0` → `e.price = 'Price cannot be negative'` and `parseInt(form.stock_quantity) < 0` → `e.stock_quantity = 'Stock cannot be negative'`. `inputProps={{ min:0 }}` added to both fields. Error shown via `helperText`.

### SUG-PRD-007 — Subcategory Empty State in Dropdown
**Status:** COMPLETED (Session 2)
When `pForm.category_id` is set but `filteredSubs.length === 0`, a disabled `<MenuItem>No subcategories for this category</MenuItem>` is shown, preventing blank dropdown confusion.

### SUG-PRD-008 — 404 Guard on Edit for Unknown Product ID
**Status:** PENDING | Low — DEFAULT_MOCK_PRODUCT fallback exists; info Alert to be added in future session.

### SUG-PRD-009 — ErrorBoundary Wrapper
**Status:** COMPLETED (Session 2)
`ManagerProducts` renamed to non-exported inner component. `export default function ManagerProductsWithBoundary()` wraps it in `<ErrorBoundary>`. Consistent with Availability/Blocks modules.

### SUG-PRD-010 — aria-labels on Category Edit/Delete Buttons
**Status:** COMPLETED (Session 2)
Category card buttons now have `aria-label={\`Edit category ${cat.name}\`}` and `aria-label={\`Delete category ${cat.name}\`}`.

## Summary

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-PRD-001 | Mock product data layer | High | COMPLETED |
| SUG-PRD-002 | Negative price/stock fix (inline) | Medium | COMPLETED |
| SUG-PRD-003 | Reset subcategory on category change | Medium | COMPLETED |
| SUG-PRD-004 | Edit page skeleton offline fix | Medium | COMPLETED |
| SUG-PRD-005 | Wire to live backend | High | PENDING |
| SUG-PRD-006 | Price/stock validation on create page | Medium | COMPLETED |
| SUG-PRD-007 | Subcategory empty state | Low | COMPLETED |
| SUG-PRD-008 | 404 info alert on edit | Low | PENDING |
| SUG-PRD-009 | ErrorBoundary wrapper | Medium | COMPLETED |
| SUG-PRD-010 | aria-labels on category buttons | Low | COMPLETED |
